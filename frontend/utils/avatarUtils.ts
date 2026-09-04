/* eslint-disable */
// @ts-nocheck

/**
 * Utility to extract Google Account avatar URL from Supabase user / session
 * Checks all possible locations Supabase and Google OAuth place the profile image
 */
export const extractGoogleAvatarUrl = (user) => {
  if (!user) return null;

  // 1. Direct user_metadata fields
  if (user.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
  if (user.user_metadata?.picture) return user.user_metadata.picture;
  if (user.user_metadata?.photo_url) return user.user_metadata.photo_url;
  if (user.user_metadata?.avatarUrl) return user.user_metadata.avatarUrl;

  // 2. Identities array (Google provider)
  if (Array.isArray(user.identities)) {
    const googleIdentity = user.identities.find((id) => id.provider === 'google');
    if (googleIdentity?.identity_data) {
      if (googleIdentity.identity_data.avatar_url) return googleIdentity.identity_data.avatar_url;
      if (googleIdentity.identity_data.picture) return googleIdentity.identity_data.picture;
      if (googleIdentity.identity_data.photo_url) return googleIdentity.identity_data.photo_url;
    }

    // Fallback to any identity data
    for (const identity of user.identities) {
      if (identity.identity_data?.avatar_url) return identity.identity_data.avatar_url;
      if (identity.identity_data?.picture) return identity.identity_data.picture;
    }
  }

  return null;
};

const STORAGE_AVATAR_KEY = 'velaar_teacher_avatar';
const STORAGE_PROFILE_KEY = 'velaar_teacher_profile';

/**
 * Get cached Google avatar from localStorage synchronously (0ms delay)
 */
export const getCachedTeacherAvatar = () => {
  try {
    return localStorage.getItem(STORAGE_AVATAR_KEY) || '';
  } catch {
    return '';
  }
};

/**
 * Persist Google avatar URL to localStorage
 */
export const cacheTeacherAvatar = (url) => {
  if (!url) return;
  try {
    const current = localStorage.getItem(STORAGE_AVATAR_KEY);
    if (current !== url) {
      localStorage.setItem(STORAGE_AVATAR_KEY, url);
      window.dispatchEvent(new CustomEvent('velaar_avatar_changed', { detail: { avatarUrl: url } }));
    }
  } catch (err) {
    console.warn('Failed to cache avatar URL:', err);
  }
};

/**
 * Get cached profile data from localStorage synchronously
 */
export const getCachedTeacherProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Persist profile data to localStorage
 */
export const cacheTeacherProfile = (profile) => {
  if (!profile) return;
  try {
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed to cache profile data:', err);
  }
};
