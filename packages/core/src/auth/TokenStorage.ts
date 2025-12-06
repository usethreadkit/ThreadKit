import type { TokenStorage } from '../types';

/**
 * Browser localStorage implementation of TokenStorage.
 * Use this for client-side applications.
 */
export class BrowserTokenStorage implements TokenStorage {
  private tokenKey: string;
  private refreshKey: string;

  constructor(
    tokenKey = 'threadkit_token',
    refreshKey = 'threadkit_refresh_token'
  ) {
    this.tokenKey = tokenKey;
    this.refreshKey = refreshKey;
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.tokenKey, token);
  }

  getRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.refreshKey);
  }

  setRefreshToken(token: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.refreshKey, token);
  }

  clear(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
  }
}

/**
 * In-memory token storage for testing or SSR.
 */
export class MemoryTokenStorage implements TokenStorage {
  private token: string | null = null;
  private refreshToken: string | null = null;

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  clear(): void {
    this.token = null;
    this.refreshToken = null;
  }
}
