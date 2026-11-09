/* ДЕМО-РЕЖИМ. Поки в shared.js порожній API_BASE, сайт і кабінет працюють на даних у браузері (localStorage):
   рослини, змінені в кабінеті, видно на сайті в цьому ж браузері, а замовлення з сайту з'являються в кабінеті.
   Покупці цих змін не бачать. Коли API підключено, цей файл не використовується. */

// Стартовий каталог (він же — вміст seed.sql для справжньої бази).
// note — підпис на картці; desc — абзаци опису; specs — характеристики; imgs — додаткові фото.
// ⚠ Описи й характеристики — приклад, перевірте їх перед запуском.
const DEMO_PRODUCTS = [
  {id:1, cat:"roses", name:"Троянда плетиста «Воллертон Олд Хол»", note:"Кремово-абрикосова, сильний аромат, до 3 м", price:115, img:"img/rose1.jpg", stock:true,
    desc:["Плетиста англійська троянда з чашоподібними кремово-абрикосовими квітками та сильним ароматом.", "Добре підходить для арок, пергол і стін будинку. Цвіте кілька разів за сезон."],
    specs:[["Тип","плетиста"],["Висота","до 3 м"],["Колір","кремово-абрикосовий"],["Аромат","сильний"],["Цвітіння","повторне, червень–вересень"],["Місце","сонце або легка півтінь"]]},
  {id:2, cat:"roses", name:"Троянда «Джентл Герміона»", note:"Англійська, ніжно-рожева, цвіте до морозів", price:110, old:125, img:"img/rose3.jpg", stock:true,
    desc:["Англійська кущова троянда з ніжно-рожевими чашоподібними квітками.", "Цвіте хвилями від початку літа до морозів, гарна і на клумбі, і в зрізці."],
    specs:[["Тип","англійська кущова"],["Висота","1–1,2 м"],["Колір","ніжно-рожевий"],["Аромат","виражений"],["Цвітіння","хвилями до морозів"],["Місце","сонце"]]},
  {id:3, cat:"roses", name:"Троянда чайно-гібридна «Піано»", note:"Піоновидна, червона, для зрізу", price:120, img:"img/rose2.jpg", stock:true,
    desc:["Чайно-гібридна троянда з густомахровими піоновидними квітками насиченого червоного кольору.", "Квітки довго стоять у вазі, тому сорт часто вирощують для зрізу."],
    specs:[["Тип","чайно-гібридна"],["Висота","0,8–1 м"],["Колір","червоний"],["Форма квітки","піоновидна"],["Цвітіння","повторне"],["Місце","сонце"]]},
  {id:4, cat:"decor", name:"Лаванда вузьколиста «Хідкот»", note:"Морозостійка, для бордюрів і клумб", price:90, img:"img/lavender.jpg", stock:true,
    desc:["Компактна лаванда з темно-фіолетовими суцвіттями та сріблястим листям.", "Добре тримає форму, тому підходить для бордюрів, клумб і доріжок."],
    specs:[["Висота","40–50 см"],["Колір","темно-фіолетовий"],["Цвітіння","червень–серпень"],["Зимівля","морозостійка"],["Місце","сонце, легкий ґрунт"]]},
  {id:5, cat:"decor", name:"Самшит вічнозелений, набір 10 шт", note:"Для живоплоту, висота 15–20 см", price:500, img:"img/boxwood.jpg", stock:true,
    desc:["Вічнозелений кущ із дрібним щільним листям, який легко формувати стрижкою.", "Набору з 10 саджанців вистачає приблизно на 2–3 метри низького живоплоту."],
    specs:[["У наборі","10 саджанців"],["Висота саджанців","15–20 см"],["Ріст","повільний"],["Листя","вічнозелене"],["Місце","сонце або тінь"]]},
  {id:6, cat:"fruit", name:"Яблуня «Чорний Принц»", note:"Темно-бордові плоди, зимовий сорт", price:150, img:"img/apple.jpg", stock:false,
    desc:["Зимовий сорт із незвичними темно-бордовими плодами.", "Яблука добре зберігаються взимку. Для кращого врожаю посадіть поруч ще одну яблуню."],
    specs:[["Термін дозрівання","зимовий"],["Колір плодів","темно-бордовий"],["Запилення","потрібен сорт-запилювач"],["Місце","сонце"]]},
  {id:7, cat:"fruit", name:"Яблуня «Джеромін»", note:"Рання, солодка, дає врожай на 3-й рік", price:145, img:"img/blossom.jpg", stock:false,
    desc:["Яблуня з темно-червоними солодкими плодами.", "Починає плодоносити рано — перший врожай уже на 3-й рік після посадки."],
    specs:[["Смак","солодкий"],["Перший врожай","на 3-й рік"],["Запилення","потрібен сорт-запилювач"],["Місце","сонце"]]},
  {id:8, cat:"berries", name:"Ожина «Потрійна корона»", note:"Без колючок, великі солодкі ягоди", price:140, old:160, img:"img/blackberry.jpg", stock:false,
    desc:["Безколюча ожина з великими солодкими ягодами.", "Пагони довгі, тому їх варто підв'язувати до шпалери."],
    specs:[["Колючки","немає"],["Ягоди","великі, солодкі"],["Пагони","довгі, потрібна шпалера"],["Місце","сонце"]]},
  {id:9, cat:"berries", name:"Малина ремонтантна «Полька»", note:"Плодоносить з липня до морозів", price:85, img:"img/raspberry.jpg", stock:false,
    desc:["Ремонтантна малина, яка дає ягоди з липня до самих морозів.", "Ягоди червоні, щільні, добре переносять перевезення."],
    specs:[["Тип","ремонтантна"],["Плодоношення","липень — морози"],["Ягоди","червоні, щільні"],["Місце","сонце"]]},
  {id:10, cat:"berries", name:"Агрус «Командор»", note:"Майже без шипів, стійкий до хвороб", price:95, img:"img/gooseberry.jpg", stock:false,
    desc:["Агрус майже без шипів — збирати ягоди зручно і не боляче.", "Сорт стійкий до хвороб і невибагливий у догляді."],
    specs:[["Шипи","майже немає"],["Стійкість","до хвороб"],["Висота куща","до 1,2 м"],["Місце","сонце або легка півтінь"]]},
  {id:11, cat:"strawberry", name:"Полуниця «Альбіон», 5 розеток", note:"Ремонтантна, плодоносить усе літо", price:150, img:"img/strawberry.jpg", stock:false,
    desc:["Ремонтантна полуниця з великими щільними солодкими ягодами.", "Плодоносить хвилями все літо. У наборі 5 розеток."],
    specs:[["У наборі","5 розеток"],["Тип","ремонтантна"],["Плодоношення","усе літо"],["Ягоди","великі, щільні"],["Місце","сонце"]]},
  {id:12, cat:"grapes", name:"Виноград «Аркадія»", note:"Столовий, ранній, грона до 1 кг", price:130, img:"img/grapes.jpg", stock:false,
    desc:["Столовий виноград раннього строку достигання.", "Формує великі грона — до 1 кг."],
    specs:[["Тип","столовий"],["Достигання","ранній"],["Грона","до 1 кг"],["Місце","сонце, біля опори"]]},
  {id:13, cat:"nuts", name:"Горіх грецький «Ідеал»", note:"Скороплідний, перші горіхи на 2–3 рік", price:220, img:"img/walnut.jpg", stock:false,
    desc:["Скороплідний сорт грецького горіха.", "Перші горіхи з'являються вже на 2–3 рік після посадки."],
    specs:[["Перший врожай","на 2–3 рік"],["Місце","сонце, простір для крони"]]},
  {id:14, cat:"exotic", name:"Інжир «Брунсвік»", note:"Витримує до −25 °C з укриттям", price:240, img:"img/fig.jpg", stock:false,
    desc:["Один із найвитриваліших сортів інжиру для нашого клімату.", "З укриттям витримує морози до −25 °C."],
    specs:[["Зимівля","до −25 °C з укриттям"],["Місце","сонце, захищене від вітру"]]}
];

