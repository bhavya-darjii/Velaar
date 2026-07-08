import { useLocation } from 'react-router-dom';
import VelaarCopilotV2 from './VelaarCopilotV2';

const HIDE_COPILOT_PATHS = ['/', '/pending', '/setup'];

const getRoleFromPath = (pathname) => {
  if (pathname.startsWith('/admin') || pathname.startsWith('/velaar-admin')) return 'admin';
  if (pathname.startsWith('/hod')) return 'hod';
  if (pathname.startsWith('/student')) return 'student';
  if (pathname.startsWith('/parent')) return 'parent';
  if (pathname.startsWith('/registrar')) return 'registrar';
  if (pathname.startsWith('/exam-controller')) return 'examController';
  if (pathname.startsWith('/teacher')) return 'teacher';
  return 'teacher';
};

const GlobalCopilot = ({ userRole }) => {
  const location = useLocation();

  if (HIDE_COPILOT_PATHS.includes(location.pathname)) return null;
  if (!userRole || userRole === 'pending' || userRole === 'setup') return null;

  const role = userRole || getRoleFromPath(location.pathname);
  return <VelaarCopilotV2 userRole={role} />;
};

export default GlobalCopilot;
