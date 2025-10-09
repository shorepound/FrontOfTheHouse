import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OptionsService, Option } from '../services/options.service';
import { SandwichService } from '../services/sandwich.service';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'builder-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './builder-form.html'
})
export class BuilderForm {
  breads: Option[] = [];
  cheeses: Option[] = [];
  dressings: Option[] = [];
  meats: Option[] = [];
  toppings: Option[] = [];

  // per-list errors for friendly messages
  breadsError: string | null = null;
  cheesesError: string | null = null;
  dressingsError: string | null = null;
  meatsError: string | null = null;
  toppingsError: string | null = null;

  selected = {
    breadId: null as number | null,
    cheeseId: null as number | null,
    dressingId: null as number | null,
    meatId: null as number | null,
    toppingId: null as number | null
  };

  loading = true;

  constructor(private opts: OptionsService, private sandwiches: SandwichService) {}

  ngOnInit() {
    // Load each list independently with a short timeout so the UI won't hang
    // if the dev proxy or backend is unavailable. We track pending requests
    // and clear `loading` once all attempts complete (success or error).
    this.loading = true;
    let pending = 5;
    const done = () => { pending -= 1; if (pending <= 0) this.loading = false; };

    this.opts.list('breads').pipe(timeout(5000)).subscribe({
      next: v => { this.breads = v || []; done(); },
      error: e => { this.breadsError = 'Failed to load breads'; console.error('breads error', e); done(); }
    });

    this.opts.list('cheeses').pipe(timeout(5000)).subscribe({
      next: v => { this.cheeses = v || []; done(); },
      error: e => { this.cheesesError = 'Failed to load cheeses'; console.error('cheeses error', e); done(); }
    });

    this.opts.list('dressings').pipe(timeout(5000)).subscribe({
      next: v => { this.dressings = v || []; done(); },
      error: e => { this.dressingsError = 'Failed to load dressings'; console.error('dressings error', e); done(); }
    });

    this.opts.list('meats').pipe(timeout(5000)).subscribe({
      next: v => { this.meats = v || []; done(); },
      error: e => { this.meatsError = 'Failed to load meats'; console.error('meats error', e); done(); }
    });

    this.opts.list('toppings').pipe(timeout(5000)).subscribe({
      next: v => { this.toppings = v || []; done(); },
      error: e => { this.toppingsError = 'Failed to load toppings'; console.error('toppings error', e); done(); }
    });
  }

  retry() {
    // reset errors and reload lists
    this.breadsError = this.cheesesError = this.dressingsError = this.meatsError = this.toppingsError = null;
    this.breads = this.cheeses = this.dressings = this.meats = this.toppings = [];
    this.loading = true;
    // delegate to original init logic
    this.ngOnInit();
  }

  // Retry a single list (breads|cheeses|dressings|meats|toppings)
  retryList(kind: string) {
    const handler = (errMsg: string, field: 'breadsError'|'cheesesError'|'dressingsError'|'meatsError'|'toppingsError') => (e: any) => {
      console.error(kind, 'retry error', e);
      this[field] = errMsg;
    };
    switch (kind) {
      case 'breads':
        this.breadsError = null; this.opts.list('breads').pipe(timeout(5000)).subscribe({ next: v => this.breads = v || [], error: handler('Failed to load breads', 'breadsError') });
        break;
      case 'cheeses':
        this.cheesesError = null; this.opts.list('cheeses').pipe(timeout(5000)).subscribe({ next: v => this.cheeses = v || [], error: handler('Failed to load cheeses', 'cheesesError') });
        break;
      case 'dressings':
        this.dressingsError = null; this.opts.list('dressings').pipe(timeout(5000)).subscribe({ next: v => this.dressings = v || [], error: handler('Failed to load dressings', 'dressingsError') });
        break;
      case 'meats':
        this.meatsError = null; this.opts.list('meats').pipe(timeout(5000)).subscribe({ next: v => this.meats = v || [], error: handler('Failed to load meats', 'meatsError') });
        break;
      case 'toppings':
        this.toppingsError = null; this.opts.list('toppings').pipe(timeout(5000)).subscribe({ next: v => this.toppings = v || [], error: handler('Failed to load toppings', 'toppingsError') });
        break;
    }
  }

  canSubmit() {
    return !!(this.selected.breadId && this.selected.cheeseId && this.selected.dressingId && this.selected.meatId && this.selected.toppingId);
  }

  clearMessages() {
    this.success = null;
    this.error = null;
  }

  submit() {
    if (this.submitting) return;
    this.submitting = true;
    fetch('/api/builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.selected)
    }).then(async res => {
      this.submitting = false;
      if (res.ok) {
        this.success = 'Sandwich saved!';
        // refresh sandwich list so user sees their new sandwich
        this.sandwiches.list().subscribe({ next: () => {}, error: () => {} });
        // auto-clear success after a short delay
        setTimeout(() => this.success = null, 3500);
      } else if (res.status === 400) {
        // try parse field-level validation
        const body = await res.json().catch(() => null);
        if (body && body.errors) {
          const errs = body.errors as Record<string,string>;
          this.breadsError = errs['breadId'] ?? null;
          this.cheesesError = errs['cheeseId'] ?? null;
          this.dressingsError = errs['dressingId'] ?? null;
          this.meatsError = errs['meatId'] ?? null;
          this.toppingsError = errs['toppingId'] ?? null;
        } else {
          const txt = await res.text().catch(() => res.statusText);
          this.error = 'Save failed: ' + txt;
          setTimeout(() => this.error = null, 6000);
        }
      } else {
        const txt = await res.text().catch(() => res.statusText);
        this.error = 'Save failed: ' + txt;
        setTimeout(() => this.error = null, 6000);
      }
    }).catch(e => { this.submitting = false; this.error = 'Save failed: ' + (e && e.message ? e.message : e); });
  }

  submitting = false;
  success: string | null = null;
  error: string | null = null;
}
