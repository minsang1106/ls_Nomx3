// =============================================
//  CampusEat — 학식 원격 주문 프로토타입
//  단순한 in-memory 데이터로 흐름을 시연
// =============================================

const won = n => n.toLocaleString('ko-KR') + '원';

// ---- Mock 데이터: CAFETERIA / MENU / PICKUP_SLOT ----
const CAFETERIAS = [
  {
    id: 1, name: '학생회관 1층 한식당', location: '학생회관 1F',
    opening: '11:00', closing: '14:00',
    category: ['korean', 'open'], cover: '#FFD3BF',
    emoji: '🍚', tagline: '오늘의 백반 · 김치찌개',
  },
  {
    id: 2, name: '제2학생식당 면류코너', location: '제2학생회관 B1',
    opening: '11:30', closing: '14:30',
    category: ['korean', 'open'], cover: '#FFE2C2',
    emoji: '🍜', tagline: '잔치국수 · 비빔국수',
  },
  {
    id: 3, name: '카페테리아 스낵바', location: '도서관 1F',
    opening: '10:00', closing: '20:00',
    category: ['snack', 'open'], cover: '#FFF1D6',
    emoji: '🥪', tagline: '샌드위치 · 베이커리',
  },
  {
    id: 4, name: '교직원식당 양식코너', location: '본관 4F',
    opening: '11:30', closing: '13:30',
    category: ['open'], cover: '#E6E1FF',
    emoji: '🍝', tagline: '파스타 · 리조또',
  },
  {
    id: 5, name: '기숙사식당', location: '제1생활관 1F',
    opening: '18:00', closing: '20:00',
    category: ['korean'], cover: '#E8E4DA',
    emoji: '🍱', tagline: '저녁식사 전용 · 현재 마감',
    closed: true,
  },
];

const MENUS = {
  1: [
    { id: 101, name: '제육볶음 정식', cat: '정식', price: 6500, desc: '매콤한 제육과 잡곡밥, 미역국', emoji: '🍱' },
    { id: 102, name: '김치찌개 정식', cat: '정식', price: 5500, desc: '얼큰한 김치찌개 한 그릇', emoji: '🍲' },
    { id: 103, name: '돈까스 정식', cat: '정식', price: 7000, desc: '바삭한 등심돈까스', emoji: '🍛' },
    { id: 104, name: '비빔밥', cat: '단품', price: 5000, desc: '계란 후라이 · 고추장', emoji: '🥗' },
    { id: 105, name: '공깃밥 추가', cat: '사이드', price: 1000, desc: '잡곡밥', emoji: '🍚' },
    { id: 106, name: '계란후라이', cat: '사이드', price: 800, desc: '반숙/완숙', emoji: '🍳', sold: true },
  ],
  2: [
    { id: 201, name: '잔치국수', cat: '국수', price: 4000, desc: '멸치육수 베이스', emoji: '🍜' },
    { id: 202, name: '비빔국수', cat: '국수', price: 4500, desc: '매콤달콤 비빔', emoji: '🍝' },
    { id: 203, name: '우동', cat: '국수', price: 4500, desc: '가츠오부시 베이스', emoji: '🍲' },
    { id: 204, name: '김밥', cat: '사이드', price: 3000, desc: '야채김밥 · 참치김밥', emoji: '🍙' },
  ],
  3: [
    { id: 301, name: '클럽 샌드위치', cat: '샌드위치', price: 4800, desc: '햄 · 치즈 · 토마토', emoji: '🥪' },
    { id: 302, name: 'BLT 샌드위치', cat: '샌드위치', price: 5200, desc: '베이컨 · 양상추 · 토마토', emoji: '🥖' },
    { id: 303, name: '아메리카노', cat: '음료', price: 2500, desc: 'HOT / ICE', emoji: '☕' },
    { id: 304, name: '초코칩 쿠키', cat: '베이커리', price: 2000, desc: '갓 구운 쿠키', emoji: '🍪' },
  ],
  4: [
    { id: 401, name: '크림 파스타', cat: '파스타', price: 8500, desc: '베이컨 크림', emoji: '🍝' },
    { id: 402, name: '토마토 파스타', cat: '파스타', price: 8000, desc: '바질토마토', emoji: '🍝' },
    { id: 403, name: '버섯 리조또', cat: '리조또', price: 8800, desc: '양송이 · 표고', emoji: '🍚' },
  ],
  5: [],
};

// ---- 픽업 슬롯 (식당별로 동일 패턴 — 시연용) ----
function makeSlots(caf) {
  const slots = [];
  const [oh, om] = caf.opening.split(':').map(Number);
  const [ch, cm] = caf.closing.split(':').map(Number);
  let t = oh * 60 + om;
  const end = ch * 60 + cm;
  let i = 0;
  while (t < end) {
    const next = t + 20;
    const start = `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
    const e = `${String(Math.floor(next/60)).padStart(2,'0')}:${String(next%60).padStart(2,'0')}`;
    const max = 25;
    const used = [22, 14, 25, 6, 10, 19, 24, 3, 12, 8][i % 10];
    slots.push({ id: caf.id * 100 + i, start, end: e, max, used });
    t = next; i++;
  }
  return slots;
}

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
function openCafeteria(caf) {
  state.caf = caf;
  state.cart = [];
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
function renderSlots() {
  const caf = state.caf;
  const slots = makeSlots(caf);
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
function completeOrder() {
  $('#overlay').hidden = false;
  setTimeout(() => {
    $('#overlay').hidden = true;
    state.orderNumber = $('#payOrderNo').textContent;
    $('#doneOrderNo').textContent = state.orderNumber;
    $('#doneCaf').textContent = state.caf.name;
    $('#doneSlot').textContent = state.slot.label;
    $('#donePay').textContent = won(cartTotal());
    setView('done');
  }, 1200);
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
document.addEventListener('DOMContentLoaded', () => {
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
  $('#goSlotBtn').addEventListener('click', () => {
    renderSlots();
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
