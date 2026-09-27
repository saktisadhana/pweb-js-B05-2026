const API_URL = 'https://dummyjson.com/products?limit=0';
const PAGE_SIZE = 9;

let allProducts = [];
let filteredProducts = [];
let visibleCount = PAGE_SIZE;

// ---------- setup elemen tambahan (biar catalog.html/css punya Putu gak diubah) ----------
function setupUI() {
  document.head.insertAdjacentHTML('beforeend', `<style>
    .hidden{display:none!important}
    .catalog-error{margin:16px 5.9722% 0;padding:12px;border-radius:10px;background:#3a1f1f;color:#ffb3b3;font-size:14px}
    .catalog-filters{display:flex;gap:12px;margin-bottom:16px}
    .catalog-filters select{padding:8px 12px;border-radius:10px;background:var(--field);color:var(--text);border:none}
    .load-more{display:block;margin:12px auto 0;padding:10px 24px;border-radius:10px;background:var(--field);color:var(--text);border:none}
    .cart-badge{margin-left:6px;background:var(--gold);color:#141619;border-radius:999px;padding:1px 7px;font-size:12px}
    .product-category{font-size:12px;color:#9a9fa6;text-transform:uppercase}
    .product-rating{color:var(--gold);margin-left:6px}
    .overlay{position:fixed;inset:0;background:#000000a0;display:flex;align-items:center;justify-content:center;z-index:20}
    .overlay-panel{background:var(--panel);color:var(--text);padding:24px;border-radius:10px;max-width:400px;width:90%;position:relative}
    .overlay-close{position:absolute;top:8px;right:12px;background:none;border:none;color:var(--text);font-size:22px;cursor:pointer}
  </style>`);

  document.getElementById('cart-button').insertAdjacentHTML('beforeend', ' <span id="cart-badge" class="cart-badge">0</span>');
  document.querySelector('.catalog-header').insertAdjacentHTML('afterend', `
    <p id="welcome-text" style="margin:16px 5.9722% 0;color:var(--text)"></p>
    <p id="catalog-error" class="catalog-error hidden"></p>
  `);

  const grid = document.querySelector('.product-grid');
  grid.id = 'product-grid';
  grid.insertAdjacentHTML('beforebegin', `
    <div class="catalog-filters">
      <select id="category-filter"><option value="all">Semua Kategori</option></select>
      <select id="sort-filter">
        <option value="default">Urutkan</option>
        <option value="price-asc">Harga Terendah</option>
        <option value="price-desc">Harga Tertinggi</option>
        <option value="rating-desc">Rating Tertinggi</option>
      </select>
    </div>
  `);
  grid.insertAdjacentHTML('afterend', `<button id="load-more" class="load-more hidden">Muat Lebih Banyak</button>`);

  document.body.insertAdjacentHTML('beforeend', `
    <div id="product-modal" class="overlay hidden">
      <div class="overlay-panel">
        <button id="modal-close" class="overlay-close">&times;</button>
        <div id="modal-body"></div>
      </div>
    </div>
  `);
}

// ---------- auth guard ----------
function checkAuth() {
  const firstName = localStorage.getItem('firstName');
  if (!firstName) { window.location.href = 'index.html'; return; }
  document.getElementById('welcome-text').textContent = `Selamat datang, ${firstName}`;
}

// ---------- fetch & render ----------
async function fetchProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '<p>Memuat produk...</p>';
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allProducts = data.products;
    filteredProducts = allProducts;
    populateCategories(allProducts);
    renderProducts();
  } catch (err) {
    console.error(err);
    grid.innerHTML = '';
    const banner = document.getElementById('catalog-error');
    banner.textContent = 'Gagal memuat produk. Periksa koneksi internet lalu muat ulang halaman.';
    banner.classList.remove('hidden');
  }
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';

  if (filteredProducts.length === 0) {
    grid.innerHTML = '<p>Produk tidak ditemukan.</p>';
    document.getElementById('load-more').classList.add('hidden');
    return;
  }

  filteredProducts.slice(0, visibleCount).forEach(p => grid.append(makeCard(p)));
  document.getElementById('load-more').classList.toggle('hidden', visibleCount >= filteredProducts.length);
}

function makeCard(p) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.id = p.id;
  const discount = p.discountPercentage ? `<span class="discount">-${Math.round(p.discountPercentage)}%</span>` : '';
  card.innerHTML = `
    <div class="product-photo">
      <img src="${p.thumbnail}" alt="${p.title}" width="298" height="210">
      ${discount}
    </div>
    <div class="product-info">
      <p class="product-category">${p.category}</p>
      <h2>${p.title}</h2>
      <p class="product-price">$${p.price.toFixed(2)} <span class="product-rating">★ ${p.rating}</span></p>
      <button class="add-to-cart" data-id="${p.id}">Tambah Ke Keranjang</button>
    </div>
  `;
  return card;
}

