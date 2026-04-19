import Cookies from 'js-cookie';
import { authAPI } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  settings: {
    searchModel: string;
    maxResults: number;
    semanticWeight: number;
    keywordWeight: number;
  };
  lastLogin?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// ─── JWT helpers (client-side, no secret needed — just reading the payload) ──

/**
 * Decode a JWT payload without verifying the signature.
 * Verification is always done server-side; this is only used to check expiry
 * on the client so we can proactively clear a stale token.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  // Add a 30-second buffer so we don't use a token that's about to expire
  return payload.exp * 1000 < Date.now() + 30_000;
}

// ─── AuthManager ─────────────────────────────────────────────────────────────

export class AuthManager {
  private static instance: AuthManager;
  private currentUser: User | null = null;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
  ): Promise<{ success: boolean; user: User; token: string }> {
    try {
      const response = await authAPI.login(email, password);
      const data = response.data || response;

      if (data.user && data.token) {
        const { user, token } = data;
        this._persistSession(user, token);
        return { success: true, user, token };
      }

      throw new Error(data.message || 'Login failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  // ── Register ───────────────────────────────────────────────────────────────

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; user: User; token: string }> {
    try {
      const response = await authAPI.register(name, email, password);
      const data = response.data || response;

      if (data.user && data.token) {
        const { user, token } = data;
        this._persistSession(user, token);
        return { success: true, user, token };
      }

      throw new Error(data.message || 'Registration failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    this._clearSession();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
      window.location.href = '/login';
    }
  }

  // ── Get current user (with backend validation) ─────────────────────────────

  async getCurrentUser(): Promise<User | null> {
    const token = Cookies.get('token');

    // No token at all
    if (!token) {
      this._clearSession();
      return null;
    }

    // Token is expired — clear and bail
    if (isTokenExpired(token)) {
      this._clearSession();
      return null;
    }

    // Return cached user if we already have one
    if (this.currentUser) return this.currentUser;

    // Validate against backend
    try {
      const response = await authAPI.getMe();
      // getMe returns { success: true, data: { id, name, email, ... } }
      const user: User = response?.data ?? response;

      if (user && (user.id || (user as any)._id)) {
        // Normalise _id → id in case of raw Mongoose doc
        if (!(user as any).id && (user as any)._id) {
          (user as any).id = (user as any)._id;
        }
        this.currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
    } catch (error: any) {
      // Only clear session on 401 (invalid/expired token)
      // Don't clear on network errors — user might just be offline
      if (error?.response?.status === 401) {
        this._clearSession();
      }
    }

    return null;
  }

  // ── Profile / settings / password ─────────────────────────────────────────

  async updateProfile(data: { name?: string; email?: string }): Promise<User> {
    try {
      const response = await authAPI.updateProfile(data);

      if (response.success) {
        this.currentUser = response.data;
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
      }

      throw new Error(response.message || 'Profile update failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Profile update failed');
    }
  }

  async updateSettings(settings: Partial<User['settings']>): Promise<User['settings']> {
    try {
      const response = await authAPI.updateSettings(settings);

      if (response.success) {
        if (this.currentUser) {
          this.currentUser.settings = { ...this.currentUser.settings, ...settings };
          localStorage.setItem('user', JSON.stringify(this.currentUser));
        }
        return response.data;
      }

      throw new Error(response.message || 'Settings update failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Settings update failed');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await authAPI.changePassword(currentPassword, newPassword);

      if (!response.success) {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Password change failed');
    }
  }

  // ── Synchronous helpers ────────────────────────────────────────────────────

  /**
   * Fast synchronous check — token present + not expired + user in cache.
   * Used by AuthGuard for the initial render decision.
   */
  isAuthenticated(): boolean {
    const token = Cookies.get('token');
    if (!token || isTokenExpired(token)) return false;
    return !!this.getUser();
  }

  getToken(): string | undefined {
    return Cookies.get('token');
  }

  /**
   * Returns user from in-memory cache or localStorage.
   * Does NOT make a network request.
   */
  getUser(): User | null {
    if (!this.currentUser) {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (raw) {
        try {
          this.currentUser = JSON.parse(raw);
        } catch {
          localStorage.removeItem('user');
        }
      }
    }
    return this.currentUser;
  }

  hasRole(role: string): boolean {
    return this.getUser()?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _persistSession(user: User, token: string): void {
    Cookies.set('token', token, {
      expires: 7,
      sameSite: 'lax',
      // secure: true  ← enable in production (HTTPS only)
    });
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  private _clearSession(): void {
    Cookies.remove('token');
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  }

  /** Call once on app boot to hydrate in-memory state from storage. */
  initialize(): void {
    const token = Cookies.get('token');
    if (!token || isTokenExpired(token)) {
      this._clearSession();
      return;
    }

    const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
      } catch {
        this._clearSession();
      }
    }
  }
}

// Convenience singleton export
export const auth = AuthManager.getInstance();
