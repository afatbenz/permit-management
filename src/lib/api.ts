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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  const attachToken = (target: Record<string, string>) => {
    const token = currentAccessToken();
    if (token) target.Authorization = `Bearer ${token}`;
  };
  attachToken(headers);

  let res = await fetch(path, { ...init, headers });

  // On 401, attempt one silent refresh, then retry the request.
  if (res.status === 401 && refreshHandler && !refreshing) {
    refreshing = refreshHandler().finally(() => {
      refreshing = null;
    });
    const ok = await refreshing;
    if (ok) {
      const retryHeaders = { ...headers };
      attachToken(retryHeaders);
      res = await fetch(path, { ...init, headers: retryHeaders });
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
};
