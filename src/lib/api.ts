// ── HTTP client for the E-Permit backend ──────────────────────────────
// Backend response envelopes (see TransformInterceptor / HttpExceptionFilter):
//   Success: { success: true,  data }
//   Error:   { success: false, statusCode, message }
// The success envelope is stripped here — callers get `data` directly.
//
// Tokens live in module scope and are managed by auth.tsx via the setter
// below, so the API layer attaches the Authorization header without a
// circular import.

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Role codes mirror the backend `RoleCode` enum. */
export type RoleCode =
  | 'super_admin'
  | 'org_admin'
  | 'supervisor_subcon'
  | 'supervisor_maincon'
  | 'hse_maincon'
  | 'cm_maincon'
  | 'unassigned';

export type AuthRole = { id: string; code: RoleCode; name: string };

export type SessionUser = {
  id: string;
  organizationId: string;
  roleId: string;
  name: string;
  email: string;
  phone: string | null;
  role: AuthRole;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

export type RegisterResponse = {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
};

export type CreateOrganizationPayload = {
  organizationName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone: string;
};

export type CreateOrganizationResponse = {
  organization: { id: string; name: string; code: string };
  admin: SessionUser;
  promoted: boolean;
};

export type JoinOrganizationPayload = {
  inviteToken: string;
  name: string;
  password: string;
  phone: string;
};

// ---- User management (Org Admin) ----

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleCode: RoleCode | null;
  roleName: string | null;
  verificationStatus: string;
  status: string;
  createdAt: string;
};

export type ListUsersResponse = {
  users: AdminUser[];
};

export type ResolvedRegistrationLink = {
  organization: { id: string; name: string } | null;
  subconCompanies: Array<{ id: string; name: string }>;
};

// ---- Profile + signature ----

export type ProfilePayload = {
  name?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  /** Base64 data URL from canvas.toDataURL() — the manual draw path. */
  signature?: string;
};

export type ProfileResponse = {
  user: SessionUser | null;
  signatureUrl: string | null;
  profile: { jobTitle: string | null; defaultSignatureUrl: string | null } | null;
};

export type EvidenceType = 'SITE_MAP' | 'EQUIPMENT' | 'OTHER';

export type EvidenceItem = {
  id: string;
  permitId: string;
  evidenceType: EvidenceType;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  url: string;
  createdAt: string;
};

// ---- Base URL -----------------------------------------------------------
function getBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_TARGET as string | undefined) ?? '';
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

// ---- Token plumbing (set by AuthProvider) ------------------------------
let accessToken: string | null = null;
let accessTokenGetter: (() => string | null) | null = null;

/** auth.tsx binds the live access token; called on every request. */
export function setAccessTokenGetter(getter: () => string | null): void {
  accessTokenGetter = getter;
}

/** Direct token setter used by tests / fallback when no getter is bound. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function currentAccessToken(): string | null {
  return accessTokenGetter ? accessTokenGetter() : accessToken;
}

// ---- 401 → silent refresh ---------------------------------------------
// Single-flight: concurrent 401s trigger one refresh, then retry in flight.
let refreshing: Promise<boolean> | null = null;
let refreshHandler: (() => Promise<boolean>) | null = null;

/** auth.tsx mounts its refresh routine so this layer stays token-agnostic. */
export function setRefreshHandler(handler: (() => Promise<boolean>) | null): void {
  refreshHandler = handler;
}

