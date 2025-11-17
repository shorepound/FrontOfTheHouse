import { Component, Inject, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OptionsService, Option } from '../services/options.service';
import { OptionsFacadeService } from '../services/options-facade.service';
import { SandwichService } from '../services/sandwich.service';
import { AuthService } from '../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'builder-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './builder-form.html',
  // styles moved to global styles.css to reduce component bundle size
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
  steps = [ 'Bread', 'Cheese', 'Dressing', 'Meat', 'Toppings', 'Name & Price' ];
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

  constructor(private opts: OptionsService, private optionsFacade: OptionsFacadeService, private sandwiches: SandwichService, private auth: AuthService, @Inject(PLATFORM_ID) private platformId: Object, private cd: ChangeDetectorRef, private route: ActivatedRoute, private router: Router) {}

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

  cancelEdit() {
    // Navigate back to the sandwich list
    this.router.navigate(['/sandwiches']);
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
          console.debug('Looking for bread:', clean, 'in options:', this.breads?.map(b => b.label));
          const breadOpt = this.breads?.find(b => b.label.toLowerCase() === clean.toLowerCase());
          if (breadOpt) {
            this.selected.breadId = breadOpt.id;
            console.debug('Found bread:', breadOpt.label, 'id:', breadOpt.id);
          } else {
            console.debug('Bread not found:', clean);
          }
          if (toastedMatch) {
            this.selected.toasted = true;
            console.debug('Setting toasted = true');
          }
          break;
        case 'cheese':
          console.debug('Looking for cheeses:', items, 'in options:', this.cheeses?.map(c => c.label));
          for (const it of items) {
            const opt = this.cheeses?.find(c => c.label.toLowerCase() === it.toLowerCase()); 
            if (opt) {
              this.selected.cheeseIds.push(opt.id);
              console.debug('Found cheese:', opt.label, 'id:', opt.id);
            } else {
              console.debug('Cheese not found:', it);
            }
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
          for (const it of items) { 
            const opt = this.toppings?.find(t => t.label.toLowerCase() === it.toLowerCase()); 
            if (opt) {
              this.selected.toppingIds.push(opt.id);
              console.debug('Found topping:', opt.label, 'id:', opt.id);
            } else {
              console.debug('Topping not found:', it);
            }
          }
          break;
      }
    }
    
    console.debug('Final selections after parsing:', {
      breadId: this.selected.breadId,
      cheeseIds: this.selected.cheeseIds,
      dressingIds: this.selected.dressingIds,
      meatIds: this.selected.meatIds,
      toppingIds: this.selected.toppingIds,
      toasted: this.selected.toasted
    });
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
        
        // Now that all options are loaded, populate selections from description if editing
        if (this.editingId && this.editingDescription) {
          console.debug('BuilderForm: populating selections from description for editing');
          console.debug('BuilderForm: editingDescription:', this.editingDescription);
          console.debug('BuilderForm: available options - breads:', this.breads?.length, 'cheeses:', this.cheeses?.length, 'dressings:', this.dressings?.length, 'meats:', this.meats?.length, 'toppings:', this.toppings?.length);
          this.populateSelectionsFromDescription(this.editingDescription);
        } else {
          console.debug('BuilderForm: not populating selections - editingId:', this.editingId, 'editingDescription:', this.editingDescription);
        }
        
        try { this.cd.detectChanges(); } catch { }
      });
    }
  };

  // Use the OptionsFacadeService so list loading and errors are centralized
  this.optionsFacade.list$('breads').subscribe({ next: v => { console.debug('opts:breads next', v?.length); this.breads = v || []; this.cd.detectChanges(); done(); } });
  this.optionsFacade.error$('breads').subscribe(e => { if (e) { this.breadsError = e; try { this.cd.detectChanges(); } catch {} } });

  this.optionsFacade.list$('cheeses').subscribe({ next: v => { console.debug('opts:cheeses next', v?.length); this.cheeses = v || []; this.cd.detectChanges(); done(); } });
  this.optionsFacade.error$('cheeses').subscribe(e => { if (e) { this.cheesesError = e; try { this.cd.detectChanges(); } catch {} } });

  this.optionsFacade.list$('dressings').subscribe({ next: v => { console.debug('opts:dressings next', v?.length); this.dressings = v || []; this.cd.detectChanges(); done(); } });
  this.optionsFacade.error$('dressings').subscribe(e => { if (e) { this.dressingsError = e; try { this.cd.detectChanges(); } catch {} } });

  this.optionsFacade.list$('meats').subscribe({ next: v => { console.debug('opts:meats next', v?.length); this.meats = v || []; this.cd.detectChanges(); done(); } });
  this.optionsFacade.error$('meats').subscribe(e => { if (e) { this.meatsError = e; try { this.cd.detectChanges(); } catch {} } });

  this.optionsFacade.list$('toppings').subscribe({ next: v => { console.debug('opts:toppings next', v?.length); this.toppings = v || []; this.cd.detectChanges(); done(); } });
  this.optionsFacade.error$('toppings').subscribe(e => { if (e) { this.toppingsError = e; try { this.cd.detectChanges(); } catch {} } });

  // Kick off loading for all lists (facade caches and updates the observables)
  try { this.optionsFacade.loadAll(); } catch (e) { console.error('OptionsFacade.loadAll error', e); }

    // If an id param is present, load the sandwich for editing. We only run
    // this in the browser to avoid server-side fetches.
    const idParam = this.route.snapshot.queryParamMap.get('id');
        if (idParam && isPlatformBrowser(this.platformId)) {
          const id = Number(idParam);
          if (!Number.isNaN(id)) {
            // Attempt to load the sandwich, but prevent entering edit mode when
            // the current user is not allowed to edit (server enforces this too).
            this.sandwiches.get(id).subscribe({ next: s => {
              console.debug('BuilderForm: loaded sandwich for editing:', s);
              // Decide whether the current browser user may edit this sandwich.
              try {
                const currentUser = this.auth.getCurrentUserId();
                const isPrivate = (s as any).isPrivate === true;
                const owner = (s as any).ownerUserId ?? null;
                const allowed = !isPrivate || (owner != null && currentUser != null && owner === currentUser);
                if (!allowed) {
                  // Not allowed to edit — surface a friendly message and navigate away.
                  console.debug('BuilderForm: user not allowed to edit sandwich id=', id, 'owner=', owner, 'current=', currentUser);
                  this.error = 'You do not have permission to edit this sandwich.';
                  try { this.cd.detectChanges(); } catch {}
                  setTimeout(() => {
                    try { this.router.navigate(['/sandwiches']); } catch {}
                  }, 900);
                  return;
                }
              } catch (e) {
                // If permission check fails for any reason, be conservative and deny edit.
                this.error = 'Unable to determine permission to edit this sandwich.';
                try { this.cd.detectChanges(); } catch {}
                setTimeout(() => { try { this.router.navigate(['/sandwiches']); } catch {} }, 900);
                return;
              }

              // Allowed — set editingId and continue to populate form
              this.editingId = id;
          
          
          
          console.debug('BuilderForm: API response name:', s.name, 'price:', s.price);
          // Prefill only name and price/description for now.
          this.selected.name = s.name ?? null;
            this.selected.price = s.price ?? null;
            console.debug('BuilderForm: set selected.name to:', this.selected.name, 'selected.price to:', this.selected.price);
            // prefer explicit toasted flag from server when editing
            this.selected.toasted = !!s.toasted;
            // keep the full description for a read-only review view
            this.editingDescription = s.description ?? null;

            console.debug('BuilderForm: editingDescription set to:', this.editingDescription);
            console.debug('BuilderForm: loading status:', this.loading);

            // If the server returned structured composition fields, use them
            // (we added these server-side). Otherwise fall back to description parsing.
            if ((s as any).breadId !== undefined || (s as any).cheeseIds !== undefined || (s as any).dressingIds !== undefined || (s as any).meatIds !== undefined || (s as any).toppingIds !== undefined) {
              console.debug('BuilderForm: server provided composition fields, applying to selected');
              try {
                const srv: any = s as any;
                this.selected.breadId = srv.breadId ?? null;
                this.selected.cheeseIds = Array.isArray(srv.cheeseIds) ? (srv.cheeseIds as number[]).slice() : [];
                this.selected.dressingIds = Array.isArray(srv.dressingIds) ? (srv.dressingIds as number[]).slice() : [];
                this.selected.meatIds = Array.isArray(srv.meatIds) ? (srv.meatIds as number[]).slice() : [];
                this.selected.toppingIds = Array.isArray(srv.toppingIds) ? (srv.toppingIds as number[]).slice() : [];
                // If server omitted toasted in composition, keep the earlier toasted flag
                if (srv.toasted !== undefined) this.selected.toasted = !!srv.toasted;
              } catch (e) {
                console.debug('BuilderForm: error applying server composition fields', e);
              }
            }

            // If options are already loaded, populate selections from description only if structured values missing
            if (!this.loading && this.editingDescription && (this.selected.breadId == null && this.selected.cheeseIds.length === 0 && this.selected.dressingIds.length === 0 && this.selected.meatIds.length === 0 && this.selected.toppingIds.length === 0)) {
              console.debug('BuilderForm: options already loaded, no structured composition present, populating from description');
              this.populateSelectionsFromDescription(this.editingDescription);
            }
          
          // scroll/focus to form to make it apparent
          try { this.cd.detectChanges(); } catch {}
        }, error: () => { /* ignore, user can still build */ } });
      }
    }

    // Note: removed the temporary native-fetch fallback that attempted to
    // populate option lists in parallel. We now rely on the OptionsService
    // HttpClient calls and explicit retries exposed via retry()/retryList().
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
        this.breadsError = null;
        this.optionsFacade.retry('breads');
        break;
      case 'cheeses':
        this.cheesesError = null;
        this.optionsFacade.retry('cheeses');
        break;
      case 'dressings':
        this.dressingsError = null;
        this.optionsFacade.retry('dressings');
        break;
      case 'meats':
        this.meatsError = null;
        this.optionsFacade.retry('meats');
        break;
      case 'toppings':
        this.toppingsError = null;
        this.optionsFacade.retry('toppings');
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

  // Provide a runtime summary of the user's current selections so the
  // UI can render a compact, always-visible review while the user steps
  // through the builder. This helps when users forget earlier choices.
  get selectionSummary() {
    const summary: Array<{ name: string; values: string[] }> = [];

    const breadLabel = this.breads.find(b => b.id === this.selected.breadId)?.label ?? null;
    const breadValue = this.selected.breadId ? (breadLabel ? (this.selected.toasted ? `${breadLabel} (toasted)` : breadLabel) : '(unknown)') : '(none)';
    summary.push({ name: 'Bread', values: [breadValue] });

    const cheeseVals = this.selected.noCheese ? ['No Cheese'] : (this.selected.cheeseIds?.map(id => this.cheeses.find(c => c.id === id)?.label ?? '(unknown)') ?? []);
    summary.push({ name: 'Cheese', values: cheeseVals.length ? cheeseVals : ['(none)'] });

    const dressingVals = this.selected.noDressing ? ['No Dressing'] : (this.selected.dressingIds?.map(id => this.dressings.find(d => d.id === id)?.label ?? '(unknown)') ?? []);
    summary.push({ name: 'Dressing', values: dressingVals.length ? dressingVals : ['(none)'] });

    const meatVals = this.selected.noMeat ? ['No Meat'] : (this.selected.meatIds?.map(id => this.meats.find(m => m.id === id)?.label ?? '(unknown)') ?? []);
    summary.push({ name: 'Meat', values: meatVals.length ? meatVals : ['(none)'] });

    const toppingVals = this.selected.noToppings ? ['No Toppings'] : (this.selected.toppingIds?.map(id => this.toppings.find(t => t.id === id)?.label ?? '(unknown)') ?? []);
    summary.push({ name: 'Toppings', values: toppingVals.length ? toppingVals : ['(none)'] });

    if (this.selected.name) summary.push({ name: 'Name', values: [this.selected.name] });
    if (this.selected.price != null) summary.push({ name: 'Price', values: [`$${Number(this.selected.price).toFixed(2)}`] });

    return summary;
  }

  // compute a compact count for the panel header
  get selectionCount() {
    let cnt = 0;
    if (this.selected.breadId) cnt += 1;
    if (this.selected.noCheese) cnt += 1; else cnt += (this.selected.cheeseIds?.length ?? 0);
    if (this.selected.noDressing) cnt += 1; else cnt += (this.selected.dressingIds?.length ?? 0);
    if (this.selected.noMeat) cnt += 1; else cnt += (this.selected.meatIds?.length ?? 0);
    if (this.selected.noToppings) cnt += 1; else cnt += (this.selected.toppingIds?.length ?? 0);
    return cnt;
  }

  // UI state for the selection summary panel
  selectionCollapsed = false;

  toggleSelectionCollapsed() {
    this.selectionCollapsed = !this.selectionCollapsed;
    try { localStorage.setItem('builder.selectionCollapsed', this.selectionCollapsed ? '1' : '0'); } catch {}
    try { this.cd.detectChanges(); } catch {}
  }

  ngAfterViewInit(): void {
    // restore persisted preference if available
    try {
      const c = localStorage.getItem('builder.selectionCollapsed');
      if (c !== null) this.selectionCollapsed = c === '1';
    } catch {}
    try { this.cd.detectChanges(); } catch {}
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
        toasted: this.selected.toasted,
        price: this.selected.price,
        // Include composition fields for proper update
        breadId: this.selected.breadId,
        cheeseIds: this.selected.cheeseIds && this.selected.cheeseIds.length > 0 ? this.selected.cheeseIds : null,
        dressingIds: this.selected.dressingIds && this.selected.dressingIds.length > 0 ? this.selected.dressingIds : null,
        meatIds: this.selected.meatIds && this.selected.meatIds.length > 0 ? this.selected.meatIds : null,
        toppingIds: this.selected.toppingIds && this.selected.toppingIds.length > 0 ? this.selected.toppingIds : null
      };
      console.debug('BuilderForm: updating sandwich with payload:', payload);
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
          // ensure edited sandwich appears in "my sandwiches" for this browser session
          try {
            const key = 'my_sandwich_ids';
            const raw = localStorage.getItem(key);
            let arr: any[] = [];
            try { arr = raw ? JSON.parse(raw) : []; } catch { arr = []; }
            if (!Array.isArray(arr)) arr = [];
            if (this.editingId && !arr.includes(this.editingId)) { arr.push(this.editingId); localStorage.setItem(key, JSON.stringify(arr)); }
          } catch {}
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

    // default: create via SandwichService so the AuthInterceptor attaches
    // Authorization and we use HttpClient's observable pipeline.
    const payload = {
      name: this.selected.name,
      breadId: this.selected.breadId,
      cheeseIds: this.selected.cheeseIds,
      dressingIds: this.selected.dressingIds,
      meatIds: this.selected.meatIds,
      toppingIds: this.selected.toppingIds,
      toasted: this.selected.toasted,
      price: this.selected.price
    };

    this.sandwiches.create(payload).subscribe({
      next: (saved) => {
        clearTimeout(timeoutId);
        this.submitting = false;
        try { this.cd.detectChanges(); } catch {}
        this.lastSave = { ok: true, message: 'Sandwich saved', data: saved };
        try { this.showLastSave(); } catch {}
        this.success = 'Sandwich saved!';
        try { this.cd.detectChanges(); } catch {}

        // Persist created sandwich id in localStorage so the dashboard can show "my sandwiches"
        try {
          const createdId = (saved && (saved as any).id) ? (saved as any).id : null;
          if (createdId) {
            const key = 'my_sandwich_ids';
            const raw = localStorage.getItem(key);
            let arr: any[] = [];
            try { arr = raw ? JSON.parse(raw) : []; } catch { arr = []; }
            if (!Array.isArray(arr)) arr = [];
            if (!arr.includes(createdId)) { arr.push(createdId); localStorage.setItem(key, JSON.stringify(arr)); }
          }
        } catch { }

        // refresh sandwich list so user sees their new sandwich
        this.sandwiches.list().subscribe({ next: () => {}, error: () => {} });
        // show the success briefly, then navigate back to the list so users see their saved sandwich
        setTimeout(() => {
          try { this.router.navigate(['/sandwiches']); } catch { }
        }, 1200);
        // auto-clear success after a short delay (keeps banner tidy in case navigation is prevented)
        setTimeout(() => this.success = null, 3500);
      },
      error: (e) => {
        clearTimeout(timeoutId);
        this.submitting = false;
        try { this.cd.detectChanges(); } catch {}
        // HttpClient wraps errors; try to extract server validation errors if present
        let handled = false;
        try {
          if (e && e.status === 400 && e.error && e.error.errors) {
            const errs = e.error.errors as Record<string,string>;
            this.breadsError = errs['breadId'] ?? null;
            this.cheesesError = errs['cheeseIds'] ?? errs['cheeseId'] ?? null;
            this.dressingsError = errs['dressingIds'] ?? errs['dressingId'] ?? null;
            this.meatsError = errs['meatIds'] ?? errs['meatId'] ?? null;
            this.toppingsError = errs['toppingIds'] ?? errs['toppingId'] ?? null;
            handled = true;
          }
        } catch {}
        if (!handled) {
          const msg = (e && e.message) ? e.message : (e && e.statusText) ? e.statusText : String(e);
          this.lastSave = { ok: false, message: 'Save failed: ' + msg };
          try { this.showLastSave(); } catch {}
          this.error = 'Save failed: ' + msg;
          try { this.cd.detectChanges(); } catch {}
          setTimeout(() => this.error = null, 6000);
        }
      }
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
