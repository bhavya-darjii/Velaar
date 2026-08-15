/* eslint-disable */
// @ts-nocheck
import { Outlet } from 'react-router-dom';
import { PRINCIPAL_NAV } from '../config/navigation';
import UnifiedLayout from './UnifiedLayout';

const PrincipalLayout = () => (
  <UnifiedLayout
    title="Institution Overview"
    subtitle="Principal · Velaar"
    navItems={PRINCIPAL_NAV}
  >
    <Outlet />
  </UnifiedLayout>
);

export default PrincipalLayout;

