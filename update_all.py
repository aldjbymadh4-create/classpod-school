with open('public/v2.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    if "function v2PostTask()" in lines[i]:
        # استبدال دالة v2PostTask بنسخة تدعم إرسال الأسئلة
        new_lines.append("function v2PostTask() {\n")
        new_lines.append("  const cls = document.getElementById('t-class').value;\n")
        new_lines.append("  const subj = document.getElementById('t-subj').value;\n")
        new_lines.append("  const title = document.getElementById('t-title').value;\n")
        new_lines.append("  const desc = document.getElementById('t-desc').value;\n")
        new_lines.append("  const due = document.getElementById('t-due').value;\n")
        new_lines.append("  const questions = collectQuestions();\n\n")
        new_lines.append("  if (!subj || !title) {\n")
        new_lines.append("    alert('الرجاء إدخال المادة وعنوان الواجب');\n")
        new_lines.append("    return;\n")
        new_lines.append("  }\n\n")
        new_lines.append("  // إرسال البيانات للسيرفر مع الأسئلة والدرجات\n")
        new_lines.append("  fetch('/api/tasks', {\n")
        new_lines.append("    method: 'POST',\n")
        new_lines.append("    headers: { 'Content-Type': 'application/json' },\n")
        new_lines.append("    body: JSON.stringify({ class: cls, subject: subj, title, desc, dueDate: due, questions })\n")
        new_lines.append("  }).then(res => res.json()).then(data => {\n")
        new_lines.append("    sub2 = null; v2Reset(); alert('تم نشر الواجب بنجاح ✅'); render();\n")
        new_lines.append("  }).catch(err => {\n")
        new_lines.append("    console.error(err);\n")
        new_lines.append("    alert('حدث خطأ أثناء نشر الواجب');\n")
        new_lines.append("  });\n")
        new_lines.append("}\n")

        # تخطي الدالة القديمة
        i += 1
        brace_count = 1
        while i < len(lines) and brace_count > 0:
            if '{' in lines[i]:
                brace_count += lines[i].count('{')
            if '}' in lines[i]:
                brace_count -= lines[i].count('}')
            i += 1
    else:
        new_lines.append(lines[i])
        i += 1

with open('public/v2.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("تم تحديث دالة إرسال الواجب بنجاح!")
