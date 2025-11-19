import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, of, timeout } from 'rxjs';
import { OptionsService, Option } from './options.service';

type Kind = 'breads'|'cheeses'|'dressings'|'meats'|'toppings';

@Injectable({ providedIn: 'root' })
export class OptionsFacadeService {
  private kinds: Kind[] = ['breads','cheeses','dressings','meats','toppings'];

  private data = new Map<Kind, BehaviorSubject<Option[]>>();
  private errs = new Map<Kind, BehaviorSubject<string | null>>();

  constructor(private opts: OptionsService) {
    for (const k of this.kinds) {
      this.data.set(k, new BehaviorSubject<Option[]>([]));
      this.errs.set(k, new BehaviorSubject<string | null>(null));
    }
  }

  // Observable getters
  list$(kind: Kind) {
    return this.data.get(kind)!.asObservable();
  }

  error$(kind: Kind) {
    return this.errs.get(kind)!.asObservable();
  }

  // Trigger loading for a single kind. Caches the result in a BehaviorSubject.
  load(kind: Kind) {
    const subject = this.data.get(kind)!;
    const err = this.errs.get(kind)!;
    // Reset error when starting
    err.next(null);
    this.opts.list(kind).pipe(
      // If a request stalls we time out and map to an empty list instead of throwing
      timeout({ each: 5000 }),
      catchError(e => {
        // Record a friendly error and return empty array so subscribers get a value
        err.next('Failed to load ' + kind);
        return of<Option[]>([]);
      })
    ).subscribe(v => {
      subject.next(v || []);
    });
  }

  // Load all kinds in parallel
  loadAll() {
    for (const k of this.kinds) this.load(k);
  }

  // Retry a particular kind (re-fetch)
  retry(kind: Kind) {
    this.load(kind);
  }
}
