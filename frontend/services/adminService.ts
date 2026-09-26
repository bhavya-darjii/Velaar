import { supabase } from './supabase';
import { getApiBaseUrl } from './apiConfig';

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface InvitePayload {
  email?: string;
  emails?: string[];
  user_type: string;
  institution_id?: string | null;
  college_name?: string | null;
  semester?: string | null;
  division?: string | null;
}

export interface UpdateUserPayload {
  user_type?: string;
  institution_id?: string | null;
  college_name?: string | null;
  semester?: string | null;
  division?: string | null;
  department?: string | null;
}

export const adminInviteUsers = async (payload: InvitePayload) => {
  const base = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${base}/admin/invite-user`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Invitation failed with status ${response.status}`);
  }

  return response.json();
};

export const adminUpdateUser = async (userId: string, payload: UpdateUserPayload) => {
  const base = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${base}/admin/user/${userId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Update failed with status ${response.status}`);
  }

  return response.json();
};

export const claimRoleInvite = async () => {
  try {
    const base = getApiBaseUrl();
    const headers = await getAuthHeaders();

    const response = await fetch(`${base}/admin/claim-invite`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `Claim failed with status ${response.status}` };
    }

    const data = await response.json();
    return { success: true, ...data };
  } catch (err: any) {
    console.warn('[claimRoleInvite] failed:', err);
    return { success: false, error: err.message || 'Network error' };
  }
};

export const adminFetchAllUsers = async () => {
  const base = getApiBaseUrl();
  const headers = await getAuthHeaders();

  const response = await fetch(`${base}/admin/users`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Fetch users failed with status ${response.status}`);
  }

  return response.json();
};
