with open('public/v2.js', 'r', encoding='utf-8') as f:
    content = f.read()

# سنقوم بتحديث دالة v2NewTask لتدعم إدراج الأسئلة
old_func = """function v2NewTask() {
  return shell(`
    <div style="padding: 15px;">
      <h3>واجب جديد</h3>
      <select id="t-class" class="input"><option>أول ثانوي . فصل 7</option></select>
      <input id="t-subj" class="input" placeholder="المادة (مثال: الرياضيات)">
      <input id="t-title" class="input" placeholder="عنوان الواجب (مثال: حل التمرين 45)">
      <textarea id="t-desc" class="input" placeholder="التفاصيل (اختياري)"></textarea>
      <input id="t-due" type="datetime-local" class="input">
      <button class="btn" onclick="v2PostTask()">نشر الواجب 📝</button>
    </div>
  `, 'واجب جديد');
}"""

new_func = """function v2NewTask() {
  return shell(`
    <div style="padding: 15px; max-height: 80vh; overflow-y: auto;">
      <h3 style="color: #fff; margin-bottom: 15px;">واجب جديد</h3>
      <select id="t-class" class="input"><option>أول ثانوي . فصل 7</option></select>
      <input id="t-subj" class="input" placeholder="المادة (مثال: الرياضيات)">
      <input id="t-title" class="input" placeholder="عنوان الواجب (مثال: حل التمرين 45)">
      <textarea id="t-desc" class="input" placeholder="التفاصيل (اختياري)"></textarea>
      <input id="t-due" type="datetime-local" class="input">
      
      ${renderQuestionBuilder()}
      
      <button class="btn" onclick="v2PostTask()" style="margin-top: 15px;">نشر الواجب 📝</button>
    </div>
  `, 'واجب جديد');
}"""

if old_func in content:
    content = content.replace(old_func, new_func)
    with open('public/v2.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("تم التحديث بنجاح!")
else:
    print("لم يتم العثور على الدالة بالشكل المطابق، يرجى التحقق.")
