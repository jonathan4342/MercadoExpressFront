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

  create(productUid: string, quantity: number, alertUid?: string): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(this.base, { productUid, quantity, alertUid });
  }

  approve(uid: string): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.base}/${uid}/approve`, {});
  }

  reject(uid: string, reason: string): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.base}/${uid}/reject`, { reason });
  }

  receive(uid: string): Observable<PurchaseOrder> {
    return this.http.patch<PurchaseOrder>(`${this.base}/${uid}/receive`, {});
  }
}
