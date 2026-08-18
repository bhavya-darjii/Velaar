/* eslint-disable */
// @ts-nocheck
import { useLocation } from 'react-router-dom';
import VelaarCopilot from './VelaarCopilot';

const HIDE_COPILOT_PATHS = ['/', '/pending', '/setup'];

const ROLE_BASE_PATHS = {
  admin: ['/admin', '/velaar-admin'],
  velaarAdmin: ['/velaar-admin'],
  hod: ['/hod'],
  student: ['/student'],
  parent: ['/parent'],
  registrar: ['/registrar'],
  examController: ['/exam-controller'],
  teacher: ['/teacher'],
  principal: ['/principal'],
};

const GlobalCopilot = ({ userRole }) => {
  const location = useLocation();

  if (HIDE_COPILOT_PATHS.includes(location.pathname)) return null;
  if (!userRole || userRole === 'pending' || userRole === 'setup' || userRole === 'student') return null;

  // Hide copilot if user is on a 404 or an unauthorized role page
  const allowedPrefixes = ROLE_BASE_PATHS[userRole];
  if (allowedPrefixes && !allowedPrefixes.some(prefix => location.pathname.startsWith(prefix))) {
    return null;
  }
  
  return <VelaarCopilot userRole={userRole} />;
};

export default GlobalCopilot;
