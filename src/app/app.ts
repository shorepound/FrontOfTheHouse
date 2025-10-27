import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('sandwich-app');

  constructor(private auth: AuthService, private router: Router) {}

  authToken(): string | null {
    try { return this.auth.getToken(); } catch { return null; }
  }

  logout() {
    try { this.auth.logout(); } catch {}
    // Navigate to home (sandwiches) after logout
    try { this.router.navigate(['/sandwiches']); } catch {}
  }
}
