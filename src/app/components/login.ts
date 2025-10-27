import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="auth">
    <h2>Login</h2>
    <form (ngSubmit)="submit()" #f="ngForm" novalidate>
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autocomplete="username"
          [(ngModel)]="email"
          #emailCtrl="ngModel"
          required
          email
          class="form-control"
          autofocus
          [attr.aria-invalid]="emailCtrl.invalid && (emailCtrl.dirty || emailCtrl.touched) ? 'true' : null"
        />
        <div id="email-help" class="text-danger small" *ngIf="emailCtrl.invalid && (emailCtrl.dirty || emailCtrl.touched)">
          <div *ngIf="emailCtrl.errors?.['required']">Email is required.</div>
          <div *ngIf="emailCtrl.errors?.['email']">Please enter a valid email address.</div>
        </div>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <div class="password-row">
          <input
            id="password"
            name="password"
            [type]="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            [(ngModel)]="password"
            #passwordCtrl="ngModel"
            required
            minlength="8"
            class="form-control"
            [attr.aria-invalid]="passwordCtrl.invalid && (passwordCtrl.dirty || passwordCtrl.touched) ? 'true' : null"
          />
          <button type="button" class="password-toggle" (click)="showPassword = !showPassword" [attr.aria-pressed]="showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
        </div>
        <div class="text-danger small" *ngIf="passwordCtrl.invalid && (passwordCtrl.dirty || passwordCtrl.touched)">
          <div *ngIf="passwordCtrl.errors?.['required']">Password is required.</div>
          <div *ngIf="passwordCtrl.errors?.['minlength']">Password must be at least 8 characters.</div>
        </div>
      </div>

      <div *ngIf="error" class="alert alert-danger" aria-live="polite">{{ error }}</div>
      <div class="form-actions">
        <button class="btn btn-primary" [disabled]="submitting || f.invalid">{{ submitting ? 'Logging in…' : 'Log in' }}</button>
      </div>
    </form>
    <p *ngIf="showRegisterSuggestion" class="muted">Don't have an account? <a routerLink="/register">Create one</a></p>

    <div *ngIf="requiresMfa" class="mfa">
      <h3>MFA required</h3>
      <label>Code</label>
      <input [(ngModel)]="mfaCode" />
      <button (click)="verifyMfa()">Verify</button>
    </div>
  </div>
  `
})
export class Login {
  email = '';
  password = '';
  showPassword = false;
  error: string | null = null;
  submitting = false;
  showRegisterSuggestion = false;

  requiresMfa = false;
  mfaToken: string | null = null;
  mfaCode = '';

  constructor(
    private auth: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async submit() {
    if (this.submitting) return;
    
    try {
      this.submitting = true;
      this.error = null;
      this.showRegisterSuggestion = false;

      const email = (this.email || '').trim();
      const password = (this.password || '').trim();

      console.debug('[login] Attempting login for:', email);
      const res = await this.auth.login(email, password);
      console.debug('[login] response status', res.status, res);

      if (!res.ok) {
        console.debug('[login] Login failed:', res);
        if (res.status === 401) {
          this.error = res.body?.error ?? 'That email and password didn\'t match. Try again or register a new account.';
          this.showRegisterSuggestion = true;
        } else if (res.status === 429) {
          this.error = 'Too many attempts. Please wait a minute and try again.';
        } else if (res.status === 0) {
          this.error = 'Network error — please check your connection.';
        } else if (res.status >= 500) {
          this.error = 'Something went wrong on our side. Please try again.';
        } else {
          this.error = res.body?.error ?? 'Login failed.';
        }
        this.cdr.detectChanges();
        return;
      }

      if (res.body?.requiresMfa) {
        this.requiresMfa = true;
        this.mfaToken = res.body.mfaToken;
        return;
      }

      if (res.body?.token) {
        this.auth.setToken(res.body.token);
        await this.router.navigate(['/sandwiches']);
        return;
      }

      this.error = 'Login failed';
    } catch (e) {
      this.error = (e as any)?.message ?? String(e);
      this.cdr.detectChanges();
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  async verifyMfa() {
    try {
      if (!this.mfaToken) return;
      const res = await this.auth.verifyMfa(this.mfaToken, this.mfaCode);
      if (!res.ok) { this.error = res.body?.error ?? 'MFA failed'; return; }
      if (res.body?.token) { this.auth.setToken(res.body.token); await this.router.navigate(['/sandwiches']); }
    } catch (e) { this.error = (e as any)?.message ?? String(e); }
  }
}
