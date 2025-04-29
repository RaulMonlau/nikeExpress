import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api';
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserData();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `${token}`
    });
  }

  private loadUserData(): void {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      this.userSubject.next(JSON.parse(userData));
    }
  }

  getUserProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/perfil`, { headers: this.getHeaders() })
      .pipe(
        tap(user => {
          this.userSubject.next(user);
          localStorage.setItem('user_data', JSON.stringify(user));
        })
      );
  }

  updateProfile(userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/perfil`, userData, { headers: this.getHeaders() })
      .pipe(
        tap(() => this.getUserProfile())
      );
  }

  changePassword(passwordData: { passwordActual: string, passwordNueva: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/cambiar-password`, passwordData, { headers: this.getHeaders() });
  }

  getOrderHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/compras`, { headers: this.getHeaders() });
  }

  getOrderDetails(orderId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/compras/${orderId}`, { headers: this.getHeaders() });
  }
}