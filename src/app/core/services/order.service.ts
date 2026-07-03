import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrderStatus, PurchaseOrder } from '../models/models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/orders`;

  list(status?: OrderStatus): Observable<PurchaseOrder[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<PurchaseOrder[]>(this.base, { params });
  }

  create(productId: string, quantity: number, alertId?: string): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.base, { productId, quantity, alertId });
  }

  approve(id: string): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.base}/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.base}/${id}/reject`, { reason });
  }

  receive(id: string): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.base}/${id}/receive`, {});
  }
}
