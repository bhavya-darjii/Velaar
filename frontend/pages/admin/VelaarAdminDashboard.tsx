/* eslint-disable */
// @ts-nocheck
/**
 * VelaarAdminDashboard.jsx
 * Super Admin control panel for the Velaar platform.
 * Accessible only to users with user_type: 'velaarAdmin'.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import AdminDashboardSkeleton from '../../components/skeletons/AdminDashboardSkeleton';
import GlassSelect from '../../components/shared/GlassSelect';
import './VelaarAdminDashboard.css';

// ── Role badge helper ──────────────────────────────────────────────
const ROLE_LABELS = {
  teacher:        'Teacher',
  hod:            'Head of Dept',
  registrar:      'Registrar',
  admin:          'Institution Admin',
  student:        'Student',
  setup:          'Setup Pending',
  velaarAdmin:    'Velaar Admin',
  examController: 'Exam Controller',
  parent:         'Parent',
};

const RoleBadge = ({ role }) => (
  <span className={`va-badge va-badge--${role || 'student'}`}>
    {ROLE_LABELS[role] || role || 'Unknown'}
  </span>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="va-tooltip">
      <div className="va-tooltip-label">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color || '#fff', fontWeight: 700 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

const Icons = {
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Building: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21v-8M21 21v-8M12 21v-8M4 10h16M2 21h20M12 2L2 10h20Z"/>
    </svg>
  ),
  BookOpen: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
};

const PALETTE = [
  '#6366f1','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#a855f7','#ef4444','#14b8a6',
];

const ROLE_COLORS = {
  student:        '#ffffff',
  teacher:        '#6366f1',
  hod:            '#f59e0b',
  registrar:      '#14b8a6',
  admin:          '#ef4444',
  setup:          '#f97316',
  velaarAdmin:    '#ffffff',
  examController: '#a855f7',
  parent:         '#22d3ee',
};

const VelaarAdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers]       = useState([]);
  const [courses, setCourses]   = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updating, setUpdating] = useState(null); 
  const [globalInstId, setGlobalInstId] = useState('');
  
  // Invite state
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
  const [inviteInstId, setInviteInstId] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteSemester, setInviteSemester] = useState('');
  const [inviteDivision, setInviteDivision] = useState('');
  
  const [newInstName, setNewInstName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const ASSIGNABLE_ROLES = ['student', 'teacher', 'hod', 'registrar', 'admin', 'parent'];

  const [currentUserId, setCurrentUserId] = useState(null);
  const currentUserData = users.find(u => u.uid === currentUserId);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) setCurrentUserId(session.user.id);

        const [{ data: usersData }, { data: coursesData }, { data: instsData }] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('courses').select('*'),
          supabase.from('institutions').select('*'),
        ]);
        setUsers((usersData || []).map(d => ({ ...d, uid: d.id })));
        setCourses((coursesData || []).map(d => ({ id: d.id, ...d })));
        setInstitutions((instsData || []).map(d => ({ id: d.id, ...d })));
      } catch (err) {
        console.error('VelaarAdmin load error:', err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const colleges = useMemo(() => {
    const map = {};
    users.forEach(u => {
      const c = u.college_name || 'Unassigned';
      const id = u.institution_id || 'unassigned';
      if (!map[id]) map[id] = { id, name: c, users: 0, teachers: 0, students: 0, courses: 0 };
      map[id].users++;
      if (u.user_type === 'teacher') map[id].teachers++;
      if (u.user_type === 'student') map[id].students++;
    });
    courses.forEach(c => {
      const id = c.institution_id || 'unassigned';
      if (map[id]) map[id].courses++;
    });
    return Object.values(map).sort((a, b) => b.users - a.users);
  }, [users, courses]);

  const roleDistribution = useMemo(() => {
    const map = {};
    users.forEach(u => {
      const r = u.user_type || 'student';
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map).map(([role, count]) => ({
      name: ROLE_LABELS[role] || role,
      value: count,
      role,
    }));
  }, [users]);

  const collegesChartData = useMemo(() =>
    colleges
      .filter(c => c.name !== 'Unassigned')
      .slice(0, 10)
      .map(c => ({ name: c.name.length > 20 ? c.name.slice(0, 18) + '…' : c.name, users: c.users, courses: c.courses })),
  [colleges]);

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(u => {
      if (globalInstId && u.institution_id !== globalInstId) return false;
      const matchRole   = roleFilter === 'all' || u.user_type === roleFilter;
      const matchSearch = !q
        || (u.full_name || '').toLowerCase().includes(q)
        || (u.email   || '').toLowerCase().includes(q)
        || (u.college_name || '').toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [users, search, roleFilter, globalInstId]);

  const handleRoleChange = async (uid, newRole) => {
    if (!window.confirm(`Change role to ${ROLE_LABELS[newRole]}?`)) return;
    setUpdating(uid);
    try {
      await supabase.from('users').update({ user_type: newRole }).eq('id', uid);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, user_type: newRole } : u));
    } catch (err) {
      console.error('Role update error:', err);
    }
    setUpdating(null);
  };

  const handleInstitutionChange = async (uid, instIdStr) => {
    if (!instIdStr) return;
    const [newInstId, newInstName] = instIdStr.split('|');
    if (!window.confirm(`Move to institution: ${newInstName}?`)) return;
    setUpdating(uid);
    try {
      await supabase.from('users').update({ institution_id: newInstId, college_name: newInstName }).eq('id', uid);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, institution_id: newInstId, college_name: newInstName } : u));
    } catch (err) {
      console.error('Institution update error:', err);
    }
    setUpdating(null);
  };

  // ── Pre-Registration Invites ──
  const handleSingleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmails || !inviteInstId) return;
    setInviting(true);
    setInviteMsg('');
    
    const inst = institutions.find(i => i.id === inviteInstId);
    const instName = inst ? inst.name : 'Unknown';

    try {
      const emailList = inviteEmails.split(/[,\n\r]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes('@'));
      let count = 0;
      for (const email of emailList) {
        const inviteData = {
          email,
          user_type: inviteRole,
          institution_id: inviteInstId,
          college_name: instName,
        };
        if (inviteRole === 'student') {
          if (inviteSemester) inviteData.semester = inviteSemester;
          if (inviteDivision) inviteData.division = inviteDivision.trim().toUpperCase();
        }
        const { error: upsertErr } = await supabase.from('role_invitations').upsert(inviteData, { onConflict: 'email' });
        if (upsertErr && upsertErr.message?.includes('division')) {
          delete inviteData.division;
          await supabase.from('role_invitations').upsert(inviteData, { onConflict: 'email' });
        }
        count++;
      }
      setInviteMsg(`Successfully sent ${count} invitation(s).`);
      setInviteEmails('');
      setInviteSemester('');
      setInviteDivision('');
    } catch (err) {
      console.error(err);
      setInviteMsg('Failed to invite users.');
    }
    setInviting(false);
  };

  const handleBulkCSV = async (e) => {
    e.preventDefault();
    if (!bulkFile || !inviteInstId) return;
    setInviting(true);
    setInviteMsg('');

    const inst = institutions.find(i => i.id === inviteInstId);
    const instName = inst ? inst.name : 'Unknown';

    try {
      const text = await bulkFile.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
      let count = 0;
      const inviteRows = [];
      for (const line of lines) {
        const email = line.split(',')[0].trim().toLowerCase();
        if (email.includes('@')) {
          const inviteData = {
            email,
            user_type: inviteRole,
            institution_id: inviteInstId,
            college_name: instName,
          };
          if (inviteRole === 'student') {
            if (inviteSemester) inviteData.semester = inviteSemester;
            if (inviteDivision) inviteData.division = inviteDivision.trim().toUpperCase();
          }
          inviteRows.push(inviteData);
          count++;
        }
      }
      if (inviteRows.length > 0) {
        const { error: upsertErr } = await supabase.from('role_invitations').upsert(inviteRows, { onConflict: 'email' });
        if (upsertErr && upsertErr.message?.includes('division')) {
          const fallbackRows = inviteRows.map(r => { const copy = { ...r }; delete copy.division; return copy; });
          await supabase.from('role_invitations').upsert(fallbackRows, { onConflict: 'email' });
        }
      }
      setInviteMsg(`Successfully invited ${count} users.`);
      setBulkFile(null);
      setInviteSemester('');
      setInviteDivision('');
      document.getElementById('bulk-csv-input').value = '';
    } catch (err) {
      console.error(err);
      setInviteMsg('Failed to process CSV.');
    }
    setInviting(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleInstSelect = (val) => {
    if (val === 'create_new') {
      setShowCreateModal(true);
      setInviteInstId('');
    } else {
      setInviteInstId(val);
    }
  };

  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    if (!newInstName.trim()) return;
    setInviting(true);
    try {
      const { data: newInst, error } = await supabase
        .from('institutions')
        .insert({ name: newInstName.trim() })
        .select()
        .single();
      if (error) throw error;
      setInstitutions(prev => [...prev, { id: newInst.id, name: newInst.name }]);
      setInviteInstId(newInst.id);
      setInviteMsg(`Successfully created institution "${newInstName.trim()}".`);
      setNewInstName('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      setInviteMsg('Failed to create institution.');
    }
    setInviting(false);
  };

  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className="va-container">
      <div className="va-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
         <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="va-header-left">
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>
                Welcome to Velaar{currentUserData?.full_name ? `, ${currentUserData.full_name.split(' ')[0]}!` : '!'}
              </h1>
              <p style={{ color: '#ffffff', fontSize: '1.05rem', margin: '5px 0 0 0' }}>
                Global platform overview — {users.length} users across {colleges.filter(c => c.name !== 'Unassigned').length} institutions
              </p>
            </div>
            <button className="va-exit-btn" onClick={handleLogout}>Sign Out</button>
         </div>
         <div className="va-form-group" style={{ width: '320px', margin: 0 }}>
            <label style={{ color: '#e2e8f0' }}>Select Institution to View Data</label>
            <GlassSelect
              value={globalInstId}
              onChange={(val) => {
                setGlobalInstId(val);
                setInviteInstId(val);
              }}
              placeholder="-- All Institutions --"
              options={[
                { value: '', label: '-- All Institutions --' },
                ...institutions.map(c => ({ value: c.id, label: c.name })),
              ]}
            />
         </div>
      </div>

      {!globalInstId ? (
        <div className="va-empty" style={{ marginTop: '60px', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
          <h2 style={{ color: '#fff', marginBottom: '10px' }}>No Institution Selected</h2>
          <p style={{ color: '#ffffff', fontSize: '1.1rem' }}>Please select an institution from the dropdown above to view data and perform tasks.</p>
        </div>
      ) : (
      <>
      {/* KPI Strip */}
      <div className="va-kpi-strip">
        <div className="va-kpi">
          <div className="va-kpi__icon"><Icons.Users /></div>
          <div className="va-kpi__value">{users.length}</div>
          <div className="va-kpi__label">Total Users</div>
        </div>
        <div className="va-kpi">
          <div className="va-kpi__icon"><Icons.Building /></div>
          <div className="va-kpi__value">{colleges.filter(c => c.name !== 'Unassigned').length}</div>
          <div className="va-kpi__label">Institutions</div>
        </div>
        <div className="va-kpi">
          <div className="va-kpi__icon"><Icons.Users /></div>
          <div className="va-kpi__value">{users.filter(u => u.user_type === 'teacher').length}</div>
          <div className="va-kpi__label">Teachers</div>
        </div>
        <div className="va-kpi">
          <div className="va-kpi__icon"><Icons.Users /></div>
          <div className="va-kpi__value">{users.filter(u => u.user_type === 'student').length}</div>
          <div className="va-kpi__label">Students</div>
        </div>
      </div>

      {/* Charts */}
      {collegesChartData.length > 0 && (
        <div className="va-charts-grid">
          <div className="va-chart-card">
            <p className="va-chart-title">Users & Courses by Institution</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={collegesChartData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="users" name="Users" radius={[6, 6, 0, 0]} fill="#6366f1" />
                <Bar dataKey="courses" name="Courses" radius={[6, 6, 0, 0]} fill="rgba(99,102,241,0.3)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="va-chart-card">
            <p className="va-chart-title">Role Distribution</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {roleDistribution.map((entry) => (
                    <Cell key={entry.role} fill={ROLE_COLORS[entry.role] || PALETTE[0]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ color: '#ffffff', fontSize: 11 }}>{value}</span>}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* User Directory */}
      <div className="va-directory-header" style={{ marginTop: '40px' }}>
        <p className="va-section-title" style={{ margin: 0 }}>
          Global User Directory — {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
        </p>
        <div style={{ display: 'flex', gap: 10, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <div className="va-search-wrapper">
            <Icons.Search />
            <input
              className="va-search-input"
              type="text"
              placeholder="Search by name, email, or college..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <GlassSelect
            style={{ width: '160px' }}
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: 'all', label: 'All Roles' },
              ...Object.entries(ROLE_LABELS).map(([val, label]) => ({ value: val, label })),
            ]}
          />
        </div>
      </div>

      <div className="va-table-wrapper">
        {filteredUsers.length === 0 ? (
          <div className="va-empty">No users match your search.</div>
        ) : (
          <table className="va-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Current Role</th>
                <th>Semester</th>
                <th>Division</th>
                <th>Institution</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const initial = (u.full_name || u.email || '?')[0].toUpperCase();
                const isUpdating = updating === u.uid;
                const canModify = u.uid !== currentUserId; // Don't let Velaar Admin modify themselves here easily

                return (
                  <tr key={u.uid}>
                    <td>
                      <div className="va-user-cell">
                        <div className="va-avatar">{initial}</div>
                        <div>
                          <div className="va-user-name">{u.full_name || '—'}</div>
                          <div className="va-user-email">{u.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><RoleBadge role={u.user_type} /></td>
                    <td>
                      {u.user_type === 'student' ? (
                        <input 
                          type="text" 
                          value={u.semester || ''}
                          onChange={async (e) => {
                            const newSem = e.target.value;
                            setUsers(prev => prev.map(user => user.uid === u.uid ? { ...user, semester: newSem } : user));
                          }}
                          onBlur={async (e) => {
                            try {
                              await supabase.from('users').update({ semester: e.target.value }).eq('id', u.uid);
                            } catch (err) {
                              console.error('Failed to update semester', err);
                            }
                          }}
                          className="va-glass-input"
                          style={{ width: '60px', padding: '4px 8px', fontSize: '0.85rem' }}
                          placeholder="-"
                        />
                      ) : (
                        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {u.user_type === 'student' ? (
                        <input 
                          type="text" 
                          value={u.division || ''}
                          onChange={(e) => {
                            const newDiv = e.target.value.toUpperCase();
                            setUsers(prev => prev.map(user => user.uid === u.uid ? { ...user, division: newDiv } : user));
                          }}
                          onBlur={async (e) => {
                            const cleanDiv = e.target.value.trim().toUpperCase();
                            try {
                              await supabase.from('users').update({ division: cleanDiv }).eq('id', u.uid);
                            } catch (err) {
                              console.error('Failed to update division', err);
                            }
                          }}
                          className="va-glass-input"
                          style={{ width: '60px', padding: '4px 8px', fontSize: '0.85rem' }}
                          placeholder="-"
                        />
                      ) : (
                        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: u.college_name ? '#e2e8f0' : 'rgba(255, 255, 255, 0.7)' }}>
                      {u.college_name || 'Unassigned'}
                    </td>
                    <td>
                      {canModify ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <GlassSelect
                            style={{ width: '130px' }}
                            value={u.user_type || 'student'}
                            disabled={isUpdating}
                            onChange={(newRole) => handleRoleChange(u.uid, newRole)}
                            options={ASSIGNABLE_ROLES.map((val) => ({
                              value: val,
                              label: ROLE_LABELS[val],
                            }))}
                          />

                          <GlassSelect
                            style={{ width: '140px' }}
                            value=""
                            placeholder="Move Org..."
                            disabled={isUpdating}
                            onChange={(val) => handleInstitutionChange(u.uid, val)}
                            options={[
                              { value: '', label: 'Move Org...' },
                              ...colleges.filter(c => c.id !== 'unassigned').map(c => ({
                                value: `${c.id}|${c.name}`,
                                label: c.name,
                              })),
                            ]}
                          />
                        </div>
                      ) : (
                        <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>Self</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Users Section */}
      <div className="va-directory-header" style={{ marginTop: '60px' }}>
        <p className="va-section-title" style={{ margin: 0, color: '#e2e8f0' }}>
          Invite Users & Pre-Registration
        </p>
      </div>
      
      <div className="va-invite-container">
        {inviteMsg && (
          <div className="generation-modal" onClick={() => setInviteMsg('')}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ color: '#10b981', marginBottom: '16px' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2>Success</h2>
              <p style={{ fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '24px' }}>{inviteMsg}</p>
              <button onClick={() => setInviteMsg('')}>Close</button>
            </div>
          </div>
        )}
        
        {showCreateModal && (
          <div className="generation-modal" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }} onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" style={{ width: '520px', maxWidth: '92vw' }} onClick={e => e.stopPropagation()}>
              <h2>Create New Institution</h2>
              <p style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '24px' }}>
                Enter the name of the new institution to add it to the platform.
              </p>
              <form onSubmit={handleCreateInstitution} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input 
                  type="text" 
                  required 
                  className="va-glass-input" 
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '1rem', padding: '12px 16px' }}
                  placeholder="e.g. K.J. Somaiya Institute of Technology"
                  value={newInstName} 
                  onChange={e => setNewInstName(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                  <button type="submit" disabled={inviting} style={{ background: '#fff', color: '#0a0a0f', fontWeight: 700, padding: '10px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                    {inviting ? 'Creating...' : 'Create Institution'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        <div className="va-invite-forms">
          {/* Single Invite */}
          <form className="va-invite-card" onSubmit={handleSingleInvite}>
            <h3 className="va-invite-title">Single Invitation</h3>
            
            <div className="va-form-group">
              <label>Select Institution</label>
              <GlassSelect
                value={inviteInstId}
                placeholder="Select Institution..."
                onChange={handleInstSelect}
                options={[
                  ...institutions.map(c => ({ value: c.id, label: c.name })),
                  { value: 'create_new', label: '+ Create New Institution...' },
                ]}
              />
            </div>
            
            <div className="va-form-group">
              <label>Assign Role</label>
              <GlassSelect
                value={inviteRole}
                onChange={setInviteRole}
                options={ASSIGNABLE_ROLES.map((val) => ({
                  value: val,
                  label: ROLE_LABELS[val],
                }))}
              />
            </div>

            {inviteRole === 'student' && (
              <>
                <div className="va-form-group">
                  <label>Semester</label>
                  <input 
                    type="text" 
                    className="va-glass-input" 
                    placeholder="e.g. 5" 
                    value={inviteSemester} 
                    onChange={e => setInviteSemester(e.target.value)} 
                  />
                </div>
                <div className="va-form-group">
                  <label>Division</label>
                  <input 
                    type="text" 
                    className="va-glass-input" 
                    placeholder="e.g. A" 
                    value={inviteDivision} 
                    onChange={e => setInviteDivision(e.target.value.toUpperCase())} 
                  />
                </div>
              </>
            )}

            <div className="va-form-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <label>User Emails (comma separated)</label>
              <textarea required placeholder="user1@domain.edu, user2@domain.edu" className="va-glass-input" rows="3" style={{ flexGrow: 1, resize: 'none' }} value={inviteEmails} onChange={e => setInviteEmails(e.target.value)} />
            </div>

            <button type="submit" className="va-glass-btn va-glass-btn--neutral" disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invitations'}
            </button>
          </form>

          {/* Bulk CSV Upload */}
          <form className="va-invite-card" onSubmit={handleBulkCSV}>
            <h3 className="va-invite-title">Bulk CSV Upload</h3>
            <p className="va-invite-subtitle">Upload a CSV file containing a single column of email addresses. All users will receive the selected role.</p>
            
            <div className="va-form-group">
              <label>Select Institution</label>
              <GlassSelect
                value={inviteInstId}
                placeholder="Select Institution..."
                onChange={handleInstSelect}
                options={[
                  ...institutions.map(c => ({ value: c.id, label: c.name })),
                  { value: 'create_new', label: '+ Create New Institution...' },
                ]}
              />
            </div>

            <div className="va-form-group">
              <label>Assign Role to All</label>
              <GlassSelect
                value={inviteRole}
                onChange={setInviteRole}
                options={ASSIGNABLE_ROLES.map((val) => ({
                  value: val,
                  label: ROLE_LABELS[val],
                }))}
              />
            </div>

            {inviteRole === 'student' && (
              <>
                <div className="va-form-group">
                  <label>Semester (Applied to all)</label>
                  <input 
                    type="text" 
                    className="va-glass-input" 
                    placeholder="e.g. 5" 
                    value={inviteSemester} 
                    onChange={e => setInviteSemester(e.target.value)} 
                  />
                </div>
                <div className="va-form-group">
                  <label>Division (Applied to all)</label>
                  <input 
                    type="text" 
                    className="va-glass-input" 
                    placeholder="e.g. A" 
                    value={inviteDivision} 
                    onChange={e => setInviteDivision(e.target.value.toUpperCase())} 
                  />
                </div>
              </>
            )}

            <div className="va-form-group">
              <label>CSV File</label>
              <input id="bulk-csv-input" type="file" accept=".csv" required className="va-glass-input va-file-input" onChange={e => setBulkFile(e.target.files[0])} />
            </div>

            <button type="submit" className="va-glass-btn va-glass-btn--neutral" disabled={inviting}>
              {inviting ? 'Processing...' : 'Upload & Invite'}
            </button>
          </form>
        </div>
      </div>
      </>
      )}

    </div>
  );
};

export default VelaarAdminDashboard;
