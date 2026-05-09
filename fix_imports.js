import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');

const replacements = [
  // Skeletons
  { regex: /\.\.?\/components\/FullLayoutSkeleton/g, replace: 'components/skeletons/FullLayoutSkeleton' },
  { regex: /\.\.?\/components\/HomePageSkeleton/g, replace: 'components/skeletons/HomePageSkeleton' },
  { regex: /\.\.?\/components\/CourseGeneratorSkeleton/g, replace: 'components/skeletons/CourseGeneratorSkeleton' },
  { regex: /\.\.?\/components\/LessonPlanSkeleton/g, replace: 'components/skeletons/LessonPlanSkeleton' },
  { regex: /\.\.?\/components\/ExaminationSkeleton/g, replace: 'components/skeletons/ExaminationSkeleton' },
  { regex: /\.\.?\/components\/QuestionBankSkeleton/g, replace: 'components/skeletons/QuestionBankSkeleton' },
  { regex: /\.\.?\/components\/SkeletonLoader\.css/g, replace: 'components/skeletons/SkeletonLoader.css' },
  
  // Auth
  { regex: /\.\.?\/components\/ProtectedRoute/g, replace: 'components/auth/ProtectedRoute' },
  { regex: /\.\.?\/pages\/LoginPage/g, replace: 'pages/auth/LoginPage' },

  // Admin
  { regex: /\.\.?\/pages\/AdminDashboard/g, replace: 'pages/admin/AdminDashboard' },

  // Student
  { regex: /\.\.?\/pages\/StudentDashboard/g, replace: 'pages/student/StudentDashboard' },

  // Teacher Components
  { regex: /\.\.?\/components\/CourseChecklist/g, replace: 'components/teacher/CourseChecklist' },
  { regex: /\.\.?\/components\/ExamSection/g, replace: 'components/teacher/QuestionBankSection' },
  { regex: /\.\.?\/components\/CourseGenerator/g, replace: 'pages/teacher/CourseGeneratorPage' },

  // Teacher Pages
  { regex: /\.\.?\/pages\/TeacherHome/g, replace: 'pages/teacher/TeacherHome' },
  { regex: /\.\.?\/pages\/TeacherDashboard/g, replace: 'pages/teacher/TeacherDashboard' },
  { regex: /\.\.?\/pages\/LessonPlanPage/g, replace: 'pages/teacher/LessonPlanPage' },
  { regex: /\.\.?\/pages\/ExaminationPage/g, replace: 'pages/teacher/ExaminationPage' },
  { regex: /\.\.?\/pages\/ExaminationEditor/g, replace: 'pages/teacher/ExaminationEditor' },
  { regex: /\.\.?\/pages\/ExamsPage/g, replace: 'pages/teacher/QuestionBankPage' }
];

function getRelativePrefix(fullPath) {
  if (fullPath.includes(path.join('src', 'pages', 'teacher')) || 
      fullPath.includes(path.join('src', 'pages', 'admin')) || 
      fullPath.includes(path.join('src', 'pages', 'auth')) || 
      fullPath.includes(path.join('src', 'pages', 'student')) ||
      fullPath.includes(path.join('src', 'components', 'teacher')) ||
      fullPath.includes(path.join('src', 'components', 'auth')) ||
      fullPath.includes(path.join('src', 'components', 'skeletons'))) {
    return '../../';
  }
  if (fullPath.includes(path.join('src', 'App.jsx')) || 
      fullPath.includes(path.join('src', 'main.jsx')) || 
      fullPath.includes(path.join('src', 'index.css')) ||
      fullPath.includes(path.join('src', 'layouts', 'TeacherLayout.jsx'))) {
    return './';
  }
  return '../'; // Default 1 level deep
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      const prefix = getRelativePrefix(fullPath);

      // Fix raw internal imports (like going from one page to a service)
      if (prefix === '../../') {
        const newContent = content
          .replace(/from '\.\.\/services/g, "from '../../services")
          .replace(/from "\.\.\/services/g, "from \"../../services")
          // Fix imports to components that DID NOT MOVE (like Plasma)
          .replace(/from '\.\.\/components\/Plasma/g, "from '../../components/Plasma")
          .replace(/from "\.\.\/components\/Plasma/g, "from \"../../components/Plasma")
          // Fix internal component references in the same new folder
          .replace(/from '\.\.\/components\/(?!skeletons|auth|teacher)/g, "from '../../components/")
          .replace(/from "\.\.\/components\/(?!skeletons|auth|teacher)/g, "from \"../../components/")
          // Fix css imports
          .replace(/import '\.\.\/components\//g, "import '../../components/");
        
        if (content !== newContent) {
           content = newContent;
           changed = true;
        }
      }

      // Apply specific replacements
      if (!fullPath.includes('App.jsx')) {
        for (const rule of replacements) {
          const newContent = content.replace(rule.regex, (match) => {
            // Check if we are linking to something in the SAME exact directory now
            // e.g. from TeacherHome.jsx to QuestionBankPage.jsx
            // Both are in src/pages/teacher/
            if (prefix === '../../' && rule.replace.includes('pages/teacher') && fullPath.includes(path.join('src', 'pages', 'teacher'))) {
               return './' + rule.replace.split('/').pop();
            }
            if (prefix === '../../' && rule.replace.includes('components/teacher') && fullPath.includes(path.join('src', 'components', 'teacher'))) {
               return './' + rule.replace.split('/').pop();
            }
            if (prefix === '../../' && rule.replace.includes('components/skeletons') && fullPath.includes(path.join('src', 'components', 'skeletons'))) {
               return './' + rule.replace.split('/').pop();
            }
            return prefix + rule.replace;
          });
          if (content !== newContent) {
            content = newContent;
            changed = true;
          }
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed imports in: ' + fullPath);
      }
    }
  }
}

processDir(srcDir);
