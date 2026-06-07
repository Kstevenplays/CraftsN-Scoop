import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <h1>Login</h1>
    <form (ngSubmit)="submit()" class="auth-card">
      <label>
        Email
        <input name="email" type="email" [(ngModel)]="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" [(ngModel)]="password" required />
      </label>
      <button type="submit" [disabled]="loading">{{ loading ? 'Logging in...' : 'Login' }}</button>
      <p class="error" *ngIf="error">{{ error }}</p>
      <p>New customer? <a routerLink="/register">Create an account</a></p>
    </form>
  `,
  styles: [
    `.auth-card{max-width:440px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1rem;display:grid;gap:.8rem}`,
    `label{display:grid;gap:.35rem}`,
    `input{padding:.65rem .75rem;border-radius:10px;border:1px solid #cfd8e3}`,
    `button{border:0;background:#111827;color:#fff;padding:.7rem 1rem;border-radius:10px}`,
    `.error{color:#b91c1c;font-weight:600}`,
  ],
})
export class LoginPageComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  submit() {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || '/');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Login failed';
      },
    });
  }
}