function populateCategories(products) {
  const select = document.getElementById('category-filter');
  [...new Set(products.map(p => p.category))].sort().forEach(cat => {
    select.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
  });
}

// ---------- search (debounce + closure) ----------
function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ---------- filter & sort ----------
function applyFilters() {
  const keyword = document.getElementById('product-search').value.toLowerCase().trim();
  const category = document.getElementById('category-filter').value;
  const sortBy = document.getElementById('sort-filter').value;

  let result = allProducts.filter(p =>
    (p.title.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword)) &&
    (category === 'all' || p.category === category)
  );

  if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
  if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
  if (sortBy === 'rating-desc') result.sort((a, b) => b.rating - a.rating);

  filteredProducts = result;
  visibleCount = PAGE_SIZE;
  renderProducts();
}

// ---------- cart (localStorage CRUD) ----------
function getCart() { return JSON.parse(localStorage.getItem('cart')) || []; }
function saveCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); }

function addToCart(id) {
  const product = allProducts.find(p => p.id === id);
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) item.qty++;
  else cart.push({ id: product.id, title: product.title, price: product.price, qty: 1 });
  saveCart(cart);
  updateBadge();
}

function updateBadge() {
  document.getElementById('cart-badge').textContent = getCart().reduce((sum, i) => sum + i.qty, 0);
}

function showCart() {
  const cart = getCart();
  if (cart.length === 0) return alert('Keranjang masih kosong.');

  const lines = cart.map(i => `[${i.id}] ${i.title} x${i.qty} = $${(i.qty * i.price).toFixed(2)}`).join('\n');
  const total = cart.reduce((sum, i) => sum + i.qty * i.price, 0);

  const idToRemove = prompt(`${lines}\n\nTotal: $${total.toFixed(2)}\n\nMasukkan ID produk buat hapus dari keranjang (kosongkan buat tutup):`);
  if (idToRemove) {
    saveCart(cart.filter(i => i.id !== Number(idToRemove)));
    updateBadge();
  }
}

// ---------- modal detail produk ----------
function openModal(id) {
  const p = allProducts.find(p => p.id === id);
  document.getElementById('modal-body').innerHTML = `
    <img src="${p.thumbnail}" alt="${p.title}" style="width:100%;height:200px;object-fit:cover;border-radius:10px;margin-bottom:12px">
    <p class="product-category">${p.category}</p>
    <h2>${p.title}</h2>
    <p class="product-price">$${p.price.toFixed(2)} <span class="product-rating">★ ${p.rating}</span></p>
    <p>Brand: ${p.brand || '-'} · Stok: ${p.stock}</p>
    <p>${p.description}</p>
    <button class="add-to-cart" data-id="${p.id}">Tambah Ke Keranjang</button>
  `;
  document.getElementById('product-modal').classList.remove('hidden');
}

// ---------- events ----------
function initEvents() {
  document.getElementById('product-search').addEventListener('input', debounce(applyFilters, 400));
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  document.getElementById('sort-filter').addEventListener('change', applyFilters);
  document.getElementById('load-more').addEventListener('click', () => { visibleCount += PAGE_SIZE; renderProducts(); });
  document.getElementById('cart-button').addEventListener('click', showCart);
  document.querySelector('.exit-button').addEventListener('click', () => localStorage.removeItem('firstName'));

  document.getElementById('product-grid').addEventListener('click', e => {
    const addBtn = e.target.closest('.add-to-cart');
    if (addBtn) { e.stopPropagation(); addToCart(Number(addBtn.dataset.id)); return; }
    const card = e.target.closest('.product-card');
    if (card) openModal(Number(card.dataset.id));
  });

  document.getElementById('modal-body').addEventListener('click', e => {
    const addBtn = e.target.closest('.add-to-cart');
    if (addBtn) addToCart(Number(addBtn.dataset.id));
  });
  document.getElementById('modal-close').addEventListener('click', () => document.getElementById('product-modal').classList.add('hidden'));
  document.getElementById('product-modal').addEventListener('click', e => {
    if (e.target.id === 'product-modal') e.target.classList.add('hidden');
  });
}

// ---------- init ----------
setupUI();
checkAuth();
initEvents();
updateBadge();
fetchProducts();