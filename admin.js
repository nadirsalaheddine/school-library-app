const app = $('#app');
let books = [];
const opt = (m, s) => Object.entries(m).map(([k, v]) => `<option value="${k}" ${k === s ? 'selected' : ''}>${v}</option>`).join('');

(async function init() {
  if (!db) { app.innerHTML = '<p class="empty">إعدادات Supabase غير مكتملة. أضف SUPABASE_URL و SUPABASE_ANON_KEY في Netlify ثم أعد النشر.</p>'; return; }
  const { data: { session } } = await db.auth.getSession();
  session ? dash() : login();
})();

function login() {
  app.innerHTML = `<form id="lf" class="fm glass pad"><h2>دخول الإدارة</h2>
    <label>البريد الإلكتروني<input name="e" type="email" required autocomplete="username"></label>
    <label>كلمة المرور<input name="p" type="password" required autocomplete="current-password"></label><button class="btn">دخول</button></form>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    const { error } = await db.auth.signInWithPassword({ email: f.get('e'), password: f.get('p') });
    error ? toast('البريد أو كلمة المرور غير صحيحة') : dash();
  };
}

function dash() {
  app.innerHTML = `<div class="tabs"><button class="chip on" data-t="b">الكتب</button><button class="chip" data-t="r">الطلبات المعلقة</button><button class="chip" data-t="n">إشعار اليوم</button><button class="chip" id="out">${ic('out', 16)} خروج</button></div><div id="pane"></div>`;
  $('.tabs').onclick = e => {
    const t = e.target.closest('[data-t]'); if (!t) return;
    $$('.tabs .chip').forEach(x => x.classList.toggle('on', x === t));
    ({ b: tBooks, r: tReqs, n: tNotice })[t.dataset.t]();
  };
  $('#out').onclick = async () => { await db.auth.signOut(); login(); };
  tBooks();
}

async function tBooks() {
  const pane = $('#pane');
  const { data, error } = await db.from('books').select('*').order('created_at', { ascending: false });
  if (error) toast('تعذر تحميل الكتب');
  books = data || [];
  pane.innerHTML = `<button class="btn" id="add">${ic('plus', 18)} إضافة كتاب</button><div class="list">${books.map(b => `
    <div class="row glass" data-id="${b.id}"><div><b>${esc(b.title)}</b><p class="mut">${esc(b.author)}</p></div>
    <div class="ctl"><select data-s aria-label="الحالة">${opt(ST, b.status)}</select>
    <button class="ib ${b.is_pinned ? 'on' : ''}" data-a="pin" aria-label="تثبيت">${ic('pin')}</button>
    <button class="ib" data-a="edit" aria-label="تعديل">${ic('edit')}</button>
    <button class="ib" data-a="del" aria-label="حذف">${ic('trash')}</button></div></div>`).join('') || '<p class="empty">لا توجد كتب بعد. اضغط "إضافة كتاب" للبدء.</p>'}</div>`;
  pane.onclick = async e => {
    if (e.target.closest('#add')) return form();
    const r = e.target.closest('.row'), a = e.target.closest('[data-a]')?.dataset.a; if (!r || !a) return;
    const b = books.find(x => x.id === r.dataset.id);
    if (a === 'edit') return form(b);
    if (a === 'pin') await db.from('books').update({ is_pinned: !b.is_pinned }).eq('id', b.id);
    if (a === 'del') { if (!confirm('حذف هذا الكتاب نهائياً؟')) return; await db.from('books').delete().eq('id', b.id); }
    tBooks();
  };
  pane.onchange = async e => {
    if (!e.target.dataset.s) return;
    const { error } = await db.from('books').update({ status: e.target.value }).eq('id', e.target.closest('.row').dataset.id);
    toast(error ? 'تعذر التحديث' : 'تم تحديث الحالة');
  };
}

function form(b = {}) {
  const o = openSheet(`<h2>${b.id ? 'تعديل كتاب' : 'إضافة كتاب'}</h2><form id="bf" class="fm">
    <label>رابط الغلاف<input name="cover_url" type="url" value="${esc(b.cover_url)}" dir="ltr"></label>
    <label>العنوان<input name="title" required value="${esc(b.title)}"></label>
    <label>المؤلف<input name="author" value="${esc(b.author)}"></label>
    <label>اللغة<input name="language" value="${esc(b.language || 'العربية')}"></label>
    <label>التصنيف<input name="category" value="${esc(b.category)}"></label>
    <label>الموسم<select name="season">${opt({ all: 'كل المواسم', autumn: 'الخريف', winter: 'الشتاء', spring: 'الربيع' }, b.season)}</select></label>
    <label>الحالة<select name="status">${opt(ST, b.status)}</select></label><button class="btn">حفظ الكتاب</button></form>`);
  $('#bf', o).onsubmit = async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    const { error } = b.id ? await db.from('books').update(v).eq('id', b.id) : await db.from('books').insert(v);
    if (error) return toast('تعذر حفظ الكتاب، راجع الحقول وأعد المحاولة');
    o.remove(); toast('تم حفظ الكتاب'); tBooks();
  };
}

async function tReqs() {
  const pane = $('#pane'); pane.onclick = pane.onchange = null;
  const { data } = await db.from('waitlist').select('*,books(id,title)').order('request_date');
  pane.innerHTML = `<div class="list">${(data || []).map(r => `<div class="row glass" data-id="${r.id}" data-b="${r.book_id}"><div><b>${esc(r.books?.title)}</b><p class="mut">${esc(r.student_name)} - ${esc(r.student_class)} - ${esc(r.request_date)}</p></div><button class="btn" data-a="ok">${ic('check', 18)} تأكيد التسليم</button></div>`).join('') || '<p class="empty">لا توجد طلبات معلقة الآن.</p>'}</div>`;
  pane.onclick = async e => {
    const r = e.target.closest('.row'); if (!r || !e.target.closest('[data-a=ok]')) return;
    const u = await db.from('books').update({ status: 'borrowed' }).eq('id', r.dataset.b);
    if (u.error) return toast('تعذر تحديث حالة الكتاب');
    await db.from('waitlist').delete().eq('id', r.dataset.id);
    toast('تم تسجيل الإعارة'); tReqs();
  };
}

async function tNotice() {
  const pane = $('#pane'); pane.onclick = pane.onchange = null;
  const { data } = await db.from('notices').select('*').eq('is_active', true).limit(1);
  const n = data?.[0] || {};
  pane.innerHTML = `<form id="nf" class="fm glass pad"><label>شريط الإعلانات: ساعات الدوام وأيام الإغلاق<textarea name="marquee_text" rows="3">${esc(n.marquee_text)}</textarea></label>
    <label>ملاحظة اليوم<textarea name="status_note" rows="2">${esc(n.status_note)}</textarea></label><button class="btn">نشر التحديث</button></form>`;
  $('#nf').onsubmit = async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    const { error } = n.id ? await db.from('notices').update(v).eq('id', n.id) : await db.from('notices').insert({ ...v, is_active: true });
    toast(error ? 'تعذر النشر' : 'تم نشر التحديث');
  };
}
