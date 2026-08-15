/* eslint-disable */
// @ts-nocheck
import { useOutletContext } from 'react-router-dom';
import ExamSection from '../../components/teacher/QuestionBankSection';
import QuestionBankSkeleton from '../../components/skeletons/QuestionBankSkeleton';

const ExamsPage = () => {
  const { course, loading } = useOutletContext();

  if (loading || !course) {
    return <QuestionBankSkeleton />;
  }

  return (
    <div className="lesson-plan-container" style={{ padding: '20px' }}>
      <div className="lesson-plan-grid glass" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '40px' }}>
        <div className="exams-header" style={{marginBottom: "30px", textAlign: "center"}}>
          <h2 style={{color: '#ffffff', margin: 0, fontSize: '2rem', fontWeight: 900}}>Question Bank Generator</h2>
          <p style={{color: '#ffffff', margin: '10px 0 0 0', fontSize: '1rem', opacity: 0.9}}>Create distinct, conceptual question papers based on completed topics.</p>
        </div>
      <ExamSection course={course} />
      </div>
    </div>
  );
};

export default ExamsPage;

