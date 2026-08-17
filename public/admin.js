const API = '/api/admin';
const PW_KEY = 'studio_admin_pw';

function authHeaders() {
  return { 'X-Admin-Password': localStorage.getItem(PW_KEY) || '' };
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const money = c => '$' + (c / 100).toFixed(2);
const dollarsToCents = v => Math.round(parseFloat(v) * 100);

const loginEl = document.getElementById('login');
const appEl = document.getElementById('app');
const pwInput = document.getElementById('pw');
const loginErr = document.getElementById('login-err');

document.getElementById('login-btn').addEventListener('click', async () => {
  const password = pwInput.value;
  if (!password) return;
  localStorage.setItem(PW_KEY, password);
  loginErr.textContent = '';
  try {
    const res = await fetch('/api/admin/login', { method: 'POST', headers: authHeaders() });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'Login failed');
    }
    showApp();
  } catch (e) {
    loginErr.textContent = e.message;
    localStorage.removeItem(PW_KEY);
  }
});
pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-btn').click(); });

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem(PW_KEY);
  location.reload();
});

function showApp() {
  loginEl.style.display = 'none';
  appEl.style.display = 'block';
  loadArtworks();
}

(async function initialCheck() {
  const stored = localStorage.getItem(PW_KEY);
  if (!stored) return;
  try {
    const res = await fetch('/api/admin/login', { method: 'POST', headers: authHeaders() });
    if (res.ok) showApp();
    else localStorage.removeItem(PW_KEY);
  } catch (e) { }
})();

const tabArtworks = document.getElementById('tab-artworks');
const tabOrders = document.getElementById('tab-orders');
const viewArtworks = document.getElementById('view-artworks');
const viewOrders = document.getElementById('view-orders');

tabArtworks.addEventListener('click', () => {
  tabArtworks.classList.add('active'); tabOrders.classList.remove('active');
  viewArtworks.style.display = 'block'; viewOrders.style.display = 'none';
  loadArtworks();
});
tabOrders.addEventListener('click', () => {
  tabOrders.classList.add('active'); tabArtworks.classList.remove('active');
  viewOrders.style.display = 'block'; viewArtworks.style.display = 'none';
  loadOrders();
});

async function loadArtworks() {
  const list = document.getElementById('artworks-list');
  list.innerHTML = '<p style="color:var(--dim)">Loading…</p>';
  try {
    const artworks = await api('/artworks');
    renderArtworks(artworks);
  } catch (e) {
    list.innerHTML = `<p style="color:var(--danger)">${e.message}</p>`;
  }
}

function renderArtworks(artworks) {
  const list = document.getElementById('artworks-list');
  if (!artworks.length) {
    list.innerHTML = '<p style="color:var(--dim)">No artworks yet — add one above.</p>';
    return;
  }
  list.innerHTML = artworks.map(a => `
    <div class="artwork-card" data-id="${a.id}">
      <div class="artwork-head">
        <div style="display:flex; gap:12px;">
          <div class="thumb" style="background:${a.image_url ? `url('${a.image_url}')` : (a.display_bg || '#222')}"></div>
          <div>
            <h3>${a.title} <span class="badge ${a.original_status}">${a.original_status}</span></h3>
            <div class="meta">${a.type} · ${a.medium || ''} ${a.year ? '· ' + a.year : ''}</div>
          </div>
        </div>
        <div class="artwork-actions">
          <button class="ghost toggle-status-btn">Cycle status</button>
          <button class="ghost toggle-pub-btn">${a.is_published ? 'Unpublish' : 'Publish'}</button>
          <button class="danger delete-artwork-btn">Delete</button>
        </div>
      </div>

      ${a.type !== 'print' ? `
        <div class="field" style="max-width:220px; margin-top:12px;">
          <label>Original price (USD)</label>
          <input class="original-price-input" type="number" step="0.01"
                 value="${a.original_price_cents != null ? (a.original_price_cents/100).toFixed(2) : ''}">
        </div>` : ''}

      ${a.type !== 'original' ? `
        <div class="variants">
          <strong style="font-size:12px; color:var(--dim); text-transform:uppercase; letter-spacing:.05em;">Print sizes</strong>
          <div id="variants-${a.id}">
            ${a.variants.map(v => `
              <div class="variant-row" data-vid="${v.id}">
                <input class="v-label" value="${v.size_label}" placeholder="Size (A4)">
                <input class="v-price" type="number" step="0.01" value="${(v.price_cents/100).toFixed(2)}" placeholder="Price">
                <input class="v-stock" type="number" value="${v.stock ?? ''}" placeholder="Stock (blank=∞)">
                <input class="v-edition" type="number" value="${v.edition_size ?? ''}" placeholder="Edition size">
                <button class="danger ghost remove-variant-btn">✕</button>
              </div>
            `).join('')}
          </div>
          <div class="add-variant">
            <input class="new-v-label" placeholder="Size id, e.g. A4">
            <input class="new-v-price" type="number" step="0.01" placeholder="Price">
            <input class="new-v-stock" type="number" placeholder="Stock">
            <input class="new-v-edition" type="number" placeholder="Edition size">
            <button class="add-variant-btn">Add</button>
          </div>
        </div>` : ''}

      <div class="field" style="margin-top:12px;">
        <label>Image URL (paste a link to an already-hosted photo)</label>
        <input type="url" class="image-url-input" placeholder="https://..." value="${a.image_url || ''}">
      </div>

      <button class="primary save-artwork-btn" style="margin-top:10px;">Save changes</button>
      <div class="msg" data-msg></div>
    </div>
  `).join('');

  list.querySelectorAll('.artwork-card').forEach(card => wireCard(card));
}

