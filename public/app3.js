let CH = null, chOff = 0, chKey = '', QZ = { questions: [], history: [] }, qzSig = '', lastTurn = '';
function beep() {
  if (!sndOn()) return;
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = .15; o.start();
    setTimeout(() => { o.stop(); a.close(); }, 350);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch (e) { }
}
function ensureBox() { let b = document.getElementById('chbox'); if (!b) { b = document.createElement('div'); b.id = 'chbox'; document.body.appendChild(b); } return b; }
async function pollCh() {
  if (!S) { CH = null; paintCh(); return; }
  const cid = isStaff() ? curClass : S.me.classId;
  if (!cid) { CH = null; paintCh(); return; }
  try { const r = await api('/api/challenge?classId=' + cid); CH = r.challenge; chOff = r.now - Date.now(); } catch (e) { return; }
  paintCh();
}
function paintCh() {
  const b = ensureBox();
  if (!S || !CH) { b.innerHTML = ''; b.className = ''; chKey = ''; return; }
  const key = CH.id + CH.status;
  if (key !== chKey) {
    const first = chKey === '' || !chKey.startsWith(CH.id);
    chKey = key; b.className = 'on';
    const me = S.me.id === CH.studentId, n = esc(CH.studentName);
    if (CH.status === 'running' || CH.status === 'timeout') {
      b.innerHTML = `<div class="chh">${me ? '🎯 جاء دورك يا ' + n + '!' : '🎤 الدور على ' + n}</div><div class="chq">${esc(CH.question)}</div><div class="cht" id="cht"></div>` +
        (isStaff() ? `${CH.answer ? `<div class="mut">الجواب النموذجي: ${esc(CH.answer)}</div><br>` : ''}<div class="row"><button class="btn ok sm" onclick="markCh('correct')">✅ صح</button><button class="btn bad sm" onclick="markCh('wrong')">❌ خطأ</button><button class="btn ghost sm" onclick="markCh('cancel')">إلغاء</button></div>` : '');
      if (me && first && lastTurn !== CH.id) { lastTurn = CH.id; beep(); }
    } else if (CH.status === 'correct') {
      b.innerHTML = `<div class="chh">✅ إجابة صحيحة يا ${n}! ${CH.points > 0 && CH.groupName ? '+' + CH.points + ' نقطة لمجموعة ' + esc(CH.groupName) + ' 🎉' : '🎉'}</div>`;
    } else {
      b.innerHTML = `<div class="chh">❌ إجابة خاطئة يا ${n}، حظ أوفر المرة القادمة 💪</div>`;
    }
    if (quiz) loadQuizData();
  }
  tick();
}
function tick() {
  const t = document.getElementById('cht'); if (!t || !CH) return;
  const left = Math.max(0, Math.ceil((CH.endsAt - (Date.now() + chOff)) / 1000));
  t.textContent = CH.status === 'timeout' || left === 0 ? '⏰ انتهى الوقت' : '⏱ ' + left + ' ث';
}
const markCh = res => act(async () => { await api('/api/challenges/' + CH.id + '/mark', 'POST', { result: res }); await pollCh(); });
const startCh = () => act(async () => {
  await api('/api/challenges', 'POST', { classId: curClass, pick: $('#qp').value, questionId: $('#qq').value, seconds: $('#qt').value, points: $('#qpts').value });
  await pollCh();
});
const addQ = () => act(() => api('/api/questions', 'POST', { text: $('#nq').value, answer: $('#na').value }));
const delQ = id => confirm('حذف السؤال؟') && act(() => api('/api/questions/' + id, 'DELETE'));
const addStu = () => act(() => api('/api/students', 'POST', { name: $('#ns').value, classId: curClass }));
const delStu = id => confirm('إزالة الطالب؟ سيخرج من مجموعته أيضاً.') && act(() => api('/api/students/' + id, 'DELETE'));
async function loadQuizData() {
  if (!quiz) return;
  try {
    const [questions, history] = await Promise.all([api('/api/questions'), api('/api/challenges/history?classId=' + curClass)]);
    const sig = JSON.stringify([questions, history, curClass]);
    if (sig !== qzSig) { qzSig = sig; QZ = { questions, history }; if (quiz) render(); }
  } catch (e) { }
}
