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
