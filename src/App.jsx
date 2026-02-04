import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Iridescence from './Iridescence/Iridescence';

// Import your pages
import LoginPage from './components/LoginPage';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';

function App() {
  return (
    <Router>
      <div className="app-layout">
        
        {/* BACKGROUND LAYER (Stays fixed behind every page) */}
        <div className="background-layer">
          <Iridescence 
            color={[0.5, 0.6, 0.8]} 
            mouseReact={true} 
            amplitude={0.1} 
            speed={1} 
          />
        </div>

        {/* CONTENT LAYER (Switches based on the URL) */}
        <div className="content-layer">
          <Routes>
            {/* When the app starts ('/'), show Login Page */}
            <Route path="/" element={<LoginPage />} />
            
            {/* The other pages */}
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/student" element={<StudentDashboard />} />
          </Routes>
        </div>

      </div>
    </Router>
  );
}

export default App;