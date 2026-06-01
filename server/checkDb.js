const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/aknu').then(async () => {
  const Assignment = require('./models/Assignment');
  const docs = await Assignment.find({ status: { $in: ['Submitted', 'Evaluated'] } })
                               .sort({ submittedAt: -1 })
                               .limit(5)
                               .select('extractedText studentId subjectId');
  
  docs.forEach((doc, i) => {
    console.log(`\n--- DOC ${i+1} ---`);
    console.log(`ID: ${doc._id}`);
    console.log(`Student: ${doc.studentId}`);
    console.log(`Subject: ${doc.subjectId}`);
    console.log(`Text Length: ${doc.extractedText ? doc.extractedText.length : 0}`);
    console.log(`Text:\n${doc.extractedText}`);
  });
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
