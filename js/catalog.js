const API_URL = 'https://dummyjson.com/products?limit=0';
const PAGE_SIZE = 9;
const CART_KEY = 'cart';
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const grid = document.getElementById('product-grid');
const cartButton = document.getElementById('cart-button');
const cartDialog = document.getElementById('cart-dialog');
const detailDialog = document.getElementById('product-dialog');
const cartItems = document.getElementById('cart-items');
let allProducts = [];
let filteredProducts = [];
let visibleCount = PAGE_SIZE;
let selectedProductId = null;

function getCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(stored) ? stored.filter(item => Number.isInteger(item.id) && Number.isInteger(item.qty) && item.qty > 0) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function productById(id) {
  return allProducts.find(product => product.id === id);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeCard(product) {
  const card = createElement('article', 'product-card');
  card.dataset.productId = product.id;
  card.tabIndex = 0;
  card.setAttribute('aria-label', `Lihat detail ${product.title}`);
  const photo = createElement('div', 'product-photo');
  const image = createElement('img');
  image.src = product.thumbnail;
  image.alt = product.title;
  image.width = 298;
  image.height = 210;
  photo.append(image);
  const discount = Math.round(product.discountPercentage);
  if (discount > 0) {
    photo.append(createElement('span', 'discount', `-${discount}%`));
  }
  const info = createElement('div', 'product-info');
  const add = createElement('button', 'add-to-cart', 'Tambah Ke Keranjang');
  add.type = 'button';
  add.disabled = product.stock < 1;
  info.append(
    createElement('p', 'product-category', product.category),
    createElement('h2', '', product.title),
    createElement('p', 'product-price', `${money.format(product.price)}  \u2605 ${product.rating}`),
    add
  );
  card.append(photo, info);
  return card;
}

function renderProducts() {
  grid.replaceChildren();
  if (!filteredProducts.length) {
    grid.append(createElement('p', '', 'Produk tidak ditemukan.'));
  } else {
    grid.append(...filteredProducts.slice(0, visibleCount).map(makeCard));
  }
  document.getElementById('load-more').hidden = visibleCount >= filteredProducts.length;
}

function applyFilters() {
  const keyword = document.getElementById('product-search').value.toLowerCase().trim();
  const category = document.getElementById('category-filter').value;
  const sort = document.getElementById('sort-filter').value;
  filteredProducts = allProducts.filter(product =>
    (product.title.toLowerCase().includes(keyword) || product.category.toLowerCase().includes(keyword)) &&
    (category === 'all' || product.category === category)
  );
  if (sort === 'price-asc') filteredProducts.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filteredProducts.sort((a, b) => b.price - a.price);
  if (sort === 'rating-desc') filteredProducts.sort((a, b) => b.rating - a.rating);
  visibleCount = PAGE_SIZE;
  renderProducts();
}

async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    allProducts = data.products;
    const categories = document.getElementById('category-filter');
    for (const category of [...new Set(allProducts.map(product => product.category))].sort()) {
      const option = createElement('option', '', category);
      option.value = category;
      categories.append(option);
    }
    applyFilters();
    const storedCart = getCart();
    const currentCart = storedCart.flatMap(item => {
      const product = productById(item.id);
      if (!product || product.stock < 1) return [];
      return [{ id: product.id, qty: Math.min(item.qty, product.stock), title: product.title,
        price: product.price, thumbnail: product.thumbnail, stock: product.stock }];
    });
    if (JSON.stringify(currentCart) !== JSON.stringify(storedCart)) saveCart(currentCart);
    else renderCart();
  } catch (error) {
    console.error(error);
    grid.replaceChildren();
    const banner = document.getElementById('catalog-error');
    banner.textContent = 'Gagal memuat produk. Periksa koneksi internet lalu muat ulang halaman.';
    banner.hidden = false;
  }
}

