import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Alert, AlertStatus } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/alerts`;

  list(status?: AlertStatus): Observable<Alert[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<Alert[]>(this.base, { params });
  }
}
