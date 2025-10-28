import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Toast } from './toast';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, Toast],
  template: `
  <div class="auth">
    <h2>Reset your password</h2>
    <p class="muted">Enter the email address for your account and we'll send instructions to reset your password.</p>
    <form (ngSubmit)="submit()" #f="ngForm" novalidate>
      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" [(ngModel)]="email" #emailCtrl="ngModel" required email class="form-control" />
        <div class="text-danger small" *ngIf="emailCtrl.invalid && (emailCtrl.dirty || emailCtrl.touched)">
          <div *ngIf="emailCtrl.errors?.['required']">Email is required.</div>
          <div *ngIf="emailCtrl.errors?.['email']">Please enter a valid email address.</div>
        </div>
      </div>

      <div *ngIf="error" class="alert alert-danger" aria-live="polite">{{ error }}</div>
      <div *ngIf="success" class="alert alert-success" aria-live="polite">{{ success }}</div>

      <!-- standardized toast -->
      <app-toast *ngIf="toast" [message]="toast" type="success" (closed)="toast = null"></app-toast>

      <div class="form-actions">
        <button class="btn btn-primary" [disabled]="submitting || f.invalid">{{ submitting ? 'Sending…' : 'Send reset instructions' }}</button>
      </div>
    </form>

    <p class="muted small"><a routerLink="/login">Back to login</a></p>
  </div>
  `
})
export class ForgotPassword {
  email = '';
  submitting = false;
  error: string | null = null;
  success: string | null = null;
  toast: string | null = null;
  @ViewChild('f') form?: NgForm;

  constructor(private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {}

  async submit() {
    if (this.submitting) return;
    this.submitting = true;
    this.error = null;
    this.success = null;

    try {
      const email = (this.email || '').trim();
      if (!email) { this.error = 'Email is required'; return; }

      // Call API - backend may or may not implement this; handle gracefully
      console.debug('[forgot] calling requestPasswordReset for', email);
      const res = await this.auth.requestPasswordReset(email);
      console.debug('[forgot] requestPasswordReset result:', res);
      if (!res.ok) {
        // If server returns 404/unavailable, give a helpful message
        if (res.status === 404) {
          this.error = 'Password reset is not available right now.';
        } else {
          this.error = res.body?.error ?? 'Unable to send password reset instructions. Please try again later.';
        }
        return;
      }

      this.success = 'If an account exists for that email, reset instructions have been sent.';
      // Ensure UI updates immediately and show a transient toast so users see confirmation.
      try { this.cdr.detectChanges(); } catch {}
      this.toast = 'Reset instructions were requested — check your email.';
      setTimeout(() => {
        // hide toast then refresh the form to give the user a clean slate
        this.toast = null;
        try { this.cdr.detectChanges(); } catch {}

        // clear model and alerts
        this.email = '';
        this.error = null;
        this.success = null;

        // reset Angular form state (pristine/untouched)
        try { this.form?.resetForm(); } catch {}
        try { this.cdr.detectChanges(); } catch {}
      }, 3000);
    } catch (e) {
      this.error = (e as any)?.message ?? String(e);
    } finally {
      console.debug('[forgot] clearing submitting flag (was)', this.submitting);
      this.submitting = false;
      console.debug('[forgot] submit finished');
    }
  }
}
