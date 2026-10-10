with open('public/v2.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
i = 0
while i < len(lines):
    if "function v2NewTask()" in lines[i]:
        # استبدال الدالة بالكامل بالنسخة الجديدة
        new_lines.append("function v2NewTask() {\n")
        new_lines.append("  return shell(`\n")
        new_lines.append("    <div style=\"padding: 15px; max-height: 80vh; overflow-y: auto;\">\n")
        new_lines.append("      <h3 style=\"color: #fff; margin-bottom: 15px;\">واجب جديد</h3>\n")
        new_lines.append("      <select id=\"t-class\" class=\"input\"><option>أول ثانوي . فصل 7</option></select>\n")
        new_lines.append("      <input id=\"t-subj\" class=\"input\" placeholder=\"المادة (مثال: الرياضيات)\">\n")
        new_lines.append("      <input id=\"t-title\" class=\"input\" placeholder=\"عنوان الواجب (مثال: حل التمرين 45)\">\n")
        new_lines.append("      <textarea id=\"t-desc\" class=\"input\" placeholder=\"التفاصيل (اختياري)\"></textarea>\n")
        new_lines.append("      <input id=\"t-due\" type=\"datetime-local\" class=\"input\">\n")
        new_lines.append("      ${renderQuestionBuilder()}\n")
        new_lines.append("      <button class=\"btn\" onclick=\"v2PostTask()\" style=\"margin-top: 15px;\">نشر الواجب 📝</button>\n")
        new_lines.append("    </div>\n")
        new_lines.append("  `, 'واجب جديد');\n")
        new_lines.append("}\n")
        
        # تخطي الأسطر القديمة للدالة حتى نصل لقوس الإغلاق الخاص بها
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

print("تم تحديث الدالة بنجاح عبر السكريبت الذكي!")