function renderCart() {
  cartItems.replaceChildren();
  const cart = getCart();
  let count = 0;
  let total = 0;
  for (const item of cart) {
    const product = productById(item.id) || item;
    const title = product.title || 'Produk';
    const quantity = item.qty;
    count += quantity;
    total += (product.price || 0) * quantity;
    const row = createElement('li', 'cart-item');
    row.dataset.productId = item.id;
    if (product.thumbnail) {
      const image = createElement('img');
      image.src = product.thumbnail;
      image.alt = '';
      image.width = 72;
      image.height = 72;
      row.append(image);
    }
    const info = createElement('div', 'cart-item-info');
    const controls = createElement('div', 'quantity-controls');
    for (const [action, label, text] of [
      ['decrease', `Kurangi ${title}`, '-'],
      ['increase', `Tambah ${title}`, '+'],
      ['remove', `Hapus ${title}`, 'Hapus'],
    ]) {
      const button = createElement('button', '', text);
      button.type = 'button';
      button.dataset.action = action;
      button.setAttribute('aria-label', label);
      button.disabled = action === 'increase' && (!allProducts.length || quantity >= product.stock);
      controls.append(button);
    }
    info.append(
      createElement('strong', '', title),
      createElement('span', '', money.format(product.price || 0)),
      createElement('p', 'cart-amount', `Amount: ${quantity}`),
      controls
    );
    row.append(info);
    cartItems.append(row);
  }
  document.getElementById('cart-count').textContent = count;
  cartButton.setAttribute('aria-label', `Buka keranjang, ${count} produk`);
  document.getElementById('cart-empty').hidden = count > 0;
  document.getElementById('cart-total').textContent = money.format(total);
}

function addToCart(id) {
  const product = productById(id);
  if (!product || product.stock < 1) return false;
  const cart = getCart();
  const item = cart.find(entry => entry.id === id);
  if (item && item.qty >= product.stock) {
    document.getElementById('cart-status').textContent = `Stok ${product.title} sudah maksimal.`;
    return false;
  }
  if (item) {
    item.qty++;
    Object.assign(item, { title: product.title, price: product.price, thumbnail: product.thumbnail, stock: product.stock });
  } else {
    cart.push({ id, qty: 1, title: product.title, price: product.price, thumbnail: product.thumbnail, stock: product.stock });
  }
  saveCart(cart);
  document.getElementById('cart-status').textContent = `${product.title} ditambahkan ke keranjang.`;
  return true;
}

