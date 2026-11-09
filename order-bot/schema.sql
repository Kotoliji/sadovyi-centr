-- Схема бази D1. Безпечно запускати повторно.

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cat         TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  note        TEXT    NOT NULL DEFAULT '',
  price       INTEGER NOT NULL,
  old_price   INTEGER,
  stock       INTEGER NOT NULL DEFAULT 1,   -- 1 = є в наявності, 0 = передзамовлення
  visible     INTEGER NOT NULL DEFAULT 1,   -- 0 = прихований з сайту
  images      TEXT    NOT NULL DEFAULT '[]', -- JSON: ["img/rose1.jpg", "/img/<id>", ...]
  descr       TEXT    NOT NULL DEFAULT '[]', -- JSON: абзаци опису
  specs       TEXT    NOT NULL DEFAULT '[]', -- JSON: [["Висота","1 м"], ...]
  sort        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS images (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  data        BLOB NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  num           TEXT,
  created_at    TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'new',
  name          TEXT    NOT NULL,
  phone         TEXT    NOT NULL,
  email         TEXT    NOT NULL DEFAULT '',
  delivery_type TEXT    NOT NULL DEFAULT '',
  city          TEXT    NOT NULL DEFAULT '',
  np            TEXT    NOT NULL DEFAULT '',
  note          TEXT    NOT NULL DEFAULT '',
  items         TEXT    NOT NULL,            -- JSON: [{id,name,price,qty}]
  total         INTEGER NOT NULL,
  admin_note    TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip  TEXT    NOT NULL,
  ts  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_ip ON login_attempts(ip, ts);
