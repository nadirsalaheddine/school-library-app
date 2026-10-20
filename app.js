const KEY = { f: 'lib_favs', h: 'lib_hist' };
const ld = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const sv = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const SEASONS = { autumn: 'مجموعة الخريف', winter: 'مجموعة الشتاء', spring: 'مجموعة الربيع' };
const DEMO = [
  { id: 'd1', title: 'ثلاثية غرناطة', author: 'رضوى عاشور', language: 'العربية', category: 'روايات', season: 'autumn', status: 'available', is_pinned: true },
  { id: 'd2', title: 'مقدمة ابن خلدون', author: 'ابن خلدون', language: 'العربية', category: 'تاريخ', season: 'winter', status: 'borrowed' },
  { id: 'd3', title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry', language: 'Français', category: 'روايات', season: 'spring', status: 'coming_soon' }
];
let books = [], favs = ld(KEY.f), hist = ld(KEY.h), flt = 'all', q = '';

const cover = b => `<div class="cv">${ic('book', 36)}${b.cover_url ? `<img src="${esc(b.cover_url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
const badge = b => `<span class="bd ${b.status}">${ST[b.status]}</span>`;
const stars = n => [1, 2, 3, 4, 5].map(i => `<span class="s ${i <= Math.round(n) ? 'on' : ''}">${ic('star', 16)}</span>`).join('');
const card = b => `<article class="card glass" data-id="${b.id}" tabindex="0">${cover(b)}<div class="meta">${badge(b)}<h3>${esc(b.title)}</h3><p>${esc(b.author)}</p></div></article>`;

function marquee(t) {
  const g = `<div class="g">${Array(4).fill(`<span>${esc(t)}</span>`).join('<i class="dot"></i>')}<i class="dot"></i></div>`;
  $('#track').innerHTML = g + g;
}

async function load() {
  if (!db) { books = DEMO; marquee('وضع تجريبي: أضف SUPABASE_URL و SUPABASE_ANON_KEY لعرض بيانات المكتبة الحقيقية'); return render(); }
  const [b, n] = await Promise.all([
    db.from('books').select('*').order('created_at', { ascending: false }),
    db.from('notices').select('*').eq('is_active', true).limit(1)
  ]);
  if (b.error) toast('تعذر تحميل الكتب. تحقق من الاتصال وأعد المحاولة');
  books = b.data || [];
  const nt = n.data?.[0] || {};
  marquee([nt.marquee_text, nt.status_note].filter(Boolean).join('   ') || 'أهلاً بكم في مكتبتنا');
  render();
}

function render() {
  const cats = [...new Set(books.map(b => b.category).filter(Boolean))];
  const chips = [['all', 'جميع الكتب'], ...Object.entries(SEASONS).map(([k, v]) => ['s:' + k, v]), ...cats.map(c => ['c:' + c, c])];
  $('#filters').innerHTML = chips.map(([k, l]) => `<button class="chip ${flt === k ? 'on' : ''}" data-f="${esc(k)}">${esc(l)}</button>`).join('');
  const m = b => (!q || (b.title + ' ' + (b.author || '')).toLowerCase().includes(q)) &&
    (flt === 'all' || (flt.startsWith('s:') ? b.season === flt.slice(2) : b.category === flt.slice(2)));
  const f = books.filter(m), soon = f.filter(b => b.status === 'coming_soon'), rest = f.filter(b => b.status !== 'coming_soon');
  const pin = rest.filter(b => b.is_pinned), std = rest.filter(b => !b.is_pinned);
  $('#shelves').innerHTML = [['رف الكتب الأكثر طلباً المثبتة', pin, 'pin'], ['رف الكتب', std, 'book'], ['قريباً في المكتبة', soon, 'clock']]
    .map(([t, l, i]) => l.length ? `<section><h2>${ic(i)}${t}</h2><div class="grid">${l.map(card).join('')}</div></section>` : '').join('')
    || '<p class="empty">لا توجد كتب مطابقة. جرّب كلمة بحث أخرى أو اختر "جميع الكتب".</p>';
}

async function detail(id) {
  const b = books.find(x => x.id === id); if (!b) return;
  const o = openSheet(`<div class="dt">${cover(b)}<div><h2>${esc(b.title)}</h2><p class="mut">${esc(b.author)}</p>${badge(b)}
    <dl><dt>اللغة</dt><dd>${esc(b.language)}</dd><dt>التصنيف</dt><dd>${esc(b.category)}</dd>${SEASONS[b.season] ? `<dt>المجموعة</dt><dd>${SEASONS[b.season]}</dd>` : ''}</dl>
    <div id="avg" class="stars"></div></div></div>
    <div class="acts"><button class="btn ghost" id="fav"></button><button class="btn" id="req">${b.status === 'available' ? '+ طلب استعارة' : 'سلة الانتظار'}</button></div>
    <h3 class="sub">آراء الطلاب</h3><div id="rv"></div>
    <div class="rf"><div id="pick" class="stars pick"></div><input id="rn" placeholder="الاسم" maxlength="40"><textarea id="rc" rows="2" placeholder="اكتب رأيك في الكتاب" maxlength="300"></textarea><button class="btn ghost" id="rs">إرسال التقييم</button></div>`);

  const favBtn = () => { const on = favs.includes(id); const f = $('#fav', o); f.innerHTML = ic('heart') + (on ? 'في المفضلة' : 'أضف للمفضلة'); f.classList.toggle('on', on); };
  favBtn();
  $('#fav', o).onclick = () => { favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id]; sv(KEY.f, favs); favBtn(); };
  $('#req', o).onclick = () => reqForm(b);

  let rate = 0; const pick = $('#pick', o);
  pick.innerHTML = [1, 2, 3, 4, 5].map(i => `<button data-v="${i}" aria-label="${i} من 5">${ic('star', 22)}</button>`).join('');
  pick.onclick = e => { const v = e.target.closest('button')?.dataset.v; if (!v) return; rate = +v; $$('button', pick).forEach((x, i) => x.classList.toggle('on', i < rate)); };
  $('#rs', o).onclick = async () => {
    const n = $('#rn', o).value.trim();
    if (!n || !rate) return toast('أدخل اسمك واختر عدد النجوم');
    if (db) { const { error } = await db.from('reviews').insert({ book_id: id, student_name: n, rating: rate, comment: $('#rc', o).value.trim() }); if (error) return toast('تعذر إرسال التقييم، أعد المحاولة'); }
    $('#rc', o).value = ''; toast('شكراً على تقييمك'); revs();
  };
  async function revs() {
    let r = [];
    if (db) { const { data } = await db.from('reviews').select('*').eq('book_id', id).order('created_at', { ascending: false }); r = data || []; }
    $('#rv', o).innerHTML = r.map(x => `<div class="rv"><b>${esc(x.student_name)}</b> <span class="stars">${stars(x.rating)}</span><p>${esc(x.comment)}</p></div>`).join('') || '<p class="mut">لا توجد تقييمات بعد. كن أول من يقيّم هذا الكتاب.</p>';
    $('#avg', o).innerHTML = r.length ? stars(r.reduce((a, x) => a + x.rating, 0) / r.length) + `<small>(${r.length})</small>` : '';
  }
  revs();
}

