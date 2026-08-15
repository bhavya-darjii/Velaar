/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { HOD_NAV } from '../config/navigation';
import UnifiedLayout from './UnifiedLayout';

const HodLayout = () => {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [departmentName, setDepartmentName] = useState("Your Department");

  useEffect(() => {
    const initLayout = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      try {
        const { data } = await supabase.from('users').select('full_name, department').eq('id', session.user.id).single();
        if (data) {
          setFullName(data.full_name || 'HOD');
          setDepartmentName(data.department || 'Artificial Intelligence and Data Science');
        }
      } catch (error) {
        console.error('Error fetching HOD details:', error);
      }
      setLoading(false);
    };
    initLayout();
  }, []);

  if (loading) {
    return <div className="velaar-page-shell"><div className="skeleton-base" style={{ height: '32px', width: '280px', borderRadius: '8px', marginBottom: '8px' }} /></div>;
  }

  return (
    <UnifiedLayout 
      title={`Welcome back, ${fullName || 'HOD'}`}
      subtitle={`${departmentName} · Department Overview`}
      navItems={HOD_NAV}
    >
      <Outlet context={{ loading, fullName, departmentName }} />
    </UnifiedLayout>
  );
};

export default HodLayout;

