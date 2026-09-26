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

const getAdminEndpoint = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) {
    return `/api/admin${cleanPath}`;
  }
  if (base.endsWith('/api')) {
    return `${base}/admin${cleanPath}`;
  }
  return `${base}/api/admin${cleanPath}`;
};

export const adminInviteUsers = async (payload: InvitePayload) => {
  const url = getAdminEndpoint('/invite-user');
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
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
  const url = getAdminEndpoint(`/user/${userId}`);
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
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
    const url = getAdminEndpoint('/claim-invite');
    const headers = await getAuthHeaders();

    let response = await fetch(url, {
      method: 'POST',
      headers,
    });

    // Fallback if production base has different routing
    if (response.status === 404) {
      const base = getApiBaseUrl();
      const fallbackUrl = `${base}/admin/claim-invite`;
      if (fallbackUrl !== url) {
        response = await fetch(fallbackUrl, { method: 'POST', headers });
      }
    }

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
  const url = getAdminEndpoint('/users');
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Fetch users failed with status ${response.status}`);
  }

  return response.json();
};
