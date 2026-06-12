import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { API_BASE } from '../core/api';
import { AuthService } from '../core/auth.service';
import { OrderService } from '../core/order.service';
import { ToastService } from '../core/toast.service';
import { Order } from '../models/types';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="profile-page">
      <h1>My Profile</h1>

      <!-- Avatar & Name Card -->
      <section class="card avatar-card">
        <div class="avatar">{{ initials }}</div>
        <h2>{{ name }}</h2>
        <p class="member-since" *ngIf="memberSince">Member since {{ memberSince }}</p>
      </section>

      <!-- Profile Details Card -->
      <section class="card details-card">
        <!-- VIEW MODE -->
        <ng-container *ngIf="!editing()">
          <div class="detail-row">
            <span class="detail-label">📧 Email Address</span>
            <span class="detail-value">{{ email }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">📞 Phone Number</span>
            <span class="detail-value">{{ phone || 'Not set' }}</span>
          </div>
          <button type="button" class="btn-edit" (click)="startEditing()">Edit Profile</button>
        </ng-container>

        <!-- EDIT MODE -->
        <ng-container *ngIf="editing()">
          <form (ngSubmit)="saveProfile()" #profileForm="ngForm">
            <div class="field">
              <label for="name">Full Name</label>
              <input id="name" name="name" [(ngModel)]="formName" required />
            </div>
            <div class="field">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" [(ngModel)]="formEmail" required />
            </div>
            <div class="field">
              <label for="phone">Phone Number</label>
              <input id="phone" name="phone" type="tel" [(ngModel)]="formPhone" />
            </div>

            <div class="password-section">
              <div class="divider-label">Change Password <span class="optional">(optional)</span></div>
              <div class="field">
                <label for="currentPassword">Current Password</label>
                <input id="currentPassword" name="currentPassword" type="password" [(ngModel)]="formCurrentPassword" />
              </div>
              <div class="field">
                <label for="newPassword">New Password</label>
                <input id="newPassword" name="newPassword" type="password" [(ngModel)]="formNewPassword" />
              </div>
              <div class="field">
                <label for="confirmPassword">Confirm New Password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" [(ngModel)]="formConfirmPassword" />
              </div>
            </div>

            <div class="btn-row">
              <button type="button" class="btn-cancel" (click)="cancelEditing()">Cancel</button>
              <button type="submit" class="btn-save" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </ng-container>
      </section>

      <!-- Order History Section -->
      <section class="card orders-section">
        <h2>My Recent Orders</h2>
        <p *ngIf="orders().length === 0">No orders yet.</p>
        <table *ngIf="orders().length > 0">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of orders()">
              <td>#{{ order.id }}</td>
              <td>{{ order.created_at | date:'mediumDate' }}</td>
              <td>{{ order.total | currency:'PHP':'symbol':'1.2-2' }}</td>
              <td><span class="badge badge-pending">Unpaid</span></td>
              <td><span class="badge"
                    [class.badge-pending]="order.status === 'pending'"
                    [class.badge-processing]="order.status === 'processing'"
                    [class.badge-completed]="order.status === 'completed' || order.status === 'shipped'"
                    [class.badge-cancelled]="order.status === 'cancelled'">{{ order.status }}</span></td>
            </tr>
          </tbody>
        </table>
        <a *ngIf="orders().length > 0" routerLink="/orders/my" class="btn-view-all">View All Orders</a>
      </section>
    </div>
  `,
  styles: [`
    .profile-page h1 { margin-bottom: 1rem; }

    .card {
      background: var(--cns-card);
      border: 1px solid var(--cns-border);
      border-radius: var(--cns-radius);
      padding: 1.5rem;
      box-shadow: var(--cns-shadow);
      margin-bottom: 1rem;
    }

    /* Avatar Card */
    .avatar-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
    }
    .avatar {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--cns-coral);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 900;
      flex-shrink: 0;
    }
    .avatar-card h2 { margin: 0; color: var(--cns-brown); }
    .member-since { font-size: 0.85rem; color: var(--cns-brown-soft); margin: 0; }

    /* Details Card — View Mode */
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 0;
      border-bottom: 1px solid var(--cns-border);
    }
    .detail-row:last-of-type {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 800;
      font-size: 0.9rem;
      color: var(--cns-brown);
    }
    .detail-value {
      color: var(--cns-brown-soft);
      font-size: 0.9rem;
      text-align: right;
      max-width: 60%;
      overflow-wrap: break-word;
    }
    .btn-edit {
      margin-top: 1rem;
      width: 100%;
      padding: 0.65rem;
      border: 2px solid var(--cns-coral);
      border-radius: var(--cns-radius);
      background: transparent;
      color: var(--cns-coral);
      font-weight: 900;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-edit:hover {
      background: var(--cns-coral);
      color: #fff;
    }

    /* Edit Mode Form */
    .field {
      margin-bottom: 0.85rem;
    }
    .field label {
      display: block;
      font-weight: 800;
      font-size: 0.85rem;
      color: var(--cns-brown);
      margin-bottom: 0.3rem;
    }
    .field input {
      width: 100%;
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--cns-border);
      border-radius: var(--cns-radius);
      background: var(--cns-cream);
      color: var(--cns-brown);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field input:focus {
      border-color: var(--cns-coral);
      box-shadow: 0 0 0 2px rgba(232,99,58,0.15);
    }
    .password-section {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--cns-border);
    }
    .divider-label {
      font-weight: 800;
      font-size: 0.9rem;
      color: var(--cns-brown);
      margin-bottom: 0.75rem;
    }
    .optional {
      font-weight: 400;
      color: var(--cns-brown-soft);
      font-size: 0.8rem;
    }
    .btn-row {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .btn-cancel {
      flex: 1;
      padding: 0.65rem;
      border: 2px solid var(--cns-coral);
      border-radius: var(--cns-radius);
      background: transparent;
      color: var(--cns-coral);
      font-weight: 900;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-cancel:hover {
      background: rgba(232,99,58,0.08);
    }
    .btn-save {
      flex: 1;
      padding: 0.65rem;
      border: 0;
      border-radius: var(--cns-radius);
      background: var(--cns-coral);
      color: #fff;
      font-weight: 900;
      font-size: 0.9rem;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-save:hover { opacity: 0.85; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Orders Section */
    .orders-section { margin-bottom: 2rem; }
    .orders-section h2 { margin: 0 0 0.75rem; color: var(--cns-brown); }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 0.5rem 0.5rem 0.5rem 0;
      border-bottom: 1px solid var(--cns-border);
      color: var(--cns-brown-soft);
    }
    th {
      font-weight: 800;
      font-size: 0.8rem;
      color: var(--cns-brown);
    }
    .badge {
      display: inline-block;
      text-transform: capitalize;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 900;
    }
    .badge-pending { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }
    .badge-processing { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
    .badge-completed { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .badge-cancelled { background: #fce4ec; color: #c62828; border: 1px solid #ef9a9a; }
    .btn-view-all {
      display: inline-block;
      margin-top: 0.75rem;
      color: var(--cns-coral);
      font-weight: 900;
      text-decoration: none;
    }
    .btn-view-all:hover { text-decoration: underline; }

    @media (max-width: 768px) {
      .detail-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
      }
      .detail-value {
        text-align: left;
        max-width: 100%;
      }
    }
  `]
})
export class ProfilePageComponent {
  private authUser = this.auth.user;

  protected name = '';
  protected email = '';
  protected phone = '';
  protected role = '';
  protected memberSince = '';

  // Form fields
  protected formName = '';
  protected formEmail = '';
  protected formPhone = '';
  protected formCurrentPassword = '';
  protected formNewPassword = '';
  protected formConfirmPassword = '';

  protected editing = signal(false);
  protected saving = signal(false);
  protected orders = signal<Order[]>([]);

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private toast: ToastService,
    private orderService: OrderService
  ) {
    this.loadProfile();
  }

  get initials(): string {
    return this.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private loadProfile() {
    // Pre-fill from AuthService cache
    const u = this.authUser();
    if (u) {
      this.applyUserData(u);
    }

    // Fetch fresh profile
    this.http.get<{ user: { id: number; name: string; email: string; phone: string | null; role: string; created_at: string } }>(
      `${API_BASE}/users/profile`
    ).subscribe({
      next: (res) => this.applyUserData(res.user),
      error: () => this.toast.show('Failed to load profile', 'error'),
    });

    // Last 5 orders
    this.orderService.myOrders().subscribe({
      next: (res) => this.orders.set(res.orders.slice(0, 5)),
      error: () => {},
    });
  }

  private applyUserData(u: { name: string; email: string; phone?: string | null; role: string; created_at?: string }) {
    this.name = u.name;
    this.email = u.email;
    this.phone = u.phone || '';
    this.role = u.role;
    this.formName = u.name;
    this.formEmail = u.email;
    this.formPhone = u.phone || '';

    if (u.created_at) {
      const d = new Date(u.created_at);
      this.memberSince = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  }

  protected startEditing() {
    // Reset form fields to current values
    this.formName = this.name;
    this.formEmail = this.email;
    this.formPhone = this.phone;
    this.formCurrentPassword = '';
    this.formNewPassword = '';
    this.formConfirmPassword = '';
    this.editing.set(true);
  }

  protected cancelEditing() {
    this.editing.set(false);
  }

  protected saveProfile() {
    if (!this.formName || !this.formEmail) {
      this.toast.show('Name and email are required', 'error');
      return;
    }

    if (this.formNewPassword && this.formNewPassword !== this.formConfirmPassword) {
      this.toast.show('Passwords do not match', 'error');
      return;
    }

    this.saving.set(true);
    const payload: Record<string, string | null> = {
      name: this.formName,
      email: this.formEmail,
      phone: this.formPhone || null,
      current_password: this.formCurrentPassword || '',
      new_password: this.formNewPassword || '',
    };

    this.http.put<{ message: string; user: { id: number; name: string; email: string; phone: string | null; role: string; created_at: string } }>(
      `${API_BASE}/users/profile`,
      payload
    ).subscribe({
      next: (res) => {
        this.toast.show('Profile updated successfully!', 'success');
        this.applyUserData(res.user);
        // Sync the user back to AuthService so navbar initials update
        const current = this.authUser();
        if (current) {
          this.auth.setUser({
            ...current,
            name: res.user.name,
            email: res.user.email,
            phone: res.user.phone,
          });
        }
        this.formCurrentPassword = '';
        this.formNewPassword = '';
        this.formConfirmPassword = '';
        this.editing.set(false);
        this.saving.set(false);
      },
      error: (err) => {
        if (err.status === 401) {
          this.toast.show('Current password is incorrect.', 'error');
        } else {
          this.toast.show(err.error?.message || 'Failed to update profile', 'error');
        }
        this.saving.set(false);
      },
    });
  }
}