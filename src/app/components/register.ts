import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth">
      <h2>Register</h2>
      <form (ngSubmit)="submit()" #f="ngForm" novalidate>
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" [(ngModel)]="email" #emailCtrl="ngModel" required email class="form-control" />
          <div class="text-danger small" *ngIf="emailCtrl.invalid && (emailCtrl.dirty || emailCtrl.touched)">
            <div *ngIf="emailCtrl.errors?.['required']">Email is required.</div>
            <div *ngIf="emailCtrl.errors?.['email']">Please enter a valid email address.</div>
          </div>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-row">
            <input id="password" [type]="showPassword ? 'text' : 'password'" name="password" [(ngModel)]="password" #passwordCtrl="ngModel" required minlength="8" class="form-control" />
            <button type="button" class="password-toggle" (click)="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
          </div>
          <div class="text-danger small" *ngIf="passwordCtrl.invalid && (passwordCtrl.dirty || passwordCtrl.touched)">
            <div *ngIf="passwordCtrl.errors?.['required']">Password is required.</div>
            <div *ngIf="passwordCtrl.errors?.['minlength']">Password must be at least 8 characters.</div>
          </div>
          <div class="password-hint small muted">Password strength: <strong>{{ passwordStrengthLabel() }}</strong></div>
        </div>
        <div class="form-group">
          <label for="confirm">Confirm password</label>
          <input id="confirm" type="password" name="confirm" [(ngModel)]="confirmPassword" #confirmCtrl="ngModel" required class="form-control" />
          <div class="text-danger small" *ngIf="confirmPassword && confirmPassword !== password">Passwords do not match.</div>
        </div>
        <div *ngIf="error" class="alert alert-danger" aria-live="polite">{{ error }}</div>
        <div *ngIf="success" class="alert alert-success" aria-live="polite">{{ success }}</div>
        <button class="btn btn-primary" [disabled]="submitting || f.invalid">{{ submitting ? 'Registering…' : 'Register' }}</button>
      </form>
    </div>
  `
})
export class Register {
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  submitting = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  async submit() {
    if (this.submitting) return;
    
    // Reset status
    this.submitting = true;
    this.error = null;
    this.success = null;

    try {
      const email = (this.email || '').trim();
      const password = (this.password || '').trim();
      const confirm = (this.confirmPassword || '').trim();

      // Frontend validation
      if (!email) {
        this.error = 'Email is required';
        return;
      }
      if (!password) {
        this.error = 'Password is required';
        return;
      }
      if (password.length < 8) {
        this.error = 'Password must be at least 8 characters';
        return;
      }
      if (password !== confirm) {
        this.error = 'Passwords do not match';
        return;
      }

      // Call register endpoint
      const res = await this.auth.register(email, password);
      
      if (!res.ok) {
        // Handle specific error cases
        switch (res.status) {
          case 400:
            this.error = res.body?.error ?? 'Invalid registration details';
            break;
          case 503:
            this.error = 'Server is currently unavailable. Please try again later.';
            break;
          default:
            this.error = res.body?.error ?? 'Registration failed. Please try again.';
        }
        return;
      }

      // Success case
      this.success = 'Registration successful! Redirecting to login...';
      await new Promise(resolve => setTimeout(resolve, 900));
      this.router.navigate(['/login']);
    } catch (e) {
      console.error('Registration error:', e);
      this.error = 'An unexpected error occurred. Please try again.';
    } finally {
      this.submitting = false;
    }
  }

  // Simple, client-side password strength label for guidance only
  passwordStrengthLabel() {
    const s = this.password || '';
    let score = 0;
    if (s.length >= 8) score++;
    if (/[A-Z]/.test(s)) score++;
    if (/[0-9]/.test(s)) score++;
    if (/[^A-Za-z0-9]/.test(s)) score++;
    if (score <= 1) return 'weak';
    if (score === 2) return 'fair';
    if (score === 3) return 'good';
    return 'strong';
  }
}
