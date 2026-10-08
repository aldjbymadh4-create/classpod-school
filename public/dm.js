const DM = { open: false, withId: null, contacts: [], flag: true, sig: '', msgKey: '', screen: 'list', q: '' };
let dmUnread = 0;
function dmEnsure() {
  if (document.getElementById('dmfab')) return;
  const f = document.createElement('button'); f.id = 'dmfab'; f.onclick = dmOpen; document.body.appendChild(f);
  const b = document.createElement('div'); b.id = 'dmbox'; document.body.appendChild(b);
}
function dmFab() {
  dmEnsure(); const f = $('#dmfab');
  if (!S || DM.open) { f.style.display = 'none'; return; }
  f.style.display = 'flex'; f.innerHTML = '💬' + (dmUnread ? `<i class="dot">${dmUnread}</i>` : '');
}
async function dmPoll() {
  dmEnsure();
  if (!S) { DM.open = false; $('#dmbox').className = ''; dmFab(); return; }
  try { dmUnread = (await api('/api/dm/unread')).n; } catch (e) { }
  dmFab();
  if (DM.open) { if (DM.screen === 'chat') dmLoadThread(); else if (DM.screen === 'list') dmLoadList(); }
}
function dmOpen() { DM.open = true; DM.screen = 'list'; DM.sig = ''; $('#dmbox').className = 'on'; dmShell(); dmLoadList(true); dmFab(); }
function dmClose() { DM.open = false; DM.screen = 'list'; DM.withId = null; $('#dmbox').className = ''; dmFab(); }

function dmShell() {
  DM.screen = 'list';
  $('#dmbox').innerHTML = `<div class="dmh"><button class="ic" onclick="dmClose()">✕</button><b>الرسائل الخاصة</b><span></span></div><div class="dmb">
  ${isStaff() ? `<button class="btn ghost sm" onclick="dmReports()">🚩 البلاغات</button><br><br>` : ''}
  ${S.me.role === 'admin' ? `<div class="card row"><span class="sp">مراسلة الطلاب لبعضهم</span><button class="btn sm" id="dmflag" onclick="dmFlag()">${DM.flag ? 'مفعّلة' : 'متوقفة'}</button></div>` : ''}
  <input id="dmq" placeholder="ابحث عن اسم..." value="${esc(DM.q)}" oninput="DM.q=this.value;dmItems()"><div id="dmlist"></div></div>`;
  dmItems();
}
function dmItems() {
  const el = $('#dmlist'); if (!el) return;
  const q = DM.q.trim(), items = DM.contacts.filter(c => !q || c.name.includes(q));
  el.innerHTML = items.map(c => `<div class="card row" onclick="dmChat('${c.id}')"><div class="av">${init(c.name)}</div><div class="sp"><h3>${esc(c.name)}</h3>
  <span class="mut">${ROLE[c.role]}${c.classId ? ' · ' + esc(clsLabel(c.classId)) : ''}${c.preview ? ' · ' + esc(c.preview) : ''}</span></div>${c.unread ? `<span class="pill">${c.unread}</span>` : ''}</div>`).join('') || '<p class="mut">لا يوجد أحد متاح للمراسلة.</p>';
}
async function dmLoadList(force) {
  try {
    const r = await api('/api/dm/contacts'), sig = JSON.stringify(r);
    if (sig === DM.sig && !force) return;
    DM.sig = sig; DM.contacts = r.contacts;
    const flagChanged = DM.flag !== r.studentToStudent; DM.flag = r.studentToStudent;
    const fb = $('#dmflag'); if (fb) fb.textContent = DM.flag ? 'مفعّلة' : 'متوقفة';
    if (flagChanged || force) dmItems(); else dmItems();
  } catch (e) { }
}
const dmFlag = () => api('/api/dm/settings', 'POST', { studentToStudent: !DM.flag }).then(() => dmLoadList(true)).catch(e => toast(e.message));

function dmChat(id) {
  DM.screen = 'chat'; DM.withId = id; DM.msgKey = '';
  const c = DM.contacts.find(x => x.id === id) || { name: '' };
  $('#dmbox').innerHTML = `<div class="dmh"><button class="ic" onclick="dmBack()">→</button><b>${esc(c.name)}</b><span></span></div><div class="dmb">
  <p class="mut" style="margin:0 0 8px">محادثة خاصة. تقدر تبلّغ عن أي رسالة مسيئة (🚩) وسيراجعها المعلم والمسؤولة.</p>
  <div class="msgs" id="dmmsgs"></div><div class="send"><input id="dmt" maxlength="500" placeholder="اكتب رسالة..." onkeydown="if(event.key==='Enter')dmSend()"><button onclick="dmSend()">➤</button></div></div>`;
  dmLoadThread();
}
function dmBack() { DM.withId = null; dmShell(); dmLoadList(true); }
async function dmLoadThread() {
  const id = DM.withId; if (!id || DM.screen !== 'chat') return; const el = $('#dmmsgs'); if (!el) return;
  try {
    const l = await api('/api/dm/thread/' + id);
    const key = l.length + ':' + (l.at(-1)?.id || ''); if (key === DM.msgKey) return; DM.msgKey = key;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80 || !el.children.length;
    el.innerHTML = l.map(m => { const mine = m.from === S.me.id; return `<div class="b ${mine ? 'me' : ''}"><small>${tm(m.at)}${mine ? '' : ` · <a onclick="dmReport('${m.id}')">🚩 إبلاغ</a>`}</small><p>${esc(m.text)}</p></div>`; }).join('') || '<p class="mut">ابدأ المحادثة 👋</p>';
    if (near) el.scrollTop = el.scrollHeight;
  } catch (e) { }
}
async function dmSend() {
  const i = $('#dmt'), t = i.value.trim(); if (!t) return; i.value = '';
  try { await api('/api/dm/thread/' + DM.withId, 'POST', { text: t }); DM.msgKey = ''; dmLoadThread(); } catch (e) { toast(e.message); }
}
const dmReport = id => confirm('الإبلاغ عن هذه الرسالة؟ سيطّلع عليها المعلم والمسؤولة.') && api('/api/dm/report', 'POST', { msgId: id }).then(() => toast('تم الإبلاغ، شكراً')).catch(e => toast(e.message));

async function dmReports() {
  DM.screen = 'reports';
  let l = []; try { l = await api('/api/dm/reports'); } catch (e) { toast(e.message); }
  $('#dmbox').innerHTML = `<div class="dmh"><button class="ic" onclick="dmBack()">→</button><b>البلاغات</b><span></span></div><div class="dmb">` +
    (l.map(r => `<div class="card"><b>${esc(r.senderName)}</b> <span class="mut">(أبلغ: ${esc(r.byName)})</span>${r.context.map(k => `<div class="mut">${esc(k.fromName)}: ${esc(k.text)}</div>`).join('')}<br><button class="btn ok sm" onclick="dmResolve('${r.id}')">تمت المراجعة</button></div>`).join('') || '<p class="mut">لا توجد بلاغات.</p>') + `</div>`;
}
const dmResolve = id => api('/api/dm/reports/' + id + '/resolve', 'POST').then(dmReports).catch(e => toast(e.message));

dmPoll();
setInterval(dmPoll, 4000);
