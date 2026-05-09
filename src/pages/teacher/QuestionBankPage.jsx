import { useOutletContext } from 'react-router-dom';
import ExamSection from '../../components/teacher/QuestionBankSection';
import QuestionBankSkeleton from '../../components/skeletons/QuestionBankSkeleton';

const ExamsPage = () => {
  const { course, loading } = useOutletContext();

  if (loading || !course) {
    return <QuestionBankSkeleton />;
  }

  return (
    <div className="glass-container" style={{ minHeight: 'auto', padding: '20px 0' }}>
      <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <div className="exams-header" style={{marginBottom: "30px", textAlign: "center"}}>
          <h2 style={{color: '#ffffff', margin: 0, fontSize: '2rem', fontWeight: 800}}>Question Bank Generator</h2>
          <p style={{color: '#94a3b8', margin: '10px 0 0 0', fontSize: '1rem'}}>Create distinct, conceptual question papers based on completed topics.</p>
        </div>
        <ExamSection course={course} />
      </div>
    </div>
  );
};

export default ExamsPage;
