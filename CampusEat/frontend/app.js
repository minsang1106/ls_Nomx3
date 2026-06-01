// =============================================
//  CampusEat — 학식 원격 주문 프로토타입
//  Flask API와 MySQL 데이터를 사용
// =============================================

const won = n => n.toLocaleString('ko-KR') + '원';

let CAFETERIAS = [];
let MENUS = {};

// ---- 앱 상태 ----
const state = {
  view: 'cafeteria',
  filter: 'all',
  caf: null,
  cat: '전체',
  cart: [],          // [{menuId, qty, snapshot:{name,price,emoji}}]
  slot: null,
  paymentMethod: 'card',
  orderNumber: null,
};

// ---- API ----
async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API 요청 실패: ${path}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API 요청 실패: ${path}`);
  return data;
}

async function loadCafeterias() {
  try {
    CAFETERIAS = await apiGet('/api/cafeterias');
  } catch (err) {
    console.warn(err);
  }
}

async function loadMenus(cafeteriaId) {
  try {
    MENUS[cafeteriaId] = await apiGet(`/api/cafeterias/${cafeteriaId}/menus`);
  } catch (err) {
    console.warn(err);
  }
}

async function loadSlots(cafeteriaId) {
  try {
    return await apiGet(`/api/cafeterias/${cafeteriaId}/slots`);
  } catch (err) {
    console.warn(err);
    return [];
  }
}

// ---- 유틸 ----
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function setView(name) {
  state.view = name;
  $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === name));
  // stepper
  const order = ['cafeteria', 'menu', 'slot', 'payment', 'done'];
  const idx = order.indexOf(name);
  $$('.step').forEach((el, i) => {
    el.classList.toggle('is-active', i === idx);
    el.classList.toggle('is-done', i < idx);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================
// 1. 식당 그리드
// =============================================
function renderCafeterias() {
  const grid = $('#cafeteriaGrid');
  const items = CAFETERIAS.filter(c => {
    if (state.filter === 'all') return true;
    if (state.filter === 'open') return !c.closed;
    return c.category.includes(state.filter);
  });
  grid.innerHTML = items.map(c => `
    <article class="caf-card" data-id="${c.id}">
      <div class="caf-cover" style="background:${c.cover}">
        <div style="position:absolute;left:16px;bottom:12px;font-size:38px;line-height:1">${c.emoji}</div>
      </div>
      <div class="caf-body">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span class="caf-name">${c.name}</span>
          <span class="open-badge ${c.closed ? 'is-closed' : ''}">${c.closed ? '마감' : '운영중'}</span>
        </div>
        <span class="caf-loc">${c.location} · ${c.tagline}</span>
        <div class="caf-meta">
          <span>🕒 ${c.opening} – ${c.closing}</span>
          <span>📍 도보 3분</span>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.caf-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = +el.dataset.id;
      const caf = CAFETERIAS.find(c => c.id === id);
      if (caf.closed) return alert('현재 마감된 식당이에요.');
      openCafeteria(caf);
    });
  });

  $('#openCafCount').textContent = CAFETERIAS.filter(c => !c.closed).length + '곳';
}

