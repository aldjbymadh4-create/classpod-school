function copyTxt(t) {
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('تم النسخ ✅')).catch(() => prompt('انسخ من هنا', t));
}
function shareApp() {
  let u = location.origin;
  if (/localhost|127\.0\.0\.1/.test(u)) { u = prompt('الصق رابط التطبيق العام (من cloudflared)', localStorage.pubUrl || '') || ''; if (!u) return; localStorage.pubUrl = u; }
  const text = 'انضم إلى ClassPod 🎓\nالرابط: ' + u + '\nرمز الطلاب: ' + S.school.studentCode;
  if (navigator.share) navigator.share({ text }).catch(() => { }); else copyTxt(text);
}
const clearNotifs = () => confirm('مسح كل الإشعارات؟') && act(async () => { await api('/api/notifications/clear', 'POST'); notifs = []; toast('تم المسح'); });
const backup = () => { location.href = '/api/backup'; };
function applyZoom() { document.body.style.zoom = localStorage.zoom || 1; }
function fontStep(d) { let z = parseFloat(localStorage.zoom || 1); z = d === 0 ? 1 : Math.min(1.3, Math.max(.9, Math.round((z + d * .1) * 10) / 10)); localStorage.zoom = z; applyZoom(); render(); }
const sndOn = () => localStorage.snd !== '0';
const sndLabel = () => sndOn() ? 'مفعّل' : 'متوقف';
function toggleSnd() { localStorage.snd = sndOn() ? '0' : '1'; render(); }

function moreView() {
  const m = S.me, g = myGroup(), sc = S.school, st = isStaff(), isAdmin = m.role === 'admin';
  const count = r => S.users.filter(u => u.role === r).length;
  const guides = {
    student: ['تدخل برمز الطلاب ثم تكتب اسمك وفصلك.', 'المعلم يضمّك إلى مجموعة وتظهر لك في الرئيسية.', 'راسل زملاءك من المجموعات ثم الدردشة.', 'لما يجي دورك في سؤال يظهر لك السؤال والعدّاد وتجاوب بصوتك.', 'النقاط والترتيب يحدّدها المعلم فقط.'],
    teacher: ['أنشئ مجموعة من الرئيسية واختر الطلاب والعريف.', 'أضف النقاط من تبويب النقاط داخل المجموعة.', 'من أدوات المعلم: سحب عشوائي، بنك أسئلة، وتوليد أسئلة بالذكاء الاصطناعي.', 'شارك رمز الطلاب ليسجّلوا بأنفسهم، وتقدر تضيفهم يدوياً.'],
    admin: ['أنشئي الفصول وأعطي رمز المعلم لمعلمك.', 'شاركي رمز الطلاب مع المعلمين أو الطلاب.', 'خذي نسخة احتياطية من البيانات بين فترة وفترة.', 'أي رمز تظنين أنه تسرّب، غيّريه من هنا.']
  };
  const guide = guides[m.role];
  let h = `<div class="card hero row"><div class="av">${init(m.name)}</div><div><h3>${esc(m.name)}</h3><small>${ROLE[m.role]}${m.nationality ? ' · ' + esc(m.nationality) : ''}</small></div></div>`;
  h += `<h2>👤 حسابي</h2><div class="card"><div class="mut">الاسم</div>${esc(m.name)}<br><br><div class="mut">الدور</div>${ROLE[m.role]}<br><br><div class="mut">المدرسة</div>${esc(sc.name)}` +
    (m.nationality ? `<br><br><div class="mut">الجنسية</div>${esc(m.nationality)}` : '') +
    (m.classId ? `<br><br><div class="mut">الفصل</div>${esc(clsLabel(m.classId))}` : '') +
    (g ? `<br><br><div class="mut">المجموعة</div>${esc(g.name)} · المركز ${g.rank} · ${g.points} نقطة<br><br><button class="btn ghost sm" onclick="open_('${g.id}')">فتح مجموعتي</button>` : '') + `</div>`;
  if (st) {
    h += `<h2>🏫 للمعلم</h2><div class="card"><div class="mut">رمز دخول الطلاب</div><div class="big">${esc(sc.studentCode)}</div>
    <div class="row" style="flex-wrap:wrap"><button class="btn ghost sm" onclick="copyTxt('${esc(sc.studentCode)}')">نسخ الرمز</button><button class="btn ghost sm" onclick="shareApp()">مشاركة الرابط</button><button class="btn ghost sm" onclick="newCode('student')">رمز جديد</button></div></div>
    <button class="btn ghost" onclick="go('home');quiz=true;render()">🎲 أدوات المعلم</button><br><br>`;
  }
  if (isAdmin) {
    h += `<h2>🛡️ المسؤولة</h2><div class="card"><div class="mut">رمز دخول المعلم</div><div class="big">${esc(sc.teacherCode)}</div>
    <div class="row"><button class="btn ghost sm" onclick="copyTxt('${esc(sc.teacherCode)}')">نسخ الرمز</button><button class="btn ghost sm" onclick="newCode('teacher')">رمز جديد</button></div></div>
    <div class="card row"><div class="sp"><span class="mut">الطلاب</span><div class="big">${count('student')}</div></div><div class="sp"><span class="mut">المعلمون</span><div class="big">${count('teacher')}</div></div><div class="sp"><span class="mut">المجموعات</span><div class="big">${S.groups.length}</div></div></div>
    <div class="card"><button class="btn ghost" onclick="backup()">💾 تنزيل نسخة احتياطية</button></div>
    <div id="adm"><button class="btn ghost" onclick="loadAdmin()">إدارة الفصول والمستخدمين</button></div>`;
  }
  h += `<h2>⚙️ الإعدادات</h2>
  <div class="card row"><span class="sp">🌙 الوضع الليلي</span><button class="btn sm" onclick="toggleDark()">تبديل</button></div>
  <div class="card row"><span class="sp">🔔 صوت التنبيه</span><button class="btn sm" onclick="toggleSnd()">${sndLabel()}</button></div>
  <div class="card row"><span class="sp">🔠 حجم الخط</span><button class="btn ghost sm" onclick="fontStep(-1)">A-</button><button class="btn ghost sm" onclick="fontStep(0)">عادي</button><button class="btn ghost sm" onclick="fontStep(1)">A+</button></div>
  <div class="card row"><span class="sp">🌐 اللغة</span><span class="mut">العربية</span></div>
  <div class="card row"><span class="sp">🗑️ الإشعارات</span><button class="btn ghost sm" onclick="clearNotifs()">مسح الكل</button></div>
  <h2>📖 المساعدة</h2><details class="card"><summary>كيف أستخدم التطبيق؟</summary><ul>${guide.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>
  <h2>ℹ️ عن التطبيق</h2><div class="card">ClassPod · كلاس بود<br><span class="mut">الإصدار 1.0.0 · ${esc(sc.name)}</span><br><br><span class="mut">بياناتك (الاسم والفصل والجنسية) تُستخدم داخل ClassPod لتنظيم المجموعات والنقاط فقط. تسجيل الدخول بحساب Microsoft سيُضاف لاحقاً.</span></div>
  <button class="btn bad" onclick="logout()">تسجيل الخروج</button>`;
  return h;
}
