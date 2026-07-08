import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';
import { HOD_NAV } from '../config/navigation';

const HodLayout = () => (
  <AppShell navItems={HOD_NAV}>
    <Outlet />
  </AppShell>
);

export default HodLayout;
