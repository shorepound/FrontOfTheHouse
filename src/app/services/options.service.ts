import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';

export interface Option { id: number; label: string }

@Injectable({ providedIn: 'root' })
export class OptionsService {
  constructor(private http: HttpClient) {}

  list(kind: string): Observable<Option[]> {
    const titleCase = (s: string) => s.replace(/(^|\s)\S/g, t => t.toUpperCase());
    return this.http.get<Option[]>(`/api/options/${kind}`).pipe(
      map(arr => (arr || []).map(o => ({ id: o.id, label: titleCase(o.label || '') }))),
      tap({ error: e => console.error('OptionsService.list error', kind, e) })
    );
  }
}
