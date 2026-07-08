import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';
import { PARENT_NAV } from '../config/navigation';

const ParentLayout = () => (
  <AppShell navItems={PARENT_NAV} showSignOut={false}>
    <Outlet />
  </AppShell>
);

export default ParentLayout;