function openDetails(id) {
  const product = productById(id);
  if (!product) return;
  selectedProductId = id;
  document.getElementById('detail-title').textContent = product.title;

  document.getElementById('detail-price').textContent = money.format(product.price);
  document.getElementById('detail-stock').textContent = `Stock: ${product.stock}`;
  document.getElementById('detail-description').textContent = product.description;
  const image = document.getElementById('detail-image');
  image.src = product.thumbnail;
  image.alt = product.title;
  document.getElementById('detail-add').disabled = product.stock < 1;
  detailDialog.showModal();
}

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function setupFilterMenus() {
  if (!('showPopover' in HTMLElement.prototype)) return;

  for (const select of document.querySelectorAll('.catalog-filters select')) {
    const label = document.querySelector(`label[for="${select.id}"]`).textContent;
    const trigger = createElement('button', 'filter-trigger');
    const caption = createElement('span');
    const menu = createElement('div', 'filter-popup');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `${select.id}-menu`);
    trigger.append(caption);
    menu.id = `${select.id}-menu`;
    menu.setAttribute('popover', 'auto');
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', label);
    select.after(trigger);
    document.body.append(menu);
    select.hidden = true;

    const syncCaption = () => {
      caption.textContent = select.selectedOptions[0]?.textContent || label;
      trigger.setAttribute('aria-label', `${label}: ${caption.textContent}`);
    };
    select.addEventListener('change', syncCaption);
    syncCaption();

    const positionMenu = () => {
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 200), innerWidth - 24);
      const below = innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const idealHeight = Math.min(280, menu.scrollHeight + 2);
      const openAbove = below < Math.min(160, idealHeight) && above > below;
      const availableHeight = Math.max(52, Math.min(280, (openAbove ? above : below) - 6));
      const height = Math.max(52, Math.floor((availableHeight - 12) / 40) * 40 + 12);
      menu.style.width = `${width}px`;
      menu.style.maxHeight = `${height}px`;
      menu.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - width - 12))}px`;
      menu.style.top = `${openAbove ? Math.max(8, rect.top - Math.min(height, idealHeight) - 6) : rect.bottom + 6}px`;
    };

    const openMenu = () => {
      menu.replaceChildren(...[...select.options].map(option => {
        const item = createElement('button', 'filter-option', option.textContent);
        item.type = 'button';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(option.value === select.value));
        item.dataset.value = option.value;
        item.tabIndex = -1;
        item.disabled = option.disabled;
        return item;
      }));
      menu.showPopover();
      positionMenu();
      const selected = [...menu.children].find(item => item.dataset.value === select.value);
      (selected || menu.firstElementChild)?.focus({ preventScroll: true });
      selected?.scrollIntoView({ block: 'nearest' });
    };

    trigger.addEventListener('click', () => {
      if (menu.matches(':popover-open')) menu.hidePopover();
      else openMenu();
    });
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!menu.matches(':popover-open')) openMenu();
      }
    });
    menu.addEventListener('click', event => {
      const option = event.target.closest('.filter-option');
      if (!option) return;
      select.value = option.dataset.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      menu.hidePopover();
      trigger.focus({ preventScroll: true });
    });
    menu.addEventListener('keydown', event => {
      const options = [...menu.querySelectorAll('.filter-option:not(:disabled)')];
      const index = options.indexOf(document.activeElement);
      let next = index;
      if (event.key === 'ArrowDown') next = Math.min(index + 1, options.length - 1);
      else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = options.length - 1;
      else if (event.key === 'Escape') {
        event.preventDefault();
        menu.hidePopover();
        trigger.focus({ preventScroll: true });
        return;
      } else if (event.key === 'Tab') {
        menu.hidePopover();
        return;
      } else return;
      event.preventDefault();
      options[next]?.focus({ preventScroll: true });
      options[next]?.scrollIntoView({ block: 'nearest' });
    });
    menu.addEventListener('toggle', event => {
      trigger.setAttribute('aria-expanded', String(event.newState === 'open'));
    });
    window.addEventListener('resize', () => { if (menu.matches(':popover-open')) positionMenu(); });
    window.addEventListener('scroll', () => { if (menu.matches(':popover-open')) menu.hidePopover(); });
    document.querySelector('.product-viewport').addEventListener('scroll', () => {
      if (menu.matches(':popover-open')) menu.hidePopover();
    });
  }
}

grid.addEventListener('click', event => {
  const card = event.target.closest('.product-card');
  if (!card || !grid.contains(card)) return;
  const id = Number(card.dataset.productId);
  if (event.target.closest('.add-to-cart')) addToCart(id);
  else openDetails(id);
});
grid.addEventListener('keydown', event => {
  if (!['Enter', ' '].includes(event.key) || !event.target.matches('.product-card')) return;
  event.preventDefault();
  openDetails(Number(event.target.dataset.productId));
});
cartButton.addEventListener('click', () => { renderCart(); cartDialog.showModal(); });
document.getElementById('detail-add').addEventListener('click', () => {
  if (addToCart(selectedProductId)) {
    detailDialog.close();
    cartDialog.showModal();
  }
});
cartItems.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = Number(button.closest('.cart-item').dataset.productId);
  const cart = getCart();
  const item = cart.find(entry => entry.id === id);
  if (!item) return;
  const action = button.dataset.action;
  if (action === 'remove' || (action === 'decrease' && item.qty === 1)) {
    cart.splice(cart.indexOf(item), 1);
  } else if (action === 'decrease') {
    item.qty--;
  } else if (action === 'increase' && productById(id) && item.qty < productById(id).stock) {
    item.qty++;
  }
  saveCart(cart);
  const next = [...cartItems.querySelectorAll('.cart-item')].find(row => Number(row.dataset.productId) === id);
  const control = next && next.querySelector(`button[data-action="${action}"]:not(:disabled)`);
  (control || cartItems.querySelector('button:not(:disabled)') || cartDialog.querySelector('.dialog-close')).focus();
});
for (const dialog of [detailDialog, cartDialog]) {
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
}
document.getElementById('product-search').addEventListener('input', debounce(applyFilters, 400));
document.getElementById('category-filter').addEventListener('change', applyFilters);
document.getElementById('sort-filter').addEventListener('change', applyFilters);
setupFilterMenus();
document.getElementById('load-more').addEventListener('click', () => { visibleCount += PAGE_SIZE; renderProducts(); });
document.querySelector('.exit-button').addEventListener('click', () => localStorage.removeItem('firstName'));

const firstName = localStorage.getItem('firstName');
if (!firstName) {
  window.location.href = 'index.html';
} else {
  document.getElementById('welcome-text').textContent = `Selamat datang, ${firstName}`;
  renderCart();
  fetchProducts();
}
