import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SandwichService, Sandwich } from '../services/sandwich.service';

@Component({
  selector: 'sandwich-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sandwich-list.html',
  styleUrls: ['./sandwich-list.css']
})
export class SandwichList {
  sandwiches: Sandwich[] = [];
  loading = false;
  deleting = new Set<number>();

  constructor(private svc: SandwichService, @Inject(PLATFORM_ID) private platformId: Object, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    // Only call the API in the browser; avoid server-side prerender fetches that fail during build
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.svc.list().subscribe({
      next: s => {
        this.sandwiches = s;
        this.loading = false;
        // detect changes explicitly because the app uses zoneless change detection
        try { this.cd.detectChanges(); } catch {}
      },
      error: () => { this.loading = false; try { this.cd.detectChanges(); } catch {} }
    });
  }

  deleteSandwich(id: number) {
    if (!confirm('Delete this sandwich? This cannot be undone.')) return;
    this.deleting.add(id);
    try { this.cd.detectChanges(); } catch {}
    this.svc.delete(id).subscribe({
      next: () => {
        // remove locally to avoid refetch
        this.sandwiches = this.sandwiches.filter(s => s.id !== id);
        this.deleting.delete(id);
        try { this.cd.detectChanges(); } catch {}
      },
      error: () => {
        this.deleting.delete(id);
        try { this.cd.detectChanges(); } catch {}
        alert('Failed to delete sandwich');
      }
    });
  }
}
