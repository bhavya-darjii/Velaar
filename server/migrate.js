import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const DEFAULT_COLLEGE_ID = 'default-college-velaar';
const DEFAULT_DEPT_ID = 'default-dept';

async function migrate() {
  console.log('Starting Migration...');

  // 1. Ensure the default college and department exist
  const collegeRef = db.collection('institutions').doc(DEFAULT_COLLEGE_ID);
  await collegeRef.set({
    name: 'Velaar Default College',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const deptRef = collegeRef.collection('departments').doc(DEFAULT_DEPT_ID);
  await deptRef.set({
    name: 'General Department',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  console.log('Institutions set up.');

  // 2. Migrate Users
  const usersSnapshot = await db.collection('users').get();
  let usersMigrated = 0;
  const userBatch = db.batch();
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.collegeId) {
      userBatch.update(doc.ref, { collegeId: DEFAULT_COLLEGE_ID, departmentId: DEFAULT_DEPT_ID });
      usersMigrated++;
    }
  });
  if (usersMigrated > 0) {
    await userBatch.commit();
  }
  console.log(`Migrated ${usersMigrated} users.`);

  // 3. Migrate Courses
  const coursesSnapshot = await db.collection('courses').get();
  let coursesMigrated = 0;
  const courseBatch = db.batch();
  coursesSnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.collegeId) {
      courseBatch.update(doc.ref, { collegeId: DEFAULT_COLLEGE_ID, departmentId: DEFAULT_DEPT_ID });
      coursesMigrated++;
    }
  });
  if (coursesMigrated > 0) {
    await courseBatch.commit();
  }
  console.log(`Migrated ${coursesMigrated} courses.`);

  console.log('Migration Complete.');
  process.exit(0);
}

migrate().catch(console.error);
