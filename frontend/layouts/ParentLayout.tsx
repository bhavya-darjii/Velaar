/* eslint-disable */
// @ts-nocheck
import { Outlet } from 'react-router-dom';
import UnifiedLayout from './UnifiedLayout';
import { PARENT_NAV } from '../config/navigation';

const ParentLayout = () => (
  <UnifiedLayout title="Parent Portal" subtitle="Your child's progress" navItems={PARENT_NAV} showSignOut={false}>
    <Outlet />
  </UnifiedLayout>
);

export default ParentLayout;

