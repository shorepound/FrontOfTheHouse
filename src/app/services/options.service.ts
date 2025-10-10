import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';

export interface Option { id: number; label: string }

function toTitleCase(s: string) {
  if (!s) return s;
  return s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

@Injectable({ providedIn: 'root' })
export class OptionsService {
  constructor(private http: HttpClient) {}

  // Returns options with labels normalized to Title Case for consistent UI
  list(kind: string): Observable<Option[]> {
    return this.http.get<Option[]>(`/api/options/${kind}`).pipe(
      map(list => (list || []).map(o => ({ id: o.id, label: toTitleCase(o.label || String(o.id)) }))),
      tap({ error: e => console.error('OptionsService.list error', kind, e) })
    );
  }
}
