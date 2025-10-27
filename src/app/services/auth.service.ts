import { Injectable } from '@angular/core';

export type ApiResult<T = any> = { ok: boolean; status: number; body: T | null; bodyText: string | null };

@Injectable({ providedIn: 'root' })
export class AuthService {
	constructor() {}

	/** Check whether an email address already exists on the server. */
	async exists(email: string): Promise<boolean> {
		try {
			const url = `http://localhost:5251/api/auth/exists?email=${encodeURIComponent(email)}`;
			const res = await this.fetchWithTimeout(url, { method: 'GET', headers: { 'Accept': 'application/json' } }, 5000);
			if (!res.ok) return false;
			const text = await res.text();
			try { const body = text ? JSON.parse(text) : null; return !!body?.exists; } catch { return false; }
		} catch (e) {
			console.debug('[auth] exists check failed', e);
			return false;
		}
	}

	private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 5000): Promise<Response> {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), timeoutMs);
		try {
			console.debug('[auth] Sending request to:', url, { ...options, body: '***' });
			const response = await fetch(url, { ...options, signal: controller.signal });
			console.debug('[auth] Received response:', response.status);
			return response;
		} finally {
			clearTimeout(id);
		}
	}

	private async parseResponse(res: Response) {
		let text: string | null = null;
		let body: any = null;
		try {
			text = await res.text();
			console.debug('[auth] Raw response text:', text);
			try { 
				body = text ? JSON.parse(text) : null; 
			} catch (e) { 
				console.debug('[auth] Failed to parse response:', text, e); 
			}
		} catch (e) { 
			console.debug('[auth] Failed to read response:', e); 
		}
		const result = { ok: res.ok, status: res.status, body, bodyText: text } as ApiResult;
		console.debug('[auth] Final parsed response:', result);
		return result;
	}

	async register(email: string, password: string): Promise<ApiResult> {
		try {
			// Validate input before sending
			if (!email || !email.trim()) {
				return { ok: false, status: 400, body: { error: 'Email is required' }, bodyText: 'Email is required' };
			}
			if (!password || password.length < 8) {
				return { ok: false, status: 400, body: { error: 'Password must be at least 8 characters' }, bodyText: 'Password must be at least 8 characters' };
			}

			email = email.trim().toLowerCase();
			const res = await this.fetchWithTimeout('http://localhost:5251/api/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({ email, password })
			});

			const result = await this.parseResponse(res);
			
			// Handle specific error cases
			if (!result.ok) {
				// Treat 409 Conflict (or 400 in older server) as 'already registered'
				if ((result.status === 400 || result.status === 409) && result.body?.error === 'email already registered') {
					return { ...result, body: { error: 'This email is already registered' } };
				}
			}
			
			return result;
		} catch (t) {
			console.error('Registration error:', t);
			if ((t as any)?.message?.includes('Failed to fetch')) {
				return { 
					ok: false, 
					status: 503, 
					body: { error: 'Unable to connect to the server. Please try again.' },
					bodyText: 'Connection error'
				};
			}
			return {
				ok: false,
				status: 0,
				body: { error: (t as any)?.message ?? String(t) },
				bodyText: String(t)
			};
		}
	}

	async login(email: string, password: string): Promise<ApiResult> {
		try {
			const res = await this.fetchWithTimeout('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ email, password }) }, 5000);
			return await this.parseResponse(res);
		} catch (t) {
			return { ok: false, status: 0, body: { error: (t as any)?.message ?? String(t) }, bodyText: String(t) };
		}
	}

	async verifyMfa(mfaToken: string, code: string): Promise<ApiResult> {
		try {
			const res = await this.fetchWithTimeout('/api/auth/mfa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ mfaToken, code }) });
			return await this.parseResponse(res);
		} catch (t) {
			return { ok: false, status: 0, body: { error: (t as any)?.message ?? String(t) }, bodyText: String(t) };
		}
	}

	setToken(token: string) { localStorage.setItem('auth_token', token); }
	getToken(): string | null { return localStorage.getItem('auth_token'); }
	logout() { localStorage.removeItem('auth_token'); }
}
