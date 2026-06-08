import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { API_BASE } from './api';
import { AuthResponse, User } from '../models/types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(localStorage.getItem('cns_token'));
  private readonly userSignal = signal<User | null>(this.readUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  constructor(private http: HttpClient, private router: Router) {}

  register(payload: { name: string; email: string; password: string }) {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/register`, payload).pipe(
      tap((res) => this.persistAuth(res))
    );
  }

  login(payload: { email: string; password: string }) {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/login`, payload).pipe(
      tap((res) => this.persistAuth(res))
    );
  }

  fetchMe() {
    return this.http.get<{ user: User }>(`${API_BASE}/me`).pipe(
      tap((res) => {
        this.userSignal.set(res.user);
        localStorage.setItem('cns_user', JSON.stringify(res.user));
      })
    );
  }

  logout() {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem('cns_token');
    localStorage.removeItem('cns_user');
    this.router.navigateByUrl('/');
  }

  private persistAuth(res: AuthResponse) {
    this.tokenSignal.set(res.token);
    this.userSignal.set(res.user);
    localStorage.setItem('cns_token', res.token);
    localStorage.setItem('cns_user', JSON.stringify(res.user));
  }

  private readUser(): User | null {
    const raw = localStorage.getItem('cns_user');
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
