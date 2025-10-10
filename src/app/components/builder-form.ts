import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OptionsService, Option } from '../services/options.service';
import { SandwichService } from '../services/sandwich.service';
import { ActivatedRoute, Router } from '@angular/router';
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
    // Optional user-specified name for the sandwich
    name: null as string | null,
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
    ,
    // optional price in dollars
    price: null as number | null
    ,
    // whether the chosen bread should be toasted
    toasted: false as boolean
  };

  // Temporary UI debug helper: set true to show alerts for success/error so
  // Temporary UI debug helper: set true to show alerts for success/error so
  // users see the result even if console is hidden or client hydration is flaky.
  // Now disabled in favor of persistent banner UI
  private debugUi = false;

  // Last save result shown in a persistent banner
  lastSave: { ok: boolean; message: string; data?: any } | null = null;
  // temporary manualFetchStatus removed during cleanup

  loading = true;

  // Stepper UI state: current step index (0-based)
  steps = [ 'Bread', 'Cheese', 'Dressing', 'Meat', 'Toppings' ];
  stepIndex = 0;

  // Convenience getters
  get currentStep() { return this.steps[this.stepIndex]; }
  get isFirstStep() { return this.stepIndex === 0; }
  get isLastStep() { return this.stepIndex === this.steps.length - 1; }

  nextStep() {
    if (!this.isLastStep) {
      this.stepIndex += 1;
      try { this.cd.detectChanges(); } catch {}
    }
  }

  prevStep() {
    if (!this.isFirstStep) {
      this.stepIndex -= 1;
      try { this.cd.detectChanges(); } catch {}
    }
  }

  constructor(private opts: OptionsService, private sandwiches: SandwichService, @Inject(PLATFORM_ID) private platformId: Object, private cd: ChangeDetectorRef, private route: ActivatedRoute, private router: Router) {}

  // When editing an existing sandwich this holds its id
  editingId: number | null = null;
  // When editing, keep the server-provided description so we can show a
  // compact review of the sandwich instead of forcing the user through the
  // stepper flow.
  editingDescription: string | null = null;

  // When true the edit flow will open the stepper so the user can change composition
  editingInPlace = false;

  startEditComposition() {
    // Open the stepper and attempt to populate selections if needed
    this.editingInPlace = true;
    // If the lists are loaded, populate selections immediately; otherwise
    // populateSelectionsFromDescription will be called after lists load.
    try { if (!this.loading && this.editingDescription) this.populateSelectionsFromDescription(this.editingDescription); } catch {}
    try { this.cd.detectChanges(); } catch {}
  }

  // Parse a server description string and try to match labels to option ids
  populateSelectionsFromDescription(desc: string) {
    // Reset selections
    this.selected.breadId = null;
    this.selected.cheeseIds = [];
    this.selected.dressingIds = [];
    this.selected.meatIds = [];
    this.selected.toppingIds = [];
    this.selected.toasted = false;

    const parts = desc.split(';').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const idx = part.indexOf(':');
      if (idx === -1) continue;
      const label = part.substring(0, idx).trim().toLowerCase();
      const items = part.substring(idx + 1).split(',').map(s => s.trim()).filter(Boolean);
      switch (label) {
        case 'bread':
          // bread may contain '(toasted)'
          const bname = items.join(', ');
          const toastedMatch = /\(toasted\)$/i.test(bname);
          const clean = bname.replace(/\(toasted\)$/i, '').trim();
          const breadOpt = this.breads.find(b => b.label.toLowerCase() === clean.toLowerCase());
          if (breadOpt) this.selected.breadId = breadOpt.id;
          if (toastedMatch) this.selected.toasted = true;
          break;
        case 'cheese':
          for (const it of items) {
            const opt = this.cheeses.find(c => c.label.toLowerCase() === it.toLowerCase()); if (opt) this.selected.cheeseIds.push(opt.id);
          }
          break;
        case 'dressing':
          for (const it of items) { const opt = this.dressings.find(d => d.label.toLowerCase() === it.toLowerCase()); if (opt) this.selected.dressingIds.push(opt.id); }
          break;
        case 'meats':
        case 'meat':
          for (const it of items) { const opt = this.meats.find(m => m.label.toLowerCase() === it.toLowerCase()); if (opt) this.selected.meatIds.push(opt.id); }
          break;
        case 'toppings':
        case 'topping':
          for (const it of items) { const opt = this.toppings.find(t => t.label.toLowerCase() === it.toLowerCase()); if (opt) this.selected.toppingIds.push(opt.id); }
          break;
      }
    }
  }

  get isEditMode() { return !!this.editingId; }


  ngOnInit() {
    // Avoid calling HTTP during server-side rendering (prerender/SSR).
    // Add an early debug log so we can tell whether ngOnInit runs in the
    // browser or not.
    // keep a minimal log for errors only

    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }

  // Load each list independently with a short timeout so the UI won't hang
    // if the dev proxy or backend is unavailable. We track pending requests
    // and clear `loading` once all attempts complete (success or error).
  this.loading = true;
  // loading starts
  let pending = 5;
  // Global fallback: if lists haven't all resolved within this many ms,
  // stop showing the full-page loading overlay and surface per-list
  // errors for any empty lists. This avoids the UI being stuck at
  // "Loading options…" when a request silently stalls.
  const globalFallbackMs = 6000;
  const globalTimeout = setTimeout(() => {
    if (this.loading) {
      this.loading = false;
      // mark any empty lists as failed so the user sees retry buttons
      if (!this.breads || this.breads.length === 0) this.breadsError = this.breadsError ?? 'Failed to load breads';
      if (!this.cheeses || this.cheeses.length === 0) this.cheesesError = this.cheesesError ?? 'Failed to load cheeses';
      if (!this.dressings || this.dressings.length === 0) this.dressingsError = this.dressingsError ?? 'Failed to load dressings';
      if (!this.meats || this.meats.length === 0) this.meatsError = this.meatsError ?? 'Failed to load meats';
      if (!this.toppings || this.toppings.length === 0) this.toppingsError = this.toppingsError ?? 'Failed to load toppings';
      try { this.cd.detectChanges(); } catch { }
    }
  }, globalFallbackMs);
  const done = () => {
    pending -= 1;
    // Avoid ExpressionChangedAfterItHasBeenCheckedError by scheduling the
    // final `loading = false` update in a microtask so it runs after the
    // current change detection cycle.
    console.debug('BuilderForm: done() called, remaining=', pending);
    if (pending <= 0) {
      clearTimeout(globalTimeout);
      queueMicrotask(() => {
        this.loading = false;
        console.debug('BuilderForm: all done, set loading=false (microtask)');
        try { this.cd.detectChanges(); } catch { }
      });
    }
  };

  this.opts.list('breads').pipe(timeout(5000)).subscribe({ next: v => { console.debug('opts:breads next', v?.length); this.breads = v || []; this.cd.detectChanges(); done(); }, error: e => { this.breadsError = 'Failed to load breads'; console.error('breads error', e); this.cd.detectChanges(); done(); } });

  this.opts.list('cheeses').pipe(timeout(5000)).subscribe({ next: v => { console.debug('opts:cheeses next', v?.length); this.cheeses = v || []; this.cd.detectChanges(); done(); }, error: e => { this.cheesesError = 'Failed to load cheeses'; console.error('cheeses error', e); this.cd.detectChanges(); done(); } });

  this.opts.list('dressings').pipe(timeout(5000)).subscribe({ next: v => { console.debug('opts:dressings next', v?.length); this.dressings = v || []; this.cd.detectChanges(); done(); }, error: e => { this.dressingsError = 'Failed to load dressings'; console.error('dressings error', e); this.cd.detectChanges(); done(); } });

  this.opts.list('meats').pipe(timeout(5000)).subscribe({ next: v => { console.debug('opts:meats next', v?.length); this.meats = v || []; this.cd.detectChanges(); done(); }, error: e => { this.meatsError = 'Failed to load meats'; console.error('meats error', e); this.cd.detectChanges(); done(); } });

  this.opts.list('toppings').pipe(timeout(5000)).subscribe({ next: v => { console.debug('opts:toppings next', v?.length); this.toppings = v || []; this.cd.detectChanges(); done(); }, error: e => { this.toppingsError = 'Failed to load toppings'; console.error('toppings error', e); this.cd.detectChanges(); done(); } });

    // If an id param is present, load the sandwich for editing. We only run
    // this in the browser to avoid server-side fetches.
    const idParam = this.route.snapshot.queryParamMap.get('id');
        if (idParam && isPlatformBrowser(this.platformId)) {
      const id = Number(idParam);
      if (!Number.isNaN(id)) {
        this.editingId = id;
        this.sandwiches.get(id).subscribe({ next: s => {
          // Prefill only name and price/description for now.
          this.selected.name = s.name ?? null;
          this.selected.price = s.price ?? null;
          // keep the full description for a read-only review view
          this.editingDescription = s.description ?? null;
          // scroll/focus to form to make it apparent
          try { this.cd.detectChanges(); } catch {}
        }, error: () => { /* ignore, user can still build */ } });
      }
    }

    // Immediate client-side fallback: attempt native fetch() in parallel for
    // any empty lists. We only run this in the browser and only populate
    // fields that are still empty and have no explicit error. This is a
    // pragmatic dev-time mitigation for hydration/HttpClient races.
    if (typeof window !== 'undefined') {
      (async () => {
        try {
          const checks: Array<[keyof BuilderForm, string, string]> = [
            ['breads', 'breads', 'breadsError'],
            ['cheeses', 'cheeses', 'cheesesError'],
            ['dressings', 'dressings', 'dressingsError'],
            ['meats', 'meats', 'meatsError'],
            ['toppings', 'toppings', 'toppingsError']
          ];
          await Promise.all(checks.map(async ([field, kind, errField]) => {
            // @ts-ignore
            if ((this as any)[field] && (this as any)[field].length > 0) return;
            // @ts-ignore
            if ((this as any)[errField]) return;
            try {
              const res = await fetch(`/api/options/${kind}`);
              if (!res.ok) return;
              const json = await res.json().catch(() => null);
                if (Array.isArray(json)) {
                  // Map labels to Title Case to match OptionsService behavior
                  const titleCase = (s: string) => String(s || '').replace(/(^|\s)\S/g, t => t.toUpperCase());
                  // @ts-ignore
                  (this as any)[field] = json.map((o: any) => ({ id: o.id, label: titleCase(o.label ?? o.name ?? '') }));
                  this.cd.detectChanges();
                }
            } catch (e) {
              // ignore errors here; main HttpClient handlers will surface problems
            }
          }));
        } catch {
          /* ignore */
        }
      })();
    }
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

  /**
   * Temporary helper: perform a manual fetch using the browser fetch API
   * to populate options. Useful to bypass HttpClient/hydration edge cases
   * during debugging. This will be removed when root cause is fixed.
   */
  // manualFetch helper removed during cleanup

  canSubmit() {
    // require at least one selection (or explicit 'no' option) in each category
    const hasCheese = (this.selected.cheeseIds && this.selected.cheeseIds.length > 0) || !!this.selected.noCheese;
    const hasDressing = (this.selected.dressingIds && this.selected.dressingIds.length > 0) || !!this.selected.noDressing;
    const hasMeat = (this.selected.meatIds && this.selected.meatIds.length > 0) || !!this.selected.noMeat;
    const hasToppings = (this.selected.toppingIds && this.selected.toppingIds.length > 0) || !!this.selected.noToppings;
    const hasName = !!(this.selected.name && String(this.selected.name).trim().length > 0);
    return !!(hasName && this.selected.breadId && hasCheese && hasDressing && hasMeat && hasToppings);
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
      try { this.showLastSave(); } catch { }
      this.error = 'Save timed out';
      try { this.cd.detectChanges(); } catch { }
    }, timeoutMs);

    // If editing an existing sandwich, call the update API via HttpClient
    if (this.editingId) {
      const id = this.editingId;
      const payload = {
        name: this.selected.name,
        description: null as string | null,
        price: this.selected.price
      };
      // use HttpClient wrapper
      this.sandwiches.update(id, payload).subscribe({
        next: () => {
          clearTimeout(timeoutId);
          this.submitting = false;
          try { this.cd.detectChanges(); } catch {}
          this.lastSave = { ok: true, message: 'Sandwich updated' };
          try { this.showLastSave(); } catch {}
          this.success = 'Sandwich updated!';
          try { this.cd.detectChanges(); } catch {}
          // navigate back to list
          try { this.router.navigate(['/sandwiches']); } catch {}
        },
        error: (e) => {
          clearTimeout(timeoutId);
          this.submitting = false;
          try { this.cd.detectChanges(); } catch {}
          const msg = (e && e.message) ? e.message : String(e);
          this.lastSave = { ok: false, message: 'Update failed: ' + msg };
          try { this.showLastSave(); } catch {}
          this.error = 'Update failed: ' + msg;
          try { this.cd.detectChanges(); } catch {}
        }
      });
      return;
    }

    // default: create via /api/builder
    fetch('/api/builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.selected.name,
        breadId: this.selected.breadId,
        cheeseIds: this.selected.cheeseIds,
        dressingIds: this.selected.dressingIds,
        meatIds: this.selected.meatIds,
        toppingIds: this.selected.toppingIds,
        price: this.selected.price
      }),
      signal: ac.signal
    }).then(async res => {
      clearTimeout(timeoutId);
      console.debug('BuilderForm: fetch completed, status=', res.status);
      this.submitting = false;
      try { this.cd.detectChanges(); } catch { }
      if (res.ok) {
        console.debug('BuilderForm: save OK');
        const saved = await res.json().catch(() => null);
  // show persistent banner with server response
  this.lastSave = { ok: true, message: 'Sandwich saved', data: saved };
  try { this.showLastSave(); } catch { }
        this.success = 'Sandwich saved!';
        try { this.cd.detectChanges(); } catch { }
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
          try { this.cd.detectChanges(); } catch { }
            } else {
            const txt = await res.text().catch(() => res.statusText);
            console.debug('BuilderForm: unknown 400 body', txt);
            this.lastSave = { ok: false, message: 'Save failed (400): ' + txt };
            try { this.showLastSave(); } catch { }
            this.error = 'Save failed: ' + txt;
            try { this.cd.detectChanges(); } catch { }
            setTimeout(() => this.error = null, 6000);
          }
      } else {
        const txt = await res.text().catch(() => res.statusText);
        console.debug('BuilderForm: non-400 error', res.status, txt);
        this.lastSave = { ok: false, message: 'Save failed (' + res.status + '): ' + txt };
        try { this.showLastSave(); } catch { }
        this.error = 'Save failed: ' + txt;
        try { this.cd.detectChanges(); } catch { }
        setTimeout(() => this.error = null, 6000);
      }
    }).catch(e => {
      clearTimeout(timeoutId);
      this.submitting = false;
      try { this.cd.detectChanges(); } catch { }
      const msg = (e && e.message) ? e.message : String(e);
      this.lastSave = { ok: false, message: 'Save failed: ' + msg };
      try { this.showLastSave(); } catch { }
      this.error = 'Save failed: ' + msg;
      try { this.cd.detectChanges(); } catch { }
    });
  }

  dismissLastSave() {
    this.lastSave = null;
  }

  showLastSave() {
    // Scroll the persistent save banner into view and focus it so users notice it.
    // Run in a microtask to avoid ExpressionChangedAfterItHasBeenCheckedError
    queueMicrotask(() => {
      try {
        const el = document.querySelector('.save-banner') as HTMLElement | null;
        if (!el) return;
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { el.scrollIntoView(); }
        try { el.focus(); } catch { }
      } catch { }
      try { this.cd.detectChanges(); } catch { }
    });
  }

  submitting = false;
  success: string | null = null;
  error: string | null = null;
}