// =============================================
// 2. 메뉴 화면
// =============================================
async function openCafeteria(caf) {
  state.caf = caf;
  state.cart = [];
  await loadMenus(caf.id);
  $('#menuCafName').textContent = caf.name;
  $('#menuCafMeta').textContent = `${caf.location} · 운영시간 ${caf.opening}–${caf.closing}`;
  $('#menuCafBadge').textContent = caf.closed ? '마감' : '운영중';
  $('#menuCafBadge').classList.toggle('is-closed', !!caf.closed);

  // 카테고리 추출
  const menus = MENUS[caf.id] || [];
  const cats = ['전체', ...Array.from(new Set(menus.map(m => m.cat)))];
  state.cat = '전체';
  $('#catTabs').innerHTML = cats.map(c =>
    `<button class="cat-tab ${c === '전체' ? 'is-active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
  $('#catTabs').querySelectorAll('.cat-tab').forEach(t => {
    t.addEventListener('click', () => {
      state.cat = t.dataset.cat;
      $('#catTabs').querySelectorAll('.cat-tab').forEach(x => x.classList.toggle('is-active', x === t));
      renderMenus();
    });
  });

  renderMenus();
  renderCart();
  setView('menu');
}

function renderMenus() {
  const caf = state.caf;
  const menus = (MENUS[caf.id] || []).filter(m => state.cat === '전체' || m.cat === state.cat);
  $('#menuGrid').innerHTML = menus.map(m => `
    <div class="menu-card ${m.sold ? 'is-sold' : ''}" data-id="${m.id}">
      <div class="menu-thumb">${m.emoji}</div>
      <div class="menu-info">
        <div class="menu-name">${m.name}</div>
        <div class="menu-desc">${m.desc}</div>
        <div class="menu-price">${won(m.price)}</div>
        ${m.sold ? '<div class="sold-tag">SOLD OUT</div>' : ''}
      </div>
      <button class="menu-add" aria-label="추가">+</button>
    </div>
  `).join('');

  $('#menuGrid').querySelectorAll('.menu-card').forEach(el => {
    if (el.classList.contains('is-sold')) return;
    el.querySelector('.menu-add').addEventListener('click', () => addToCart(+el.dataset.id));
  });
}

// =============================================
// 장바구니 (ORDER_ITEM 미리보기)
// =============================================
function addToCart(menuId) {
  const m = (MENUS[state.caf.id] || []).find(x => x.id === menuId);
  const existing = state.cart.find(c => c.menuId === menuId);
  if (existing) existing.qty += 1;
  else state.cart.push({ menuId, qty: 1, snapshot: { name: m.name, price: m.price, emoji: m.emoji } });
  renderCart();
}

function changeQty(menuId, delta) {
  const it = state.cart.find(c => c.menuId === menuId);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) state.cart = state.cart.filter(c => c.menuId !== menuId);
  renderCart();
}

function removeItem(menuId) {
  state.cart = state.cart.filter(c => c.menuId !== menuId);
  renderCart();
}

function cartTotal() {
  return state.cart.reduce((s, c) => s + c.snapshot.price * c.qty, 0);
}

function renderCart() {
  const body = $('#cartBody');
  if (state.cart.length === 0) {
    body.innerHTML = '<p class="cart-empty">메뉴를 선택해주세요.</p>';
  } else {
    body.innerHTML = state.cart.map(c => `
      <div class="cart-item">
        <div class="cart-item-name">${c.snapshot.emoji} ${c.snapshot.name}</div>
        <div class="cart-item-price">${won(c.snapshot.price * c.qty)}</div>
        <div class="cart-item-controls">
          <div class="qty">
            <button data-act="dec" data-id="${c.menuId}">−</button>
            <span>${c.qty}</span>
            <button data-act="inc" data-id="${c.menuId}">+</button>
          </div>
          <button class="cart-remove" data-act="rm" data-id="${c.menuId}">삭제</button>
        </div>
      </div>
    `).join('');

    body.querySelectorAll('button[data-act]').forEach(b => {
      b.addEventListener('click', () => {
        const id = +b.dataset.id;
        if (b.dataset.act === 'inc') changeQty(id, +1);
        else if (b.dataset.act === 'dec') changeQty(id, -1);
        else removeItem(id);
      });
    });
  }
  const total = cartTotal();
  $('#cartCount').textContent = state.cart.reduce((s, c) => s + c.qty, 0) + '개';
  $('#cartTotal').textContent = won(total);
  $('#goSlotBtn').disabled = state.cart.length === 0;
}

// =============================================
// 3. 픽업 슬롯
// =============================================
async function renderSlots() {
  const caf = state.caf;
  const slots = await loadSlots(caf.id);
  $('#slotGrid').innerHTML = slots.map(s => {
    const remain = s.max - s.used;
    const ratio = s.used / s.max;
    const barCls = ratio >= 0.9 ? 'is-danger' : ratio >= 0.7 ? 'is-warn' : '';
    const full = remain <= 0;
    return `
      <button class="slot ${full ? 'is-full' : ''}" data-id="${s.id}" data-label="${s.start}–${s.end}" ${full ? 'disabled' : ''}>
        <div class="slot-time">${s.start}–${s.end}</div>
        <div class="slot-avail">${full ? '마감' : `남은 자리 ${remain}/${s.max}`}</div>
        <div class="slot-bar"><div class="${barCls}" style="width:${Math.min(100, ratio*100)}%"></div></div>
      </button>
    `;
  }).join('');

  $('#slotGrid').querySelectorAll('.slot').forEach(el => {
    if (el.classList.contains('is-full')) return;
    el.addEventListener('click', () => {
      $('#slotGrid').querySelectorAll('.slot').forEach(x => x.classList.remove('is-selected'));
      el.classList.add('is-selected');
      state.slot = { id: +el.dataset.id, label: el.dataset.label };
      $('#pickedSlotLabel').textContent = state.slot.label;
      $('#goPaymentBtn').disabled = false;
    });
  });
  state.slot = null;
  $('#pickedSlotLabel').textContent = '미선택';
  $('#goPaymentBtn').disabled = true;
}

// =============================================
// 4. 결제 화면
// =============================================
function renderPayment() {
  const total = cartTotal();
  $('#summaryList').innerHTML = state.cart.map(c => `
    <li>
      <span>${c.snapshot.emoji} ${c.snapshot.name} × ${c.qty}</span>
      <strong>${won(c.snapshot.price * c.qty)}</strong>
    </li>
  `).join('');
  $('#summaryTotal').textContent = won(total);
  $('#paySub').textContent = won(total);
  $('#payFinal').textContent = won(total);
  $('#payCaf').textContent = state.caf.name;
  $('#paySlot').textContent = state.slot.label;
  $('#payOrderNo').textContent = generateOrderPreview();
}

function generateOrderPreview() {
  const prefix = state.caf.name.slice(0, 1);
  const n = Math.floor(1000 + Math.random() * 8999);
  return `${prefix}-${n}`;
}

// =============================================
// 5. 완료
// =============================================
async function completeOrder() {
  $('#overlay').hidden = false;
  try {
    const result = await apiPost('/api/orders', {
      cafeteriaId: state.caf.id,
      slotId: state.slot.id,
      paymentMethod: state.paymentMethod,
      items: state.cart.map(c => ({ menuId: c.menuId, qty: c.qty })),
    });
    $('#overlay').hidden = true;
    state.orderNumber = result.orderNumber;
    $('#doneOrderNo').textContent = state.orderNumber;
    $('#doneCaf').textContent = state.caf.name;
    $('#doneSlot').textContent = state.slot.label;
    $('#donePay').textContent = won(result.totalPrice || cartTotal());
    setView('done');
  } catch (err) {
    $('#overlay').hidden = true;
    alert(`주문 처리에 실패했어요.\n${err.message}`);
  }
}

function resetAll() {
  state.caf = null;
  state.cart = [];
  state.slot = null;
  state.orderNumber = null;
  setView('cafeteria');
}

// =============================================
// 이벤트 바인딩
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadCafeterias();
  renderCafeterias();
  renderCart();

  // 필터
  $$('.chip').forEach(c => {
    c.addEventListener('click', () => {
      $$('.chip').forEach(x => x.classList.toggle('is-active', x === c));
      state.filter = c.dataset.filter;
      renderCafeterias();
    });
  });

  // 뒤로가기
  $$('[data-back]').forEach(b => {
    b.addEventListener('click', () => setView(b.dataset.back));
  });

  // 메뉴 → 픽업
  $('#goSlotBtn').addEventListener('click', async () => {
    await renderSlots();
    setView('slot');
  });

  // 픽업 → 결제
  $('#goPaymentBtn').addEventListener('click', () => {
    renderPayment();
    setView('payment');
  });

  // 결제 수단
  $$('input[name="pm"]').forEach(r =>
    r.addEventListener('change', () => state.paymentMethod = r.value)
  );

  // 결제하기
  $('#payBtn').addEventListener('click', completeOrder);

  // 다시 시작
  $('#restartBtn').addEventListener('click', resetAll);
  $('#brandBtn').addEventListener('click', resetAll);
});