const Demo = (() => {
  const K = {products: "sc-demo-products", orders: "sc-demo-orders"};
  const PASSWORD = "demo";
  const err = code => Object.assign(new Error(code), {code});
  const read = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? dflt; } catch (e) { return dflt; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { throw err("storage"); } };
  const seed = () => DEMO_PRODUCTS.map((p, i) => ({
    id: p.id, cat: p.cat, name: p.name, note: p.note || "", price: p.price, old: p.old || null,
    stock: !!p.stock, visible: true, images: [p.img, ...(p.imgs || [])].filter(Boolean),
    desc: p.desc || [], specs: p.specs || [], sort: i + 1
  }));
  const products = () => read(K.products, null) || seed();
  const orders = () => read(K.orders, []);
  const sorted = list => [...list].sort((a, b) => a.sort - b.sort || a.id - b.id);
  const toBody = v => v instanceof Blob
    ? new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(v); })
    : Promise.resolve(v);

  function cleanProduct(o, prev) {
    const name = String(o.name || "").trim(), price = Math.round(Number(o.price));
    if (!name) throw err("name");
    if (!o.cat) throw err("cat");
    if (!Number.isFinite(price) || price < 0) throw err("price");
    const old = o.old ? Math.round(Number(o.old)) : null;
    return {
      ...(prev || {}), name, cat: o.cat, note: String(o.note || "").trim(), price, old: old && old > price ? old : null,
      stock: !!o.stock, visible: o.visible !== false, images: (o.images || []).slice(0, 10),
      desc: (o.desc || []).filter(Boolean), specs: (o.specs || []).filter(x => x[0] && x[1]), updated_at: new Date().toISOString()
    };
  }

  async function api(path, {method = "GET", json, body} = {}) {
    await new Promise(r => setTimeout(r, 120)); // як у мережі: відповідь не миттєва
    let m;
    if (method === "GET" && path === "/products")
      return {ok: true, products: sorted(products()).filter(p => p.visible)};

    if (method === "POST" && path === "/order") {
      const o = json || {};
      const all = products(), list = orders();
      const items = (o.items || []).map(i => {
        const p = all.find(x => x.id == i.id);
        return p && {id: p.id, name: p.name, price: p.price, qty: Math.max(1, Math.round(i.qty) || 1)};
      }).filter(Boolean);
      if (!items.length) throw err("items");
      const id = list.reduce((mx, x) => Math.max(mx, x.id), 0) + 1, now = new Date(), d = o.delivery || {};
      const pad = n => String(n).padStart(2, "0");
      const order = {
        id, num: `СЦ-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(id).padStart(3, "0")}`,
        created_at: now.toISOString(), status: "new", name: o.name || "", phone: o.phone || "", email: o.email || "",
        delivery_type: d.type || "", city: d.city || "", np: d.np || "", note: o.note || "",
        items, total: items.reduce((s, i) => s + i.price * i.qty, 0), admin_note: ""
      };
      write(K.orders, [...list, order]);
      return {ok: true, num: order.num, total: order.total};
    }

    if (method === "POST" && path === "/admin/login") {
      if (!json || json.password !== PASSWORD) throw err("wrong_password");
      return {ok: true, token: "demo"};
    }
    if (method === "GET" && path === "/admin/products") return {ok: true, products: sorted(products())};
    if (method === "POST" && path === "/admin/products") {
      const all = products();
      const p = {...cleanProduct(json), id: all.reduce((mx, x) => Math.max(mx, x.id), 0) + 1, sort: all.reduce((mx, x) => Math.max(mx, x.sort), 0) + 1};
      write(K.products, [...all, p]);
      return {ok: true, product: p};
    }
    if ((m = path.match(/^\/admin\/products\/(\d+)$/))) {
      const all = products(), i = all.findIndex(x => x.id === +m[1]);
      if (i < 0) throw err("not_found");
      if (method === "PUT") { all[i] = cleanProduct(json, all[i]); write(K.products, all); return {ok: true, product: all[i]}; }
      if (method === "DELETE") { all.splice(i, 1); write(K.products, all); return {ok: true}; }
    }
    if (method === "POST" && path === "/admin/images") return {ok: true, src: await toBody(body)};
    if (method === "GET" && path === "/admin/orders") {
      const list = orders().slice().reverse();
      const counts = list.reduce((a, o) => (a[o.status] = (a[o.status] || 0) + 1, a), {});
      return {ok: true, counts, orders: list.map(({items, ...o}) => ({...o, count: items.reduce((s, i) => s + i.qty, 0)}))};
    }
    if ((m = path.match(/^\/admin\/orders\/(\d+)$/))) {
      const list = orders(), o = list.find(x => x.id === +m[1]);
      if (!o) throw err("not_found");
      if (method === "PATCH") {
        if (json.status !== undefined) o.status = json.status;
        if (json.admin_note !== undefined) o.admin_note = json.admin_note;
        write(K.orders, list);
      }
      return {ok: true, order: o};
    }
    throw err("not_found");
  }

  const reset = () => { try { localStorage.removeItem(K.products); localStorage.removeItem(K.orders); } catch (e) {} };
  return {api, reset, PASSWORD};
})();
