/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { STUDENT_NAV } from '../config/navigation';
import UnifiedLayout from './UnifiedLayout';

const GREETINGS = [
  "Let's crush some goals!",
  "Ready to level up?",
  "Boost that attendance today!",
  "Keep your grades climbing!",
  "Time for a study sprint!",
  "Let's make today count!",
  "Focus up, you got this!",
  "Don't skip those classes!",
  "Push for that A grade!",
  "Every lecture counts!",
  "Learning looks good on you!",
  "Stay curious, stay sharp!",
  "Let's unlock new achievements!",
  "Small steps, big results!"
];

const StudentLayout = () => {
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("Student");
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  useEffect(() => {
    let mounted = true;

    const fetchStudentName = async (user) => {
      try {
        const { data: userData } = await supabase.from('users').select('full_name').eq('id', user.id).single();
        if (mounted) {
          if (userData && userData.full_name) {
            setStudentName(userData.full_name.split(' ')[0]);
          } else {
            setStudentName((user.user_metadata?.full_name || "Student").split(' ')[0]);
          }
        }
      } catch (error) {
        if (mounted) setStudentName((user.user_metadata?.full_name || "Student").split(' ')[0]);
      }
      if (mounted) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchStudentName(session.user);
      } else if (mounted) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          fetchStudentName(session.user);
        } else if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="velaar-page-shell"><div className="skeleton-base" style={{ height: '32px', width: '280px', borderRadius: '8px', marginBottom: '8px' }} /></div>;
  }

  return (
    <UnifiedLayout 
      title={`Welcome, ${studentName}`} 
      subtitle={greeting} 
      navItems={STUDENT_NAV}
      showSignOut={false}
      isStudent={true}
    />
  );
};

export default StudentLayout;

