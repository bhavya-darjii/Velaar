import { adminDb } from './server/firebaseAdmin.js';

async function run() {
  if (!adminDb) {
    console.error('Firebase Admin not initialized. Check server/serviceAccountKey.json');
    process.exit(1);
  }

  // Find teacher UID
  let teacherUid = null;
  const userQuery = await adminDb.collection('users').where('email', '==', 'teacher@gmail.com').get();
  if (!userQuery.empty) {
    teacherUid = userQuery.docs[0].id;
    console.log(`Found teacher@gmail.com UID: ${teacherUid}`);
  } else {
    console.error('User teacher@gmail.com not found in users collection!');
    process.exit(1);
  }

  // Get first course
  const coursesSnapshot = await adminDb.collection('courses').limit(1).get();
  if (coursesSnapshot.empty) {
    console.error('No courses found in database.');
    process.exit(1);
  }

  const courseDoc = coursesSnapshot.docs[0];
  const courseData = courseDoc.data();
  const courseRef = adminDb.collection('courses').doc(courseDoc.id);

  console.log(`Found course: ${courseData.subjectName} (${courseDoc.id})`);
  console.log(`Current teacherId: ${courseData.teacherId}`);

  if (courseData.teacherId === teacherUid) {
    // Revert back
    const original = courseData._originalTeacherId || '1UmwbecVzYgVBupI8nPR';
    await courseRef.update({
      teacherId: original,
    });
    console.log(`✅ Reverted course owner to original: ${original}`);
  } else {
    // Assign to teacher
    await courseRef.update({
      teacherId: teacherUid,
      _originalTeacherId: courseData.teacherId // Save the old one so we can revert
    });
    console.log(`✅ Assigned course to teacher@gmail.com (${teacherUid})`);
  }

  process.exit(0);
}

run().catch(console.error);