type SuccessEnvelope<T> = { success: true; data: T };
type ErrorEnvelope = { success: false; statusCode: number; message: string | string[] };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;

  const headers: Record<string, string> = {
    // For multipart/form-data, let the browser set the boundary — do NOT set
    // Content-Type manually, otherwise the server rejects the upload.
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init.headers as Record<string, string> | undefined),
  };

  const attachToken = (target: Record<string, string>) => {
    const token = currentAccessToken();
    if (token) target.Authorization = `Bearer ${token}`;
  };
  attachToken(headers);

  const url = `${getBaseUrl()}${path}`;
  let res = await fetch(url, { ...init, headers });

  // On 401, attempt one silent refresh, then retry the request.
  if (res.status === 401 && refreshHandler && !refreshing) {
    refreshing = refreshHandler().finally(() => {
      refreshing = null;
    });
    const ok = await refreshing;
    if (ok) {
      const retryHeaders = { ...headers };
      attachToken(retryHeaders);
      res = await fetch(url, { ...init, headers: retryHeaders });
    }
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = body as ErrorEnvelope | null;
    const message = Array.isArray(envelope?.message)
      ? envelope!.message.join(', ')
      : envelope?.message ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  const success = body as SuccessEnvelope<T>;
  return success.data;
}

/** Fetches a binary asset (image bytes) with the auth header attached. */
export async function fetchBlob(path: string): Promise<Blob> {
  const token = currentAccessToken();
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new ApiError(`Gagal memuat file (${res.status})`, res.status);
  }
  return res.blob();
}

// ---- Auth endpoints ----------------------------------------------------
export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async refresh(refreshToken: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  async logout(refreshToken: string): Promise<void> {
    // Best-effort: the client clears its local session regardless.
    try {
      await request<{ message: string }>('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      /* ignore */
    }
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    return request<RegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createOrganization(payload: CreateOrganizationPayload): Promise<CreateOrganizationResponse> {
    return request<CreateOrganizationResponse>('/api/v1/organizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async joinOrganization(payload: JoinOrganizationPayload): Promise<RegisterResponse> {
    return request<RegisterResponse>('/api/v1/organizations/join', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resolveRegistrationLink(token: string): Promise<ResolvedRegistrationLink> {
    return request<ResolvedRegistrationLink>(
      `/api/v1/auth/registration-links/${encodeURIComponent(token)}`,
    );
  },

  async listUsers(organizationId: string): Promise<ListUsersResponse> {
    return request<ListUsersResponse>(`/api/v1/organizations/${organizationId}/users`);
  },

  async updateUserRole(organizationId: string, userId: string, roleId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/v1/organizations/${organizationId}/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ roleId }),
    });
  },

  // ---- Profile / signature ----

  async getProfile(): Promise<ProfileResponse> {
    return request<ProfileResponse>('/api/v1/profile');
  },

  /** JSON path: profile fields + base64 `signature` (canvas draw). */
  async updateProfileJson(payload: ProfilePayload): Promise<ProfileResponse> {
    return request<ProfileResponse>('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /** Multipart path: profile fields + `file` (file picker). */
  async updateProfileMultipart(
    payload: ProfilePayload,
    file: File,
  ): Promise<ProfileResponse> {
    const fd = new FormData();
    if (payload.name) fd.append('name', payload.name);
    if (payload.email) fd.append('email', payload.email);
    if (payload.phone) fd.append('phone', payload.phone);
    if (payload.jobTitle) fd.append('jobTitle', payload.jobTitle);
    fd.append('file', file);
    return request<ProfileResponse>('/api/v1/profile', { method: 'PUT', body: fd });
  },

  // ---- Permit evidence ----

  /**
   * Uploads multiple evidence files for a permit.
   * `files` aligned by index with `types` (e.g. SITE_MAP, EQUIPMENT).
   */
  async uploadEvidences(
    permitId: string,
    files: File[],
    types: EvidenceType[],
  ): Promise<{ message: string; evidences: EvidenceItem[] }> {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    const typesParam = encodeURIComponent(JSON.stringify(types));
    return request<{ message: string; evidences: EvidenceItem[] }>(
      `/api/v1/permits/${permitId}/evidences?types=${typesParam}`,
      { method: 'POST', body: fd },
    );
  },

  async listEvidences(
    permitId: string,
    evidenceType?: EvidenceType,
  ): Promise<{ evidences: EvidenceItem[] }> {
    const q = evidenceType ? `?evidenceType=${evidenceType}` : '';
    return request<{ evidences: EvidenceItem[] }>(`/api/v1/permits/${permitId}/evidences${q}`);
  },
};