function reqForm(b) {
  const last = hist[0] || {}, wait = b.status !== 'available';
  const o = openSheet(`<h2>${wait ? 'سلة الانتظار' : 'طلب استعارة'}</h2><p class="mut">${esc(b.title)}</p>
    <form id="rf" class="fm"><label>الاسم الكامل<input name="n" required maxlength="60" value="${esc(last.name)}"></label>
    <label>القسم / المستوى<input name="c" required maxlength="30" value="${esc(last.cls)}"></label>
    <label>تاريخ الطلب<input name="d" type="date" required value="${new Date().toISOString().slice(0, 10)}"></label>
    <button class="btn">إرسال الطلب</button></form>`);
  $('#rf', o).onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target), r = { book_id: b.id, student_name: f.get('n').trim(), student_class: f.get('c').trim(), request_date: f.get('d') };
    if (db) { const { error } = await db.from('waitlist').insert(r); if (error) return toast('تعذر إرسال الطلب، أعد المحاولة'); }
    hist = [{ bid: b.id, title: b.title, name: r.student_name, cls: r.student_class, date: r.request_date, wait }, ...hist].slice(0, 50);
    sv(KEY.h, hist);
    $$('.ov').forEach(x => x.remove());
    toast('لا تنسوا كتبكم لأننا لن ننساكم');
  };
}

function showFavs() {
  const l = books.filter(b => favs.includes(b.id));
  const o = openSheet(`<h2>${ic('heart')}المفضلة</h2>${l.map(b => `<div class="row glass" data-id="${b.id}"><div><b>${esc(b.title)}</b><p class="mut">${esc(b.author)}</p></div>${badge(b)}</div>`).join('') || '<p class="empty">لم تضف أي كتاب بعد. اضغط على القلب داخل صفحة الكتاب.</p>'}`);
  o.addEventListener('click', e => { const r = e.target.closest('.row'); if (r) { o.remove(); detail(r.dataset.id); } });
}

function showHist() {
  const o = openSheet(`<h2>${ic('clock')}سجل طلباتي</h2>${hist.map(h => `<div class="row glass"><div><b>${esc(h.title)}</b><p class="mut">${esc(h.name)} - ${esc(h.cls)} - ${esc(h.date)}</p></div><span class="bd ${h.wait ? 'coming_soon' : 'available'}">${h.wait ? 'في الانتظار' : 'طلب استعارة'}</span></div>`).join('') || '<p class="empty">لا توجد طلبات على هذا الجهاز بعد.</p>'}${hist.length ? '<button class="btn ghost" id="clr" style="margin-top:14px">مسح السجل</button>' : ''}`);
  $('#clr', o)?.addEventListener('click', () => { hist = []; sv(KEY.h, hist); o.remove(); toast('تم مسح السجل'); });
}

$('#shelves').onclick = e => { const c = e.target.closest('.card'); if (c) detail(c.dataset.id); };
$('#shelves').onkeydown = e => { if (e.key === 'Enter') { const c = e.target.closest('.card'); if (c) detail(c.dataset.id); } };
$('#filters').onclick = e => { const c = e.target.closest('.chip'); if (c) { flt = c.dataset.f; render(); } };
$('#q').oninput = e => { q = e.target.value.toLowerCase().trim(); render(); };
$('#bFav').onclick = showFavs; $('#bHist').onclick = showHist;
setTimeout(() => $('#splash').classList.add('off'), 3500);
load();
if (db) db.channel('live').on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, load).subscribe();