import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <h1>Create account</h1>
    <form (ngSubmit)="submit()" class="auth-card">
      <label>
        Full Name
        <input name="name" [(ngModel)]="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" [(ngModel)]="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" [(ngModel)]="password" required minlength="6" />
      </label>
      <button type="submit" [disabled]="loading">{{ loading ? 'Creating...' : 'Register' }}</button>
      <p class="error" *ngIf="error">{{ error }}</p>
      <p>Already have an account? <a routerLink="/login">Login</a></p>
    </form>
  `,
  styles: [
    `.auth-card{max-width:440px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1rem;display:grid;gap:.8rem}`,
    `label{display:grid;gap:.35rem}`,
    `input{padding:.65rem .75rem;border-radius:10px;border:1px solid #cfd8e3}`,
    `button{border:0;background:#0f766e;color:#fff;padding:.7rem 1rem;border-radius:10px}`,
    `.error{color:#b91c1c;font-weight:600}`,
  ],
})
export class RegisterPageComponent {
  name = '';
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.register({ name: this.name, email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Registration failed';
      },
    });
  }
}
