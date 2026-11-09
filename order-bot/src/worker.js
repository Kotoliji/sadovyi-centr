// API «Сімейного садового центру» (Cloudflare Worker + база D1).
//
// Публічне:
//   GET    /products              — каталог для сайту (лише видимі)
//   GET    /img/:id               — фото, завантажене через кабінет
//   POST   /order                 — нове замовлення з сайту
// Кабінет (заголовок Authorization: Bearer <token>):
//   POST   /admin/login           — {password} → {token}
//   GET    /admin/products        — усі рослини, разом із прихованими
//   POST   /admin/products        — додати рослину
//   PUT    /admin/products/:id    — змінити рослину
//   DELETE /admin/products/:id    — видалити рослину
//   POST   /admin/images          — завантажити фото (тіло — сам файл) → {src}
//   GET    /admin/orders          — список замовлень + кількість за статусами
//   GET    /admin/orders/:id      — одне замовлення
//   PATCH  /admin/orders/:id      — {status, admin_note}
//
// Секрети (wrangler secret put): ADMIN_PASSWORD; необов'язково BOT_TOKEN і CHAT_ID для Telegram.
// Змінні (wrangler.toml): ALLOWED_ORIGINS, ADMIN_URL.

const STATUSES = ["new", "confirmed", "shipped", "done", "cancelled"];
const MAX_IMAGE = 1_500_000;
const SESSION_DAYS = 30;
const LOGIN_LIMIT = 10;            // невдалих спроб
const LOGIN_WINDOW = 15 * 60_000;  // за 15 хвилин

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const fail = (status, code) => { throw new HttpError(status, code); };
const list = v => String(v || "").split(",").map(s => s.trim()).filter(Boolean);
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: {"Content-Type": "application/json; charset=utf-8", ...headers}
});

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowed = list(env.ALLOWED_ORIGINS);
    const originOk = allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": originOk ? origin : (allowed[0] || ""),
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, {status: 204, headers: cors});

    let res;
    try {
      res = await route(request, env, ctx, originOk);
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      res = e instanceof HttpError ? json(e.status, {ok: false, error: e.code}) : json(500, {ok: false, error: "server"});
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
};

async function route(request, env, ctx, originOk) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const m = request.method;
  let r;

  if (m === "GET" && path === "/products") return getPublicProducts(env);
  if (m === "GET" && (r = path.match(/^\/img\/([a-f0-9]{32})$/))) return getImage(r[1], request, env, ctx);
  if (m === "POST" && path === "/order") {
    if (!originOk) fail(403, "origin");
    return createOrder(request, env, ctx);
  }
  if (m === "POST" && path === "/admin/login") return login(request, env);

  if (path.startsWith("/admin/")) {
    await requireAdmin(request, env);
    if (m === "GET" && path === "/admin/products") return json(200, {ok: true, products: await allProducts(env)});
    if (m === "POST" && path === "/admin/products") return saveProduct(request, env, null);
    if ((r = path.match(/^\/admin\/products\/(\d+)$/))) {
      if (m === "PUT") return saveProduct(request, env, Number(r[1]));
      if (m === "DELETE") return deleteProduct(env, Number(r[1]));
    }
    if (m === "POST" && path === "/admin/images") return uploadImage(request, env);
    if (m === "GET" && path === "/admin/orders") return listOrders(env, url);
    if ((r = path.match(/^\/admin\/orders\/(\d+)$/))) {
      if (m === "GET") return getOrder(env, Number(r[1]));
      if (m === "PATCH") return updateOrder(request, env, Number(r[1]));
    }
  }
  fail(404, "not_found");
}

/* ---------- helpers ---------- */

