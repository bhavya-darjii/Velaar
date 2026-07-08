import React from 'react';
import { auth } from '../../services/firebase';
import './TeacherProfile.css';

const TeacherProfile = () => {
  const user = auth.currentUser;

  const actionCards = [
    { title: 'Class Teacher Dashboard' },
    { title: 'Proctor Dashboard' },
    { title: 'Subject Coordinator' },
    { title: 'Event Coordinator' },
    { title: 'Missed Attendance' },
    { title: 'Update Password' }
  ];

  return (
    <div className="teacher-profile-container">
      <div className="profile-center-card glass">
        
        {/* Header / Avatar Section */}
        <div className="profile-top">
          <div className="profile-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '👤'}
              </div>
            )}
          </div>
          <div className="profile-details">
            <h3>Faculty Profile</h3>
            <p className="profile-name">Prof. {user?.displayName || 'Faculty Member'}</p>
            <p className="profile-info">{user?.email}</p>
            <div className="profile-badge-group">
              <span className="profile-badge">Artificial Intelligence and Data Science</span>
              <span className="profile-badge">K.J. Somaiya Institute of Technology</span>
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
