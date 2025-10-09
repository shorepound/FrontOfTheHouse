import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Option { id: number; label: string }

@Injectable({ providedIn: 'root' })
export class OptionsService {
  constructor(private http: HttpClient) {}

  list(kind: string): Observable<Option[]> {
    return this.http.get<Option[]>(`/api/options/${kind}`).pipe(
      tap({ error: e => console.error('OptionsService.list error', kind, e) })
    );
  }
}
