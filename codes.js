const db = JSON.parse(require('fs').readFileSync(__dirname + '/data/db.json'));
console.log('\nرمز المسؤولة:', db.users.find(u => u.role === 'admin').code);
console.log('رمز الطلاب :', db.school.studentCode);
console.log('رمز المعلم :', db.school.teacherCode, '\n');
