import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';
import { STUDENT_NAV } from '../config/navigation';

const StudentLayout = () => (
  <AppShell navItems={STUDENT_NAV} showSignOut={false}>
    <Outlet />
  </AppShell>
);

export default StudentLayout;
