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
  // When a user clicks delete, we set a pending id and show inline Confirm/Cancel
  pendingDelete: number | null = null;

  // Helper: parse a server description like
  // "Cheese: cheddar; Dressing: mayo; Toppings: lettuce, tomato"
  // into an array of { label, items[] } so the UI can render them nicely.
  parseDescription(desc: string | null) {
    if (!desc) return [] as Array<{ label: string; items: string[] }>;
    const hasToasted = /\(toasted\)/i.test(desc);
    return desc.split(';').map(part => part.trim()).filter(Boolean).map(part => {
      const idx = part.indexOf(':');
      if (idx === -1) return { label: part, items: [] };
      const label = part.substring(0, idx).trim();
      let items = part.substring(idx + 1).split(',').map(s => s.trim()).filter(Boolean);
      // If this is the bread group and the overall description marks toasted,
      // ensure each bread item reflects that (e.g. "pumpernickel (toasted)").
      if (/^bread$/i.test(label) && hasToasted) {
        items = items.map(it => /\(toasted\)/i.test(it) ? it : `${it} (toasted)`);
      }
      return { label, items };
    });
  }

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
    // Inline confirm flow: if this id is not pending, mark it pending and return
    if (this.pendingDelete !== id) {
      this.pendingDelete = id;
      try { this.cd.detectChanges(); } catch {}
      return;
    }

    // otherwise user confirmed; proceed with deletion
    this.pendingDelete = null;
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

  cancelPendingDelete() {
    this.pendingDelete = null;
    try { this.cd.detectChanges(); } catch {}
  }
}
