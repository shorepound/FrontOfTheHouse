import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Sandwich {
  id: number;
  name: string;
  description: string;
  price?: number | null;
}

@Injectable({ providedIn: 'root' })
export class SandwichService {
  private base = '/api/sandwiches';
  constructor(private http: HttpClient) {}

  list(): Observable<Sandwich[]> {
    return this.http.get<Sandwich[]>(this.base);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