async function readJson(request, max = 50_000) {
  const raw = await request.text();
  if (raw.length > max) fail(413, "too_large");
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") throw 0;
    return v;
  } catch { fail(400, "bad_json"); }
}
const line = (v, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const block = (v, max = 1000) => String(v ?? "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
const int = (v, min, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const parse = (s, dflt) => { try { return JSON.parse(s); } catch { return dflt; } };
const ownImageIds = images => images.map(s => (String(s).match(/^\/img\/([a-f0-9]{32})$/) || [])[1]).filter(Boolean);

/* ---------- products ---------- */

const rowToProduct = r => ({
  id: r.id, cat: r.cat, name: r.name, note: r.note, price: r.price, old: r.old_price || null,
  stock: !!r.stock, visible: !!r.visible, images: parse(r.images, []), desc: parse(r.descr, []),
  specs: parse(r.specs, []), sort: r.sort, updated_at: r.updated_at
});

async function allProducts(env) {
  const {results} = await env.DB.prepare("SELECT * FROM products ORDER BY sort, id").all();
  return results.map(rowToProduct);
}

async function getPublicProducts(env) {
  const {results} = await env.DB.prepare("SELECT * FROM products WHERE visible = 1 ORDER BY sort, id").all();
  const products = results.map(rowToProduct).map(({visible, sort, updated_at, ...p}) => p);
  // no-cache: після правок у кабінеті сайт одразу показує нові дані
  return json(200, {ok: true, products}, {"Cache-Control": "no-cache"});
}

function cleanProduct(o) {
  const name = line(o.name, 150);
  const cat = line(o.cat, 30);
  const price = int(o.price, 0, 1_000_000);
  if (!name) fail(400, "name");
  if (!/^[a-z0-9-]+$/.test(cat)) fail(400, "cat");
  if (price === null) fail(400, "price");
  const old = o.old === null || o.old === "" || o.old === undefined ? null : int(o.old, 1, 1_000_000);
  const images = (Array.isArray(o.images) ? o.images : []).map(s => line(s, 300))
    .filter(s => /^\/img\/[a-f0-9]{32}$/.test(s) || /^img\/[\w.-]+$/.test(s)).slice(0, 10);
  const desc = (Array.isArray(o.desc) ? o.desc : []).map(s => block(s, 2000)).filter(Boolean).slice(0, 20);
  const specs = (Array.isArray(o.specs) ? o.specs : [])
    .filter(x => Array.isArray(x)).map(([k, v]) => [line(k, 80), line(v, 200)])
    .filter(([k, v]) => k && v).slice(0, 30);
  return {
    name, cat, price, old: old && old > price ? old : null,
    note: line(o.note, 200), stock: o.stock ? 1 : 0, visible: o.visible === false ? 0 : 1,
    images, desc, specs,
    sort: o.sort === undefined || o.sort === null ? null : int(o.sort, -1_000_000, 1_000_000) // null — не змінювати / в кінець
  };
}

async function saveProduct(request, env, id) {
  const p = cleanProduct(await readJson(request));
  const now = new Date().toISOString();
  const vals = [p.cat, p.name, p.note, p.price, p.old, p.stock, p.visible,
    JSON.stringify(p.images), JSON.stringify(p.desc), JSON.stringify(p.specs), p.sort, now];
  let row;
  if (id === null) {
    // нова рослина без явного порядку стає в кінець каталогу
    row = await env.DB.prepare(`INSERT INTO products (cat, name, note, price, old_price, stock, visible, images, descr, specs, sort, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM products)), ?) RETURNING *`).bind(...vals).first();
  } else {
    const prev = await env.DB.prepare("SELECT images FROM products WHERE id = ?").bind(id).first();
    if (!prev) fail(404, "not_found");
    row = await env.DB.prepare(`UPDATE products SET cat = ?, name = ?, note = ?, price = ?, old_price = ?, stock = ?, visible = ?,
      images = ?, descr = ?, specs = ?, sort = COALESCE(?, sort), updated_at = ? WHERE id = ? RETURNING *`).bind(...vals, id).first();
    const removed = ownImageIds(parse(prev.images, [])).filter(x => !ownImageIds(p.images).includes(x));
    await deleteImages(env, removed);
  }
  return json(200, {ok: true, product: rowToProduct(row)});
}

async function deleteProduct(env, id) {
  const prev = await env.DB.prepare("DELETE FROM products WHERE id = ? RETURNING images").bind(id).first();
  if (!prev) fail(404, "not_found");
  await deleteImages(env, ownImageIds(parse(prev.images, [])));
  return json(200, {ok: true});
}

/* ---------- images ---------- */

async function deleteImages(env, ids) {
  if (!ids.length) return;
  await env.DB.prepare(`DELETE FROM images WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).run();
}

async function uploadImage(request, env) {
  const type = (request.headers.get("Content-Type") || "").split(";")[0].trim();
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) fail(415, "type");
  const data = await request.arrayBuffer();
  if (!data.byteLength) fail(400, "empty");
  if (data.byteLength > MAX_IMAGE) fail(413, "too_large");
  const id = crypto.randomUUID().replace(/-/g, "");
  await env.DB.prepare("INSERT INTO images (id, type, data, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, type, data, new Date().toISOString()).run();
  return json(200, {ok: true, src: "/img/" + id});
}

async function getImage(id, request, env, ctx) {
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const row = await env.DB.prepare("SELECT type, data FROM images WHERE id = ?").bind(id).first();
  if (!row) fail(404, "not_found");
  const bytes = row.data instanceof ArrayBuffer ? row.data : new Uint8Array(row.data);
  const res = new Response(bytes, {headers: {
    "Content-Type": row.type,
    "Cache-Control": "public, max-age=31536000, immutable"
  }});
  ctx.waitUntil(cache.put(request, res.clone()));
  return res;
}

/* ---------- orders ---------- */

async function createOrder(request, env, ctx) {
  const o = await readJson(request, 20_000);
  if (o.website) return json(200, {ok: true, num: ""}); // пастка для ботів

  const name = line(o.name, 100), phone = line(o.phone, 30);
  if (!name || phone.replace(/\D/g, "").length < 10) fail(400, "contact");

  // ціни й назви беремо з бази, а не з браузера
  const wanted = new Map();
  for (const i of (Array.isArray(o.items) ? o.items : []).slice(0, 50)) {
    const id = int(i && i.id, 1, 1e9), qty = int(i && i.qty, 1, 999);
    if (id && qty) wanted.set(id, (wanted.get(id) || 0) + qty);
  }
  if (!wanted.size) fail(400, "items");
  const ids = [...wanted.keys()];
  const {results} = await env.DB.prepare(`SELECT id, name, price, images FROM products WHERE id IN (${ids.map(() => "?").join(",")})`)
    .bind(...ids).all();
  // img — головне фото на момент замовлення, щоб у кабінеті було видно, що саме замовили
  const items = results.map(p => ({id: p.id, name: p.name, price: p.price, qty: wanted.get(p.id), img: parse(p.images, [])[0] || ""}));
  if (!items.length) fail(400, "items");
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const d = o.delivery || {};
  const now = new Date();
  const row = await env.DB.prepare(`INSERT INTO orders (created_at, name, phone, email, delivery_type, city, np, note, items, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`).bind(
    now.toISOString(), name, phone, line(o.email, 120), line(d.type, 40), line(d.city, 100), line(d.np, 150),
    block(o.note), JSON.stringify(items), total).first();
  const kyiv = new Intl.DateTimeFormat("uk-UA", {timeZone: "Europe/Kyiv", year: "2-digit", month: "2-digit", day: "2-digit"})
    .formatToParts(now).reduce((a, p) => (a[p.type] = p.value, a), {});
  const num = `СЦ-${kyiv.year}${kyiv.month}${kyiv.day}-${String(row.id).padStart(3, "0")}`;
  await env.DB.prepare("UPDATE orders SET num = ? WHERE id = ?").bind(num, row.id).run();

  const order = {id: row.id, num, name, phone, email: line(o.email, 120),
    delivery: {type: line(d.type, 40), city: line(d.city, 100), np: line(d.np, 150)}, note: block(o.note), items, total};
  if (env.BOT_TOKEN && env.CHAT_ID) ctx.waitUntil(notifyTelegram(env, order));
  return json(200, {ok: true, num, total});
}

async function listOrders(env, url) {
  const status = url.searchParams.get("status");
  const where = STATUSES.includes(status) ? "WHERE status = ?" : "";
  const stmt = env.DB.prepare(`SELECT id, num, created_at, status, name, phone, city, items, total FROM orders ${where} ORDER BY id DESC LIMIT 500`);
  const [{results}, counts] = await Promise.all([
    (where ? stmt.bind(status) : stmt).all(),
    env.DB.prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status").all()
  ]);
  const orders = results.map(({items, ...r}) => ({...r, count: parse(items, []).reduce((s, i) => s + i.qty, 0)}));
  return json(200, {ok: true, orders, counts: Object.fromEntries(counts.results.map(c => [c.status, c.n]))});
}

async function getOrder(env, id) {
  const r = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  if (!r) fail(404, "not_found");
  return json(200, {ok: true, order: {...r, items: parse(r.items, [])}});
}

async function updateOrder(request, env, id) {
  const o = await readJson(request);
  const sets = [], vals = [];
  if (o.status !== undefined) {
    if (!STATUSES.includes(o.status)) fail(400, "status");
    sets.push("status = ?"); vals.push(o.status);
  }
  if (o.admin_note !== undefined) { sets.push("admin_note = ?"); vals.push(block(o.admin_note, 2000)); }
  if (!sets.length) fail(400, "nothing");
  const r = await env.DB.prepare(`UPDATE orders SET ${sets.join(", ")} WHERE id = ? RETURNING *`).bind(...vals, id).first();
  if (!r) fail(404, "not_found");
  return json(200, {ok: true, order: {...r, items: parse(r.items, [])}});
}

/* ---------- Telegram (необов'язково) ---------- */

const h = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const uah = n => n.toLocaleString("uk-UA") + " грн";

export function formatOrder(o, adminUrl) {
  const d = o.delivery;
  return [
    `🌱 <b>Нове замовлення ${h(o.num)}</b>`,
    "",
    `👤 ${h(o.name)}`,
    `📞 ${h(o.phone)}`,
    o.email ? `✉️ ${h(o.email)}` : null,
    `🚚 ${h([d.type, d.city, d.np].filter(Boolean).join(", "))}`,
    o.note ? `📝 ${h(o.note)}` : null,
    "",
    "<b>Товари:</b>",
    ...o.items.map(i => `• ${h(i.name)} — ${i.qty} шт × ${uah(i.price)} = ${uah(i.qty * i.price)}`),
    "",
    `<b>Разом: ${uah(o.total)}</b>`,
    adminUrl ? `\n<a href="${h(adminUrl)}#order-${o.id}">Відкрити в кабінеті</a>` : null
  ].filter(x => x !== null).join("\n");
}

async function notifyTelegram(env, order) {
  const text = formatOrder(order, env.ADMIN_URL);
  await Promise.all(list(env.CHAT_ID).map(chat_id =>
    fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({chat_id, text, parse_mode: "HTML", disable_web_page_preview: true})
    }).catch(e => console.error("telegram", e))
  ));
}

/* ---------- вхід у кабінет ---------- */

const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sessionKey(env) {
  if (!env.ADMIN_PASSWORD) fail(500, "not_configured");
  // ключ залежить від пароля: після зміни пароля всі старі входи стають недійсними
  const raw = await crypto.subtle.digest("SHA-256", enc.encode("sc-admin-session|" + env.ADMIN_PASSWORD));
  return crypto.subtle.importKey("raw", raw, {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
}
const sign = async (key, data) => b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));

async function sameSecret(a, b) {
  const [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest("SHA-256", enc.encode(String(s)))));
  const ua = new Uint8Array(x), ub = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

async function login(request, env) {
  const key = await sessionKey(env);
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const now = Date.now();
  await env.DB.prepare("DELETE FROM login_attempts WHERE ts < ?").bind(now - LOGIN_WINDOW).run();
  const {n} = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?").bind(ip).first();
  if (n >= LOGIN_LIMIT) fail(429, "too_many_attempts");

  const {password} = await readJson(request, 2000);
  if (!(await sameSecret(password || "", env.ADMIN_PASSWORD))) {
    await env.DB.prepare("INSERT INTO login_attempts (ip, ts) VALUES (?, ?)").bind(ip, now).run();
    fail(401, "wrong_password");
  }
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
  const payload = b64url(enc.encode(JSON.stringify({exp: now + SESSION_DAYS * 86400_000})));
  return json(200, {ok: true, token: payload + "." + await sign(key, payload)});
}

async function requireAdmin(request, env) {
  const key = await sessionKey(env);
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !(await sameSecret(sig, await sign(key, payload)))) fail(401, "unauthorized");
  let data;
  try { data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))); } catch { fail(401, "unauthorized"); }
  if (!data || !(data.exp > Date.now())) fail(401, "expired");
}
