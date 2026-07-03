import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateProductPayload, InventoryFilters, InventoryMovement, MovementType, Product } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  list(filters: InventoryFilters = {}): Observable<Product[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<Product[]>(this.base, { params });
  }

  create(product: CreateProductPayload): Observable<Product> {
    return this.http.post<Product>(this.base, product);
  }

  update(uid: string, product: CreateProductPayload): Observable<Product> {
    return this.http.put<Product>(`${this.base}/${uid}`, product);
  }

  adjustStock(uid: string, type: MovementType, quantity: number, reason: string) {
    return this.http.post<{ product: Product }>(
      `${this.base}/${uid}/adjustments`, { type, quantity, reason }
    );
  }

  movements(uid: string): Observable<InventoryMovement[]> {
    return this.http.get<InventoryMovement[]>(`${this.base}/${uid}/movements`);
  }
}
