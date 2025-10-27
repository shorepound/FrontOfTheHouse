import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Sandwich { id: number; name: string; description?: string; price?: number | null; toasted?: boolean }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="container">
    <h2>Your dashboard</h2>
    <p *ngIf="!authToken">You must be logged in to see your sandwiches. <a routerLink="/login">Login</a></p>
    <div *ngIf="authToken">
      <p *ngIf="loading">Loading…</p>
      <div *ngIf="!loading && sandwiches.length === 0">You haven't created any sandwiches yet.</div>
      <ul *ngIf="!loading && sandwiches.length > 0" class="sandwich-list">
        <li *ngFor="let s of sandwiches">
          <strong>{{ s.name }}</strong>
          <div class="muted small">{{ s.description }}</div>
          <div class="small">{{ s.price != null ? ('$' + (s.price|number:'1.2-2')) : '' }}</div>
        </li>
      </ul>
    </div>
  </div>
  `
})
export class Dashboard {
  sandwiches: Sandwich[] = [];
  loading = false;
  authToken: string | null = null;
  constructor(private cdr: ChangeDetectorRef) {
    try { this.authToken = localStorage.getItem('auth_token'); } catch { this.authToken = null; }
    if (this.authToken) this.load();
  }

  async load() {
    this.loading = true;
    try {
      const headers: Record<string,string> = { 'Accept': 'application/json' };
      if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
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
}
