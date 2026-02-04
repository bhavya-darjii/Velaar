import './App.css';
import ExamPage from './components/ExamPage';
import Iridescence from './Iridescence/Iridescence'; // Import the background

function App() {
  return (
    <div className="app-layout">
      
      {/* BACKGROUND LAYER - Put it here! */}
      <div className="background-layer">
        <Iridescence
          color={[0.5, 0.6, 0.8]} // A nice cool blue tone
          mouseReact={true}
          amplitude={0.1}
          speed={1}
        />
      </div>

      {/* CONTENT LAYER */}
      <div className="content-layer">
        <ExamPage />
      </div>

    </div>
  );
}

export default App;