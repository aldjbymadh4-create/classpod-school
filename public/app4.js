function qzHtml() {
  const stu = S.users.filter(u => u.role === 'student' && u.classId === curClass), gs = S.groups.filter(g => g.classId === curClass);
  const ic = { correct: '✅', wrong: '❌', timeout: '⏰' };
  return classSel() + `<div class="card"><h3>🎲 تحدي جديد</h3>
  <label>من يجاوب؟</label><select id="qp"><option value="rand">🎲 عشوائي من الفصل كله</option>${gs.map(g => `<option value="g:${g.id}">🎲 عشوائي من مجموعة ${esc(g.name)}</option>`).join('')}${stu.map(u => `<option value="s:${u.id}">👤 ${esc(u.name)}</option>`).join('')}</select>
  <label>السؤال</label><select id="qq"><option value="rand">🎲 عشوائي من بنك الأسئلة</option>${QZ.questions.map(x => `<option value="${x.id}">${esc(x.text.slice(0, 50))}</option>`).join('')}</select>
  <label>الوقت (ثانية)</label><select id="qt"><option>30</option><option>40</option><option>50</option><option>60</option></select>
  <label>نقاط الإجابة الصحيحة</label><input id="qpts" type="number" value="5" min="0" max="100">
  <button class="btn" onclick="startCh()">ابدأ التحدي 🚀</button></div>
  <div class="card"><h3>👥 طلاب الفصل (${stu.length})</h3><div class="row"><input id="ns" maxlength="40" placeholder="اسم طالب جديد" style="margin:0"><button class="btn sm" onclick="addStu()">إضافة</button></div><br>
  ${stu.map(u => `<div class="row" style="margin-bottom:8px"><span class="sp">${esc(u.name)}${S.busy.includes(u.id) ? ' <span class="pill">في مجموعة</span>' : ''}</span><button class="btn bad sm" onclick="delStu('${u.id}')">إزالة</button></div>`).join('') || '<p class="mut">لا يوجد طلاب بعد.</p>'}</div>
  ${aiCard()}
  <div class="card"><h3>➕ سؤال جديد</h3><textarea id="nq" rows="2" placeholder="اكتب السؤال"></textarea><input id="na" placeholder="الجواب النموذجي (اختياري، يظهر لك فقط)"><button class="btn ghost" onclick="addQ()">حفظ السؤال</button></div>
  <h2>بنك الأسئلة (${QZ.questions.length})</h2>${QZ.questions.map(x => `<div class="card row"><div class="sp">${esc(x.text)}${x.answer ? `<div class="mut">الجواب: ${esc(x.answer)}</div>` : ''}</div><button class="btn bad sm" onclick="delQ('${x.id}')">حذف</button></div>`).join('') || '<p class="mut">لا توجد أسئلة.</p>'}
  <h2>آخر التحديات</h2>${QZ.history.map(h => `<div class="card">${ic[h.status] || ''} <b>${esc(h.studentName)}</b><div class="mut">${esc(h.question.slice(0, 60))}</div></div>`).join('') || '<p class="mut">لا توجد تحديات بعد.</p>'}`;
}
let AI = { items: [], busy: false, s: '', l: '', n: '5', v: 'متوسط' };
function aiCard() {
  const opt = (arr, cur) => arr.map(x => `<option ${x === cur ? 'selected' : ''}>${x}</option>`).join('');
  return `<div class="card"><h3>✨ أسئلة بالذكاء الاصطناعي</h3>
  <label>المادة</label><input maxlength="60" value="${esc(AI.s)}" oninput="AI.s=this.value" placeholder="مثال: الفيزياء">
  <label>الدرس</label><input maxlength="200" value="${esc(AI.l)}" oninput="AI.l=this.value" placeholder="مثال: قوانين نيوتن">
  <label>عدد الأسئلة</label><select onchange="AI.n=this.value">${opt(['5', '10', '15'], AI.n)}</select>
  <label>المستوى</label><select onchange="AI.v=this.value">${opt(['سهل', 'متوسط', 'صعب'], AI.v)}</select>
  <button class="btn" onclick="aiGen()" ${AI.busy ? 'disabled' : ''}>${AI.busy ? 'جارٍ التوليد...' : 'ولّد الأسئلة ✨'}</button>
  ${AI.items.length ? `<br><h3>راجعي الأسئلة ثم احفظي:</h3>${AI.items.map((x, i) => `<label class="chk"><input type="checkbox" class="aic" value="${i}" checked><span class="sp">${esc(x.text)}<div class="mut">الجواب: ${esc(x.answer)}</div></span></label>`).join('')}<button class="btn ok" onclick="aiSave()">حفظ المحدد في البنك</button>` : ''}</div>`;
}
async function aiGen() {
  AI.busy = true; render();
  try { const r = await api('/api/ai/questions', 'POST', { subject: AI.s, lesson: AI.l, count: AI.n, level: AI.v }); AI.items = r.items; }
  catch (e) { toast(e.message); }
  AI.busy = false; render();
}
function aiSave() {
  const items = [...document.querySelectorAll('.aic:checked')].map(c => AI.items[+c.value]);
  if (!items.length) return toast('اختر سؤالاً واحداً على الأقل');
  act(async () => { await api('/api/questions/bulk', 'POST', { items }); AI.items = []; toast('تم الحفظ في البنك ✅'); });
}
