import { Component, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { SandwichService, Sandwich } from '../services/sandwich.service';

@Component({
  selector: 'sandwich-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sandwich-list.html'
})
export class SandwichList {
  sandwiches: Sandwich[] = [];
  loading = false;

  constructor(private svc: SandwichService, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    // Only call the API in the browser; avoid server-side prerender fetches that fail during build
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.svc.list().subscribe({
      next: s => { this.sandwiches = s; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