function wireCard(card) {
  const id = card.dataset.id;
  const msg = card.querySelector('[data-msg]');
  const setMsg = (text, ok) => { msg.textContent = text; msg.className = 'msg ' + (ok ? 'ok' : 'err'); };

  card.querySelector('.delete-artwork-btn').addEventListener('click', async () => {
    if (!confirm('Delete this artwork permanently? This cannot be undone.')) return;
    try { await api(`/artworks/${id}`, { method: 'DELETE' }); loadArtworks(); }
    catch (e) { setMsg(e.message, false); }
  });

  card.querySelector('.toggle-pub-btn').addEventListener('click', async () => {
    const currentlyPublished = card.querySelector('.toggle-pub-btn').textContent.trim() === 'Unpublish';
    try {
      await api(`/artworks/${id}`, { method: 'PUT', body: JSON.stringify({ isPublished: !currentlyPublished }) });
      loadArtworks();
    } catch (e) { setMsg(e.message, false); }
  });

  card.querySelector('.toggle-status-btn').addEventListener('click', async () => {
    const order = ['available', 'reserved', 'sold'];
    const badge = card.querySelector('.badge');
    const current = order.find(s => badge.classList.contains(s)) || 'available';
    const next = order[(order.indexOf(current) + 1) % order.length];
    try { await api(`/artworks/${id}`, { method: 'PUT', body: JSON.stringify({ originalStatus: next }) }); loadArtworks(); }
    catch (e) { setMsg(e.message, false); }
  });

  card.querySelectorAll('.remove-variant-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.variant-row');
      try { await api(`/variants/${row.dataset.vid}`, { method: 'DELETE' }); loadArtworks(); }
      catch (e) { setMsg(e.message, false); }
    });
  });

  const addVariantBtn = card.querySelector('.add-variant-btn');
  if (addVariantBtn) {
    addVariantBtn.addEventListener('click', async () => {
      const label = card.querySelector('.new-v-label').value.trim();
      const price = card.querySelector('.new-v-price').value;
      const stock = card.querySelector('.new-v-stock').value;
      const edition = card.querySelector('.new-v-edition').value;
      if (!label || !price) return setMsg('Size and price are required.', false);
      try {
        await api(`/artworks/${id}/variants`, {
          method: 'POST',
          body: JSON.stringify({
            sizeId: label.toUpperCase().replace(/\s+/g, ''),
            sizeLabel: label,
            priceCents: dollarsToCents(price),
            stock: stock ? parseInt(stock, 10) : null,
            editionSize: edition ? parseInt(edition, 10) : null
          })
        });
        loadArtworks();
      } catch (e) { setMsg(e.message, false); }
    });
  }

  const imageUrlInput = card.querySelector('.image-url-input');

  card.querySelector('.save-artwork-btn').addEventListener('click', async () => {
    try {
      const body = {};
      const priceInput = card.querySelector('.original-price-input');
      if (priceInput) body.originalPriceCents = priceInput.value ? dollarsToCents(priceInput.value) : null;
      if (imageUrlInput) body.imageUrl = imageUrlInput.value.trim() || null;

      await api(`/artworks/${id}`, { method: 'PUT', body: JSON.stringify(body) });

      const variantRows = card.querySelectorAll('.variant-row');
      for (const row of variantRows) {
        await api(`/variants/${row.dataset.vid}`, {
          method: 'PUT',
          body: JSON.stringify({
            sizeLabel: row.querySelector('.v-label').value,
            priceCents: dollarsToCents(row.querySelector('.v-price').value),
            stock: row.querySelector('.v-stock').value ? parseInt(row.querySelector('.v-stock').value, 10) : null,
            editionSize: row.querySelector('.v-edition').value ? parseInt(row.querySelector('.v-edition').value, 10) : null
          })
        });
      }
      setMsg('Saved.', true);
    } catch (e) { setMsg(e.message, false); }
  });
}

document.getElementById('add-artwork-btn').addEventListener('click', async () => {
  const msg = document.getElementById('add-artwork-msg');
  const id = document.getElementById('new-id').value.trim();
  const title = document.getElementById('new-title').value.trim();
  const type = document.getElementById('new-type').value;
  const medium = document.getElementById('new-medium').value.trim();
  const year = document.getElementById('new-year').value;
  const price = document.getElementById('new-price').value;
  const description = document.getElementById('new-desc').value.trim();

  if (!id || !title) { msg.textContent = 'ID and title are required.'; msg.className = 'msg err'; return; }

  try {
    await api('/artworks', {
      method: 'POST',
      body: JSON.stringify({
        id, title, type, medium: medium || null,
        year: year ? parseInt(year, 10) : null,
        originalPriceCents: price ? dollarsToCents(price) : null,
        description: description || null
      })
    });
    msg.textContent = 'Added.'; msg.className = 'msg ok';
    ['new-id','new-title','new-medium','new-year','new-price','new-desc'].forEach(fid => document.getElementById(fid).value = '');
    loadArtworks();
  } catch (e) { msg.textContent = e.message; msg.className = 'msg err'; }
});

async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="color:var(--dim)">Loading…</td></tr>';
  try {
    const orders = await api('/orders');
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--dim)">No orders yet.</td></tr>';
      return;
    }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.customer_name || ''}<br><span style="color:var(--dim)">${o.customer_email}</span></td>
        <td>${o.items.map(i => `${i.artwork_title}${i.size_id ? ' (' + i.size_id + ')' : ''} x${i.qty}`).join('<br>')}</td>
        <td>${money(o.subtotal_cents)}</td>
        <td>
          <select
