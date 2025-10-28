import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Sandwich {
  id: number;
  name: string;
  description: string;
  toasted?: boolean;
  price?: number | null;
  // set by server when available
  ownerUserId?: number | null;
  isPrivate?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SandwichService {
  private base = '/api/sandwiches';
  constructor(private http: HttpClient) {}

  list(): Observable<Sandwich[]> {
    return this.http.get<Sandwich[]>(this.base);
  }

  mine(): Observable<Sandwich[]> {
    return this.http.get<Sandwich[]>(`${this.base}/mine`);
  }

  // POST via the builder endpoint so server-side validation and owner attribution
  // behave the same as the legacy /api/builder route.
  create(payload: { name?: string | null; description?: string | null; price?: number | null; toasted?: boolean | null; breadId?: number | null; cheeseIds?: number[] | null; dressingIds?: number[] | null; meatIds?: number[] | null; toppingIds?: number[] | null }) : Observable<Sandwich> {
    return this.http.post<Sandwich>('/api/builder', payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  get(id: number): Observable<Sandwich> {
    return this.http.get<Sandwich>(`${this.base}/${id}`);
  }

  update(id: number, payload: { name?: string | null; description?: string | null; price?: number | null; toasted?: boolean | null }): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, payload);
  }
}
