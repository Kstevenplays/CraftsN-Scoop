import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="auth-layout">
      <aside class="brand-panel">
        <div class="brand-mark">CNS</div>
        <p class="eyebrow">Local handmade goods</p>
        <h1>Crafts N' Scoop</h1>
        <p class="tagline">Handmade with love, scooped with joy.</p>
        <p class="description">
          Thoughtful crafts, scoop-ready treats, and small-batch finds made for gifting,
          sharing, and everyday warmth.
        </p>

        <div class="highlights">
          <span>Handmade Quality</span>
          <span>Fresh Scoops</span>
          <span>Fast Local Delivery</span>
        </div>
      </aside>

      <section class="auth-panel">
        <div class="auth-card">
          <div class="tabs" aria-label="Authentication mode">
            <button type="button" [class.active]="mode === 'login'" (click)="setMode('login')">Login</button>
            <button type="button" [class.active]="mode === 'register'" (click)="setMode('register')">Register</button>
          </div>

          <div class="heading">
            <h2>{{ mode === 'login' ? 'Welcome back' : 'Create your account' }}</h2>
            <p>{{ mode === 'login' ? 'Sign in to continue shopping.' : 'Join before browsing the shop.' }}</p>
          </div>

          <form *ngIf="mode === 'login'" (ngSubmit)="login()" class="form">
            <label>
              Email
              <input name="loginEmail" type="email" [(ngModel)]="loginEmail" required autocomplete="email" />
            </label>
            <label>
              Password
              <input name="loginPassword" type="password" [(ngModel)]="loginPassword" required autocomplete="current-password" />
            </label>
            <button type="submit" [disabled]="loading">{{ loading ? 'Logging in...' : 'Login' }}</button>
          </form>

          <form *ngIf="mode === 'register'" (ngSubmit)="register()" class="form">
            <label>
              Full Name
              <input name="name" [(ngModel)]="name" required autocomplete="name" />
            </label>
            <label>
              Email
              <input name="registerEmail" type="email" [(ngModel)]="registerEmail" required autocomplete="email" />
            </label>
            <label>
              Password
              <input name="registerPassword" type="password" [(ngModel)]="registerPassword" required minlength="6" autocomplete="new-password" />
            </label>
            <label>
              Confirm Password
              <input name="confirmPassword" type="password" [(ngModel)]="confirmPassword" required autocomplete="new-password" />
            </label>
            <button type="submit" [disabled]="loading">{{ loading ? 'Creating...' : 'Register' }}</button>
          </form>

          <p class="error" *ngIf="error">{{ error }}</p>
        </div>
      </section>
    </section>
  `,
  styles: [
    `:host{display:block;min-height:100vh;background:#fff8f0;color:#3b1f0e;font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}`,
    `.auth-layout{min-height:100vh;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr)}`,
    `.brand-panel{position:relative;overflow:hidden;background:#e8633a;color:#fff8f0;padding:clamp(2rem,6vw,5rem);display:flex;flex-direction:column;justify-content:center;gap:1rem}`,
    `.brand-panel:before{content:'';position:absolute;inset:auto -10% -18% 20%;height:55%;background:rgba(255,248,240,.18);border-radius:50% 50% 0 0;transform:rotate(-6deg)}`,
    `.brand-panel>*{position:relative}`,
    `.brand-mark{width:4.5rem;height:4.5rem;border-radius:1.1rem;background:#fff8f0;color:#e8633a;display:grid;place-items:center;font-weight:900;letter-spacing:.08em;box-shadow:0 18px 45px rgba(59,31,14,.2)}`,
    `.eyebrow{text-transform:uppercase;font-size:.78rem;font-weight:800;letter-spacing:.12em;margin:1rem 0 0;color:#fff2e6}`,
    `h1{font-size:clamp(2.7rem,6vw,5.4rem);line-height:.95;margin:.2rem 0 0;letter-spacing:0}`,
    `.tagline{font-size:clamp(1.1rem,2vw,1.55rem);font-weight:800;margin:.1rem 0;color:#fff}`,
    `.description{max-width:36rem;font-size:1rem;line-height:1.7;margin:0;color:#fff6ee}`,
    `.highlights{display:flex;flex-wrap:wrap;gap:.7rem;margin-top:1.25rem}`,
    `.highlights span{background:rgba(255,248,240,.18);border:1px solid rgba(255,248,240,.36);border-radius:999px;padding:.65rem .85rem;font-weight:800;color:#fff}`,
    `.auth-panel{background:#fff8f0;display:grid;place-items:center;padding:clamp(1.25rem,4vw,4rem)}`,
    `.auth-card{width:min(100%,29rem);background:#fff;border:1px solid rgba(59,31,14,.12);border-radius:.5rem;box-shadow:0 24px 70px rgba(59,31,14,.12);padding:1.25rem}`,
    `.tabs{display:grid;grid-template-columns:1fr 1fr;background:#fff1e6;border:1px solid rgba(59,31,14,.1);border-radius:.45rem;padding:.25rem;margin-bottom:1.3rem}`,
    `.tabs button{border:0;background:transparent;color:#3b1f0e;border-radius:.32rem;padding:.75rem;font:inherit;font-weight:900;cursor:pointer}`,
    `.tabs button.active{background:#3b1f0e;color:#fff8f0;box-shadow:0 8px 18px rgba(59,31,14,.18)}`,
    `.heading{margin-bottom:1.1rem}`,
    `.heading h2{font-size:1.6rem;margin:0 0 .35rem;color:#3b1f0e;letter-spacing:0}`,
    `.heading p{margin:0;color:#6f5547;line-height:1.45}`,
    `.form{display:grid;gap:.85rem}`,
    `label{display:grid;gap:.38rem;font-weight:800;color:#3b1f0e}`,
    `input{width:100%;box-sizing:border-box;border:1px solid rgba(59,31,14,.22);border-radius:.45rem;background:#fffaf5;color:#3b1f0e;padding:.78rem .85rem;font:inherit;outline:none}`,
    `input:focus{border-color:#e8633a;box-shadow:0 0 0 3px rgba(232,99,58,.16);background:#fff}`,
    `.form button{border:0;border-radius:.45rem;background:#e8633a;color:#fff;padding:.85rem 1rem;font:inherit;font-weight:900;cursor:pointer}`,
    `.form button:disabled{opacity:.65;cursor:not-allowed}`,
    `.error{margin:1rem 0 0;color:#b42318;font-weight:800;line-height:1.45}`,
    `@media(max-width:860px){.auth-layout{grid-template-columns:1fr}.brand-panel{min-height:42vh}.auth-panel{place-items:start center}.auth-card{margin-top:-2rem}.highlights span{font-size:.9rem}}`,
  ],
})
export class LandingPageComponent {
  mode: AuthMode = 'login';
  loginEmail = '';
  loginPassword = '';
  name = '';
  registerEmail = '';
  registerPassword = '';
  confirmPassword = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  setMode(mode: AuthMode) {
    this.mode = mode;
    this.error = '';
  }

  login() {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: () => this.finishAuth(),
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Login failed';
      },
    });
  }

  register() {
    if (this.loading) {
      return;
    }

    if (this.registerPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.register({ name: this.name, email: this.registerEmail, password: this.registerPassword }).subscribe({
      next: () => this.finishAuth(),
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Registration failed';
      },
    });
  }

  private finishAuth() {
    this.loading = false;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl || '/shop');
  }
}
