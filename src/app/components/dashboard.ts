import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface Sandwich { id: number; name: string; description?: string; price?: number | null; toasted?: boolean; ownerUserId?: number | null; isPrivate?: boolean }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section>
    <h2>Your dashboard</h2>

    <p *ngIf="!isLoggedIn">You must be logged in to see your sandwiches. <a routerLink="/login">Login</a></p>

    <div *ngIf="isLoggedIn">
      <div *ngIf="loading" class="muted">Loading…</div>

      <div *ngIf="!loading && sandwiches.length === 0" class="empty-state">You haven't created any sandwiches yet. <a routerLink="/builder" class="btn btn-primary">Create one</a></div>

      <div *ngIf="!loading && sandwiches.length > 0" class="table-wrapper">
        <table class="sandwich-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th class="col-price">Price</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of sandwiches">
              <td><strong>{{ s.name }}</strong></td>
              <td>
                <div *ngIf="s.description; else noDesc">
                  <div class="desc-block">{{ s.description }}</div>
                </div>
                <ng-template #noDesc>—</ng-template>
              </td>
              <td class="col-price">
                <span *ngIf="s.price != null">{{ '$' + (s.price.toFixed(2)) }}</span>
                <span *ngIf="s.price == null">—</span>
              </td>
              <td class="col-actions">
                <a *ngIf="canEdit(s)" [routerLink]="['/builder']" [queryParams]="{ id: s.id }" class="icon-btn" title="Edit {{s.name}}">
                  <!-- pencil icon -->
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" fill="currentColor"/></svg>
                </a>
                <button *ngIf="canEdit(s)" class="icon-btn icon-delete" (click)="deleteSandwich(s.id)" title="Delete {{s.name}}">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
  `
})
export class Dashboard {
  sandwiches: Sandwich[] = [];
  loading = false;
  currentUserId: number | null = null;
  get isLoggedIn() { return this.currentUserId != null; }

  constructor(private cdr: ChangeDetectorRef, private auth: AuthService) {
    try { this.currentUserId = this.auth.getCurrentUserId(); } catch { this.currentUserId = null; }
    if (this.isLoggedIn) this.load();
  }

  async load() {
    this.loading = true;
    try {
      const headers: Record<string,string> = { 'Accept': 'application/json' };
      const t = localStorage.getItem('auth_token');
      if (t) headers['Authorization'] = 'Bearer ' + t;
      const res = await fetch('/api/sandwiches/mine', { headers });
      if (!res.ok) {
        this.sandwiches = [];
      } else {
        this.sandwiches = await res.json().catch(() => []);
      }
    } catch (e) {
      this.sandwiches = [];
    } finally {
      this.loading = false;
      try { this.cdr.detectChanges(); } catch {}
    }
  }

  canEdit(s: Sandwich) {
    if (!s) return false;
    // if not private, allowed; if private, only owner
    if (!s.isPrivate) return true;
    if (s.ownerUserId != null && this.currentUserId != null) return s.ownerUserId === this.currentUserId;
    return false;
  }

  async deleteSandwich(id: number) {
    try {
      const headers: Record<string,string> = { 'Accept': 'application/json' };
      const t = localStorage.getItem('auth_token');
      if (t) headers['Authorization'] = 'Bearer ' + t;
      const res = await fetch('/api/sandwiches/' + id, { method: 'DELETE', headers });
      if (res.ok) {
        this.sandwiches = this.sandwiches.filter(x => x.id !== id);
        try { this.cdr.detectChanges(); } catch {}
      } else if (res.status === 403) {
        alert('You do not have permission to delete this sandwich.');
      } else {
        alert('Failed to delete sandwich');
      }
    } catch (e) {
      alert('Failed to delete sandwich');
    }
  }
}
