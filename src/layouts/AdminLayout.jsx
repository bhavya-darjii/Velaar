import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';
import { ADMIN_NAV } from '../config/navigation';

const AdminLayout = () => (
  <AppShell navItems={ADMIN_NAV} showSignOut={false}>
    <Outlet />
  </AppShell>
);

export default AdminLayout;
