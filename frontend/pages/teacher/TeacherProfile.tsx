/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  extractGoogleAvatarUrl,
  getCachedTeacherAvatar,
  cacheTeacherAvatar,
  getCachedTeacherProfile,
  cacheTeacherProfile
} from '../../utils/avatarUtils';
import './TeacherProfile.css';

const TeacherProfile = () => {
  // Synchronous initial state from persistent local cache (0ms delay - never blank)
  const [avatarUrl, setAvatarUrl] = useState(() => getCachedTeacherAvatar());
  const [profile, setProfile] = useState(() => {
    const cached = getCachedTeacherProfile();
    return cached || {
      name: '',
      email: '',
      department: 'Artificial Intelligence and Data Science',
      collegeName: 'K.J. Somaiya Institute of Technology'
    };
  });
  const [user, setUser] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Sync Google Account image and profile data from Supabase Auth & DB
  useEffect(() => {
    let mounted = true;

    const loadProfileData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        if (mounted) setUser(session.user);

        // 1. Resolve Google Account Photo URL
        const googlePhoto = extractGoogleAvatarUrl(session.user);
        if (googlePhoto) {
          if (mounted) {
            setAvatarUrl(googlePhoto);
            setImgError(false);
          }
          cacheTeacherAvatar(googlePhoto);
        }

        // 2. Fetch user profile from database
        const { data: dbUser } = await supabase
          .from('users')
          .select('full_name, email, department, college_name')
          .eq('id', session.user.id)
          .single();

        const resolvedName = dbUser?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
        const resolvedEmail = session.user.email || dbUser?.email || '';
        const resolvedDept = dbUser?.department || 'Artificial Intelligence and Data Science';
        const resolvedCollege = dbUser?.college_name || 'K.J. Somaiya Institute of Technology';

        const updatedProfile = {
          name: resolvedName,
          email: resolvedEmail,
          department: resolvedDept,
          collegeName: resolvedCollege
        };

        if (mounted) {
          setProfile(updatedProfile);
        }
        cacheTeacherProfile(updatedProfile);

      } catch (err) {
        console.error('Error loading teacher profile:', err);
      }
    };

    loadProfileData();

    // Listen for auth state changes (e.g. token refresh or account update)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const newGooglePhoto = extractGoogleAvatarUrl(session.user);
        if (newGooglePhoto) {
          if (mounted) {
            setAvatarUrl(newGooglePhoto);
            setImgError(false);
          }
          cacheTeacherAvatar(newGooglePhoto);
        }
      }
    });

    // Listen for custom avatar update event across the application
    const handleAvatarChange = (e) => {
      if (e.detail?.avatarUrl && mounted) {
        setAvatarUrl(e.detail.avatarUrl);
        setImgError(false);
      }
    };
    window.addEventListener('velaar_avatar_changed', handleAvatarChange);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('velaar_avatar_changed', handleAvatarChange);
    };
  }, []);

  const actionCards = [
    { title: 'Class Teacher Dashboard' },
    { title: 'Proctor Dashboard' },
    { title: 'Subject Coordinator' },
    { title: 'Event Coordinator' },
    { title: 'Missed Attendance' },
    { title: 'Update Password' }
  ];

  const displayName = profile.name || user?.user_metadata?.full_name || 'Faculty Member';
  const initialLetter = displayName ? displayName.replace(/^Prof\.?\s*/i, '').charAt(0).toUpperCase() : 'P';

  return (
    <div className="teacher-profile-container">
      <div className="profile-center-card glass">
        
        {/* Header / Avatar Section */}
        <div className="profile-top">
          <div className="profile-avatar">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={`profile-avatar-img ${imgLoaded ? 'loaded' : 'loading'}`}
              />
            ) : (
              <div className="avatar-placeholder">
                {initialLetter}
              </div>
            )}
          </div>
          <div className="profile-details">
            <h3>Faculty Profile</h3>
            <p className="profile-name">Prof. {displayName}</p>
            <p className="profile-info">{profile.email || user?.email || ''}</p>
            <div className="profile-badge-group">
              <span className="profile-badge">{profile.department}</span>
              <span className="profile-badge">{profile.collegeName}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="action-buttons-grid">
          {actionCards.map((card, index) => (
            <button key={index} className="btn-generate profile-action-btn">
              {card.title}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default TeacherProfile;
