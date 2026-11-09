/* Спільні налаштування для сайту (index.html) і кабінету (admin.html). */

// Адреса API (Cloudflare Worker), без «/» у кінці, напр. "https://sadovyi-centr-api.<акаунт>.workers.dev".
// ⚠ Поки порожньо — ДЕМО: каталог береться з index.html, замовлення нікуди не надсилаються, кабінет не працює.
const API_BASE = "https://sadovyi-centr-api.sadovyi-centr-api.workers.dev";

// Категорії. img — фото плитки; also — які ще категорії показувати разом із цією.
// "all" і "sale" — службові (усі товари / товари зі старою ціною), рослину в них не додають.
const CATEGORIES = [
  {id: "all", name: "Усі саджанці", img: "img/seedlings.jpg"},
  {id: "roses", name: "Троянди", img: "img/rose1.jpg"},
  {id: "fruit", name: "Плодові", img: "img/apple.jpg"},
  {id: "berries", name: "Ягоди", img: "img/blackberry.jpg", also: ["strawberry"]},
  {id: "strawberry", name: "Полуниця", img: "img/strawberry.jpg"},
  {id: "grapes", name: "Виноград", img: "img/grapes.jpg"},
  {id: "nuts", name: "Горіхи", img: "img/walnut.jpg"},
  {id: "exotic", name: "Екзотичні", img: "img/fig.jpg"},
  {id: "decor", name: "Декоративні", img: "img/lavender.jpg"},
  {id: "sale", name: "Акційні"}
];

// Шлях до фото: "img/…" — файл сайту, "/img/…" — фото, завантажене через кабінет (лежить в API).
const imgUrl = src => /^\/img\//.test(src) ? API_BASE + src : src;
