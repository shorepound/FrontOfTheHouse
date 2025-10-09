import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OptionsService, Option } from '../services/options.service';
import { SandwichService } from '../services/sandwich.service';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'builder-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
    // allow multiple selections (arrays)
    cheeseIds: [] as number[],
    dressingIds: [] as number[],
    meatIds: [] as number[],
    toppingIds: [] as number[],
    // explicit 'no X' flags (mutually exclusive with arrays)
    noCheese: false,
    noDressing: false,
    noMeat: false,
    noToppings: false
  };

  // Temporary UI debug helper: set true to show alerts for success/error so
  // Temporary UI debug helper: set true to show alerts for success/error so
  // users see the result even if console is hidden or client hydration is flaky.
  // Now disabled in favor of persistent banner UI
  private debugUi = false;

  // Last save result shown in a persistent banner
  lastSave: { ok: boolean; message: string; data?: any } | null = null;

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
    // require at least one selection (or explicit 'no' option) in each category
    const hasCheese = (this.selected.cheeseIds && this.selected.cheeseIds.length > 0) || !!this.selected.noCheese;
    const hasDressing = (this.selected.dressingIds && this.selected.dressingIds.length > 0) || !!this.selected.noDressing;
    const hasMeat = (this.selected.meatIds && this.selected.meatIds.length > 0) || !!this.selected.noMeat;
    const hasToppings = (this.selected.toppingIds && this.selected.toppingIds.length > 0) || !!this.selected.noToppings;
    return !!(this.selected.breadId && hasCheese && hasDressing && hasMeat && hasToppings);
  }

  // Track whether user attempted submit (used to highlight empty required fields)
  touchedOnSubmit = false;

  isInvalid(kind: 'bread'|'cheese'|'dressing'|'meat'|'topping') {
    switch(kind) {
      case 'bread': return !!this.breadsError || (this.touchedOnSubmit && !this.selected.breadId);
      case 'cheese': return !!this.cheesesError || (this.touchedOnSubmit && (!this.selected.cheeseIds || this.selected.cheeseIds.length === 0));
      case 'dressing': return !!this.dressingsError || (this.touchedOnSubmit && (!this.selected.dressingIds || this.selected.dressingIds.length === 0));
      case 'meat': return !!this.meatsError || (this.touchedOnSubmit && (!this.selected.meatIds || this.selected.meatIds.length === 0));
      case 'topping': return !!this.toppingsError || (this.touchedOnSubmit && (!this.selected.toppingIds || this.selected.toppingIds.length === 0));
    }
  }

  toggleTopping(id: number, checked: boolean) {
    if (!this.selected.toppingIds) this.selected.toppingIds = [];
    const idx = this.selected.toppingIds.indexOf(id);
    if (checked && idx === -1) this.selected.toppingIds.push(id);
    if (!checked && idx !== -1) this.selected.toppingIds.splice(idx, 1);
    if (checked) this.selected.noToppings = false;
  }

  toggleCheese(id: number, checked: boolean) {
    if (!this.selected.cheeseIds) this.selected.cheeseIds = [];
    const idx = this.selected.cheeseIds.indexOf(id);
    if (checked && idx === -1) this.selected.cheeseIds.push(id);
    if (!checked && idx !== -1) this.selected.cheeseIds.splice(idx, 1);
    if (checked) this.selected.noCheese = false;
  }

  toggleDressing(id: number, checked: boolean) {
    if (!this.selected.dressingIds) this.selected.dressingIds = [];
    const idx = this.selected.dressingIds.indexOf(id);
    if (checked && idx === -1) this.selected.dressingIds.push(id);
    if (!checked && idx !== -1) this.selected.dressingIds.splice(idx, 1);
    if (checked) this.selected.noDressing = false;
  }

  toggleMeat(id: number, checked: boolean) {
    if (!this.selected.meatIds) this.selected.meatIds = [];
    const idx = this.selected.meatIds.indexOf(id);
    if (checked && idx === -1) this.selected.meatIds.push(id);
    if (!checked && idx !== -1) this.selected.meatIds.splice(idx, 1);
    if (checked) this.selected.noMeat = false;
  }

  toggleNoCheese(checked: boolean) {
    this.selected.noCheese = checked;
    if (checked) {
      this.selected.cheeseIds = [];
    }
  }

  toggleNoDressing(checked: boolean) {
    this.selected.noDressing = checked;
    if (checked) {
      this.selected.dressingIds = [];
    }
  }

  toggleNoMeat(checked: boolean) {
    this.selected.noMeat = checked;
    if (checked) {
      this.selected.meatIds = [];
    }
  }

  toggleNoToppings(checked: boolean) {
    this.selected.noToppings = checked;
    if (checked) {
      this.selected.toppingIds = [];
    }
  }

  clearMessages() {
    this.success = null;
    this.error = null;
  }

  submit() {
    if (this.submitting) return;
    this.touchedOnSubmit = true;
    this.submitting = true;
    console.debug('BuilderForm: submit() starting', { selected: this.selected });

    // use AbortController so we can't get stuck waiting forever in the browser
    const ac = new AbortController();
    const timeoutMs = 10000; // 10s
    const timeoutId = setTimeout(() => {
      try {
        ac.abort();
      } catch { }
      this.submitting = false;
      // show persistent failure banner on timeout
      this.lastSave = { ok: false, message: 'Save timed out after ' + (timeoutMs/1000) + 's' };
      this.error = 'Save timed out';
    }, timeoutMs);

    fetch('/api/builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        breadId: this.selected.breadId,
        cheeseIds: this.selected.cheeseIds,
        dressingIds: this.selected.dressingIds,
        meatIds: this.selected.meatIds,
        toppingIds: this.selected.toppingIds
      }),
      signal: ac.signal
    }).then(async res => {
      clearTimeout(timeoutId);
      console.debug('BuilderForm: fetch completed, status=', res.status);
      this.submitting = false;
      if (res.ok) {
        console.debug('BuilderForm: save OK');
        const saved = await res.json().catch(() => null);
        // show persistent banner with server response
        this.lastSave = { ok: true, message: 'Sandwich saved', data: saved };
        this.success = 'Sandwich saved!';
        // refresh sandwich list so user sees their new sandwich
        this.sandwiches.list().subscribe({ next: () => {}, error: () => {} });
        // auto-clear success after a short delay
        setTimeout(() => this.success = null, 3500);
      } else if (res.status === 400) {
        console.debug('BuilderForm: validation error 400');
        // try parse field-level validation
        const body = await res.json().catch(() => null);
        if (body && body.errors) {
          const errs = body.errors as Record<string,string>;
          this.breadsError = errs['breadId'] ?? null;
          // map array errors
          this.cheesesError = errs['cheeseIds'] ?? errs['cheeseId'] ?? null;
          this.dressingsError = errs['dressingIds'] ?? errs['dressingId'] ?? null;
          this.meatsError = errs['meatIds'] ?? errs['meatId'] ?? null;
          this.toppingsError = errs['toppingIds'] ?? errs['toppingId'] ?? null;
          } else {
            const txt = await res.text().catch(() => res.statusText);
            console.debug('BuilderForm: unknown 400 body', txt);
            this.lastSave = { ok: false, message: 'Save failed (400): ' + txt };
            this.error = 'Save failed: ' + txt;
            setTimeout(() => this.error = null, 6000);
          }
      } else {
        const txt = await res.text().catch(() => res.statusText);
        console.debug('BuilderForm: non-400 error', res.status, txt);
        this.lastSave = { ok: false, message: 'Save failed (' + res.status + '): ' + txt };
        this.error = 'Save failed: ' + txt;
        setTimeout(() => this.error = null, 6000);
      }
    }).catch(e => {
      clearTimeout(timeoutId);
      this.submitting = false;
      const msg = (e && e.message) ? e.message : String(e);
      this.lastSave = { ok: false, message: 'Save failed: ' + msg };
      this.error = 'Save failed: ' + msg;
    });
  }

  dismissLastSave() {
    this.lastSave = null;
  }

  submitting = false;
  success: string | null = null;
  error: string | null = null;
}
