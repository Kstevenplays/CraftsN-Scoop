import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { API_BASE } from '../core/api';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { OrderService } from '../core/order.service';
import { ProductService } from '../core/product.service';
import { ToastService } from '../core/toast.service';
import { Order, Product } from '../models/types';

type AdminTab = 'dashboard' | 'products' | 'orders' | 'settings';
type OrdersFilter = 'all' | 'pending_payment' | 'payment_submitted' | 'confirmed' | 'shipped' | 'delivered';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  template: `
    <!-- Admin Top Bar -->
    <header class="admin-topbar">
      <div class="topbar-left">
        <div class="topbar-logo">CNS</div>
        <div class="topbar-brand">
          <span class="brand-name">Crafts N' Scoop</span>
          <span class="brand-sub">Admin Panel</span>
        </div>
      </div>
      <div class="topbar-right">
        <div class="admin-avatar">{{ adminInitials }}</div>
        <span class="admin-name">{{ auth.user()?.name }}</span>
        <button class="btn-logout" (click)="logout()">Logout</button>
      </div>
    </header>

    <div class="admin-body">
      <!-- Admin Sidebar -->
      <aside class="admin-sidebar">
        <div class="sidebar-menu-label">MENU</div>
        <nav class="sidebar-nav">
          <button class="sidebar-link" [class.active]="tab() === 'dashboard'" (click)="tab.set('dashboard')">
            <span class="link-icon">📊</span> Dashboard
          </button>
          <button class="sidebar-link" [class.active]="tab() === 'products'" (click)="tab.set('products')">
            <span class="link-icon">📦</span> Products
          </button>
          <button class="sidebar-link" [class.active]="tab() === 'orders'" (click)="tab.set('orders')">
            <span class="link-icon">🧾</span> Orders
          </button>
          <button class="sidebar-link" [class.active]="tab() === 'settings'" (click)="tab.set('settings')">
            <span class="link-icon">⚙️</span> Settings
          </button>
        </nav>
        <div class="sidebar-footer">Crafts N' Scoop © 2026</div>
      </aside>

      <!-- Main Content Area -->
      <main class="admin-content">
        <!-- TAB: Dashboard -->
        <ng-container *ngIf="tab() === 'dashboard'">
          <div class="page-header">
            <h2>Dashboard</h2>
            <span class="page-date">{{ todayDate }}</span>
          </div>

          <div class="stat-cards">
            <div class="stat-card stat-coral">
              <div class="stat-icon">📦</div>
              <div class="stat-info">
                <span class="stat-num">{{ stats.totalProducts }}</span>
                <span class="stat-label">Total Products</span>
              </div>
            </div>
            <div class="stat-card stat-blue">
              <div class="stat-icon">🧾</div>
              <div class="stat-info">
                <span class="stat-num">{{ stats.totalOrders }}</span>
                <span class="stat-label">Total Orders</span>
              </div>
            </div>
            <div class="stat-card stat-orange">
              <div class="stat-icon">⏳</div>
              <div class="stat-info">
                <span class="stat-num">{{ stats.pendingPayments }}</span>
                <span class="stat-label">Pending Payments</span>
              </div>
            </div>
            <div class="stat-card stat-green">
              <div class="stat-icon">🔄</div>
              <div class="stat-info">
                <span class="stat-num">{{ stats.ordersToProcess }}</span>
                <span class="stat-label">Orders to Process</span>
              </div>
            </div>
          </div>

          <div class="section-card">
            <h3>Recent Orders</h3>
            <table class="data-table" *ngIf="recentOrders.length > 0">
              <thead>
                <tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let o of recentOrders">
                  <td>#{{ o.id }}</td>
                  <td>{{ o.customer_name }}</td>
                  <td>{{ o.created_at | date:'mediumDate' }}</td>
                  <td>{{ o.total | currency:'PHP':'symbol':'1.2-2' }}</td>
                  <td><span class="badge" [class]="'badge-' + badgeClass(o.payment_status)">{{ o.payment_status }}</span></td>
                  <td><span class="badge" [class]="'badge-' + o.status">{{ o.status }}</span></td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" *ngIf="recentOrders.length === 0">
              <p>No orders yet</p>
            </div>
          </div>
        </ng-container>

        <!-- TAB: Products -->
        <ng-container *ngIf="tab() === 'products'">
          <div class="page-header">
            <h2>Products</h2>
            <button class="btn-primary" (click)="openProductDrawer()">+ Add Product</button>
          </div>

          <div class="section-card">
            <table class="data-table" *ngIf="products().length > 0">
              <thead>
                <tr><th style="width:50px">Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th style="width:140px">Actions</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of products()">
                  <td><img [src]="p.image_url" class="thumb" *ngIf="p.image_url" /><span *ngIf="!p.image_url" class="no-img">—</span></td>
                  <td>{{ p.name }}</td>
                  <td>{{ p.category || 'Crafts' }}</td>
                  <td>{{ p.price | currency:'PHP':'symbol':'1.2-2' }}</td>
                  <td>{{ p.stock }}</td>
                  <td class="action-cell">
                    <button class="btn-outline" (click)="editProduct(p)">Edit</button>
                    <button class="btn-danger" (click)="deleteProduct(p.id)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" *ngIf="products().length === 0"><p>No products yet</p></div>
          </div>

          <!-- Product Drawer -->
          <div class="drawer-overlay" *ngIf="productDrawerOpen()" (click)="closeProductDrawer()">
            <div class="drawer" (click)="$event.stopPropagation()">
              <div class="drawer-header">
                <h3>{{ editingProductId ? 'Edit Product' : 'Add Product' }}</h3>
                <button class="drawer-close" (click)="closeProductDrawer()">✕</button>
              </div>
              <form (ngSubmit)="saveProduct()" class="drawer-form">
                <label>Product Name<input name="pname" [(ngModel)]="productForm.name" required /></label>
                <label>Description<textarea name="pdesc" [(ngModel)]="productForm.description" rows="3"></textarea></label>
                <label>Category
                  <select name="pcat" [(ngModel)]="productForm.category">
                    <option value="Crafts">Crafts</option>
                    <option value="Scoops">Scoops</option>
                    <option value="Bundles">Bundles</option>
                  </select>
                </label>
                <label>Price (₱)<input name="pprice" type="number" step="0.01" [(ngModel)]="productForm.price" required /></label>
                <label>Stock<input name="pstock" type="number" [(ngModel)]="productForm.stock" required /></label>
                <label>Image URL<input name="pimg" [(ngModel)]="productForm.image_url" /></label>
                <div class="drawer-actions">
                  <button type="button" class="btn-outline" (click)="closeProductDrawer()">Cancel</button>
                  <button type="submit" class="btn-primary">{{ editingProductId ? 'Update' : 'Save' }}</button>
                </div>
              </form>
            </div>
          </div>
        </ng-container>

        <!-- TAB: Orders -->
        <ng-container *ngIf="tab() === 'orders'">
          <div class="page-header"><h2>Orders</h2></div>

          <div class="filter-tabs">
            <button class="filter-tab" [class.active]="ordersFilter() === 'all'" (click)="ordersFilter.set('all')">All</button>
            <button class="filter-tab" [class.active]="ordersFilter() === 'pending_payment'" (click)="ordersFilter.set('pending_payment')">Pending Payment</button>
            <button class="filter-tab" [class.active]="ordersFilter() === 'payment_submitted'" (click)="ordersFilter.set('payment_submitted')">Payment Submitted</button>
            <button class="filter-tab" [class.active]="ordersFilter() === 'confirmed'" (click)="ordersFilter.set('confirmed')">Confirmed</button>
            <button class="filter-tab" [class.active]="ordersFilter() === 'shipped'" (click)="ordersFilter.set('shipped')">Shipped</button>
            <button class="filter-tab" [class.active]="ordersFilter() === 'delivered'" (click)="ordersFilter.set('delivered')">Delivered</button>
          </div>

          <div class="section-card">
            <table class="data-table" *ngIf="filteredOrders.length > 0">
              <thead>
                <tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th style="width:260px">Actions</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let o of filteredOrders">
                  <td>#{{ o.id }}</td>
                  <td>{{ o.customer_name }}</td>
                  <td>{{ o.created_at | date:'shortDate' }}</td>
                  <td>{{ o.items?.length || 0 }}</td>
                  <td>{{ o.total | currency:'PHP':'symbol':'1.2-2' }}</td>
                  <td><span class="badge" [class]="'badge-' + badgeClass(o.payment_status)">{{ o.payment_status }}</span></td>
                  <td><span class="badge" [class]="'badge-' + o.status">{{ o.status }}</span></td>
                  <td class="action-cell">
                    <button *ngIf="o.receipt_url" class="btn-sm-outline" (click)="viewReceipt(o.receipt_url)">View Receipt</button>
                    <button *ngIf="o.payment_status === 'payment_submitted'" class="btn-sm-success" (click)="confirmPayment(o.id)">Confirm</button>
                    <button *ngIf="o.payment_status === 'payment_submitted'" class="btn-sm-danger" (click)="rejectPayment(o.id)">Reject</button>
                    <select class="status-select" [ngModel]="o.status" (ngModelChange)="updateOrderStatus(o.id, $event)">
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" *ngIf="filteredOrders.length === 0"><p>No orders match this filter</p></div>
          </div>
        </ng-container>

        <!-- TAB: Settings -->
        <ng-container *ngIf="tab() === 'settings'">
          <div class="page-header"><h2>Settings</h2></div>
          <div class="section-card settings-card" style="max-width:480px">
            <h3>Shipping & Delivery</h3>
            <div class="settings-field">
              <label>Flat Shipping Fee</label>
              <div class="input-prefix">
                <span class="prefix">₱</span>
                <input type="number" step="0.01" [(ngModel)]="shippingFee" />
              </div>
            </div>
            <button class="btn-primary" (click)="saveShippingFee()">Save</button>
          </div>
        </ng-container>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

    /* ── Top Bar ── */
    .admin-topbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 64px;
      z-index: 30;
      background: #1A0F0A;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
    }
    .topbar-left { display: flex; align-items: center; gap: 0.75rem; }
    .topbar-logo {
      width: 36px; height: 36px;
      border-radius: 8px;
      background: #E8633A;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    .topbar-brand { display: flex; flex-direction: column; }
    .brand-name { font-weight: 900; font-size: 0.95rem; color: #fff; letter-spacing: 0; }
    .brand-sub { font-size: 0.7rem; color: #E8633A; font-weight: 700; }
    .topbar-right { display: flex; align-items: center; gap: 0.75rem; }
    .admin-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: #E8633A;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 0.7rem;
    }
    .admin-name { font-weight: 700; font-size: 0.85rem; color: rgba(255,255,255,0.9); }
    .btn-logout {
      border: 1px solid rgba(255,255,255,0.35);
      background: transparent;
      color: #fff;
      padding: 0.35rem 0.75rem;
      border-radius: 0.35rem;
      font-weight: 700;
      font-size: 0.8rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-logout:hover { background: rgba(255,255,255,0.1); }

    /* ── Body ── */
    .admin-body {
      display: flex;
      margin-top: 64px;
      min-height: calc(100vh - 64px);
      background: #F5F0EB;
    }

    /* ── Sidebar ── */
    .admin-sidebar {
      position: fixed;
      top: 64px;
      left: 0;
      bottom: 0;
      width: 240px;
      background: #2C1810;
      display: flex;
      flex-direction: column;
      padding: 1rem 0;
    }
    .sidebar-menu-label {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.3);
      padding: 0 1.25rem;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .sidebar-nav { flex: 1; }
    .sidebar-link {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      padding: 0.7rem 1.25rem;
      font: inherit;
      font-weight: 700;
      font-size: 0.88rem;
      color: rgba(255,255,255,0.7);
      cursor: pointer;
      border-left: 3px solid transparent;
      transition: all 0.12s;
    }
    .sidebar-link:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .sidebar-link.active {
      background: rgba(232,99,58,0.12);
      color: #E8633A;
      border-left-color: #E8633A;
    }
    .link-icon { font-size: 1rem; }
    .sidebar-footer {
      padding: 1rem 1.25rem;
      font-size: 0.7rem;
      color: rgba(255,255,255,0.25);
    }

    /* ── Main Content ── */
    .admin-content {
      margin-left: 240px;
      flex: 1;
      padding: 2rem;
      min-height: calc(100vh - 64px);
    }

    /* ── Common ── */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .page-header h2 { margin: 0; font-size: 1.35rem; color: #3B1F0E; letter-spacing: 0; }
    .page-date { font-size: 0.82rem; color: #7a4a2e; font-weight: 600; }

    .section-card {
      background: #fff;
      border-radius: 10px;
      padding: 1.25rem;
      box-shadow: 0 2px 8px rgba(59,31,14,0.06);
      margin-bottom: 1.25rem;
    }
    .section-card h3 { margin: 0 0 0.75rem; font-size: 1rem; color: #3B1F0E; letter-spacing: 0; }

    /* ── Stat Cards ── */
    .stat-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .stat-card {
      background: #fff;
      border-radius: 10px;
      padding: 1.15rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      box-shadow: 0 2px 8px rgba(59,31,14,0.06);
    }
    .stat-icon { font-size: 1.6rem; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-num { font-size: 1.5rem; font-weight: 900; color: #3B1F0E; line-height: 1.2; }
    .stat-label { font-size: 0.75rem; font-weight: 700; color: #7a4a2e; }

    /* ── Buttons ── */
    .btn-primary {
      border: 0; background: #E8633A; color: #fff;
      padding: 0.5rem 1rem; border-radius: 6px;
      font-weight: 800; font-size: 0.85rem; cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-primary:hover { opacity: 0.85; }
    .btn-outline {
      border: 1.5px solid #E8633A; background: transparent; color: #E8633A;
      padding: 0.35rem 0.7rem; border-radius: 5px;
      font-weight: 800; font-size: 0.78rem; cursor: pointer;
    }
    .btn-danger {
      border: 1.5px solid #c62828; background: transparent; color: #c62828;
      padding: 0.35rem 0.7rem; border-radius: 5px;
      font-weight: 800; font-size: 0.78rem; cursor: pointer;
    }
    .btn-sm-outline {
      border: 1px solid #7a4a2e; background: transparent; color: #7a4a2e;
      padding: 0.2rem 0.5rem; border-radius: 4px;
      font-weight: 700; font-size: 0.72rem; cursor: pointer;
    }
    .btn-sm-success {
      border: 0; background: #2e7d32; color: #fff;
      padding: 0.2rem 0.5rem; border-radius: 4px;
      font-weight: 700; font-size: 0.72rem; cursor: pointer;
    }
    .btn-sm-danger {
      border: 0; background: #c62828; color: #fff;
      padding: 0.2rem 0.5rem; border-radius: 4px;
      font-weight: 700; font-size: 0.72rem; cursor: pointer;
    }

    /* ── Table ── */
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      text-align: left;
      padding: 0.55rem 0.5rem 0.55rem 0;
      border-bottom: 2px solid #EDE5DD;
      font-weight: 800;
      font-size: 0.78rem;
      color: #3B1F0E;
    }
    .data-table td {
      padding: 0.55rem 0.5rem 0.55rem 0;
      border-bottom: 1px solid #EDE5DD;
      font-size: 0.85rem;
      color: #3B1F0E;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .thumb { width: 38px; height: 38px; object-fit: cover; border-radius: 6px; }
    .no-img { color: #bdbdbd; }
    .action-cell { display: flex; gap: 0.3rem; flex-wrap: wrap; align-items: center; }
    .status-select {
      padding: 0.2rem 0.35rem;
      border: 1px solid rgba(59,31,14,0.15);
      border-radius: 4px;
      background: #fff;
      color: #3B1F0E;
      font-weight: 700;
      font-size: 0.72rem;
      outline: none;
    }

    /* ── Badges ── */
    .badge {
      display: inline-block;
      text-transform: capitalize;
      padding: 0.18rem 0.5rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 800;
    }
    .badge-pending, .badge-pending_payment { background: #f5f5f5; color: #616161; }
    .badge-processing, .badge-payment_submitted { background: #e3f2fd; color: #007DFF; }
    .badge-shipped { background: #fff3e0; color: #E8A020; }
    .badge-delivered { background: #e8f5e9; color: #1D9E75; }
    .badge-completed, .badge-payment_confirmed, .badge-confirmed { background: #e8f5e9; color: #0F6E56; }
    .badge-cancelled, .badge-failed { background: #fce4ec; color: #E24B4A; }

    /* ── Filter Tabs ── */
    .filter-tabs {
      display: flex;
      gap: 0.35rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .filter-tab {
      border: 1px solid rgba(59,31,14,0.12);
      background: #fff;
      color: #7a4a2e;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.78rem;
      cursor: pointer;
    }
    .filter-tab.active { background: #E8633A; color: #fff; border-color: #E8633A; }

    /* ── Drawer ── */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0,0,0,0.3);
    }
    .drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: min(90vw, 420px);
      height: 100vh;
      background: #fff;
      box-shadow: -8px 0 32px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
    }
    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem;
      border-bottom: 1px solid #EDE5DD;
    }
    .drawer-header h3 { margin: 0; color: #3B1F0E; font-size: 1.05rem; letter-spacing: 0; }
    .drawer-close {
      border: 0; background: transparent;
      font-size: 1.2rem; cursor: pointer; color: #7a4a2e;
    }
    .drawer-form { padding: 1.25rem; overflow-y: auto; flex: 1; }
    .drawer-form label {
      display: block;
      margin-bottom: 0.85rem;
      font-weight: 700;
      font-size: 0.82rem;
      color: #3B1F0E;
    }
    .drawer-form input, .drawer-form textarea, .drawer-form select {
      width: 100%; box-sizing: border-box;
      margin-top: 0.3rem;
      padding: 0.5rem 0.65rem;
      border: 1px solid rgba(59,31,14,0.15);
      border-radius: 6px;
      background: #F8F5F0;
      color: #3B1F0E;
      font: inherit;
      outline: none;
      transition: border-color 0.15s;
    }
    .drawer-form input:focus, .drawer-form textarea:focus, .drawer-form select:focus {
      border-color: #E8633A;
      box-shadow: 0 0 0 2px rgba(232,99,58,0.12);
    }
    .drawer-actions {
      display: flex;
      gap: 0.65rem;
      margin-top: 1rem;
    }
    .drawer-actions button { flex: 1; }

    /* ── Settings ── */
    .settings-field { margin-bottom: 1rem; }
    .settings-field label {
      display: block;
      font-weight: 700;
      font-size: 0.85rem;
      color: #3B1F0E;
      margin-bottom: 0.35rem;
    }
    .input-prefix {
      display: flex;
      align-items: center;
      border: 1px solid rgba(59,31,14,0.15);
      border-radius: 6px;
      background: #F8F5F0;
      overflow: hidden;
    }
    .input-prefix .prefix {
      padding: 0.5rem 0.65rem;
      font-weight: 800;
      color: #7a4a2e;
      background: #EDE5DD;
    }
    .input-prefix input {
      flex: 1;
      border: none;
      padding: 0.5rem 0.65rem;
      background: transparent;
      color: #3B1F0E;
      font: inherit;
      outline: none;
    }
    .input-prefix:focus-within { border-color: #E8633A; box-shadow: 0 0 0 2px rgba(232,99,58,0.12); }

    .empty-state {
      padding: 2rem;
      text-align: center;
      color: #7a4a2e;
      font-weight: 700;
    }
    .empty-state p { margin: 0; }

    @media (max-width: 1100px) {
      .stat-cards { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .admin-sidebar { width: 60px; }
      .admin-sidebar .sidebar-menu-label { display: none; }
      .admin-sidebar .sidebar-link span:not(.link-icon) { display: none; }
      .admin-content { margin-left: 60px; padding: 1rem; }
      .stat-cards { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class AdminPageComponent {
  tab = signal<AdminTab>('dashboard');

  // Dashboard
  stats = { totalProducts: 0, totalOrders: 0, pendingPayments: 0, ordersToProcess: 0 };
  recentOrders: any[] = [];
  todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Products
  products = signal<Product[]>([]);
  productDrawerOpen = signal(false);
  editingProductId: number | null = null;
  productForm = { name: '', description: '', category: 'Crafts', price: 0, stock: 0, image_url: '' };

  // Orders
  orders = signal<any[]>([]);
  ordersFilter = signal<OrdersFilter>('all');

  // Settings
  shippingFee = 80;

  constructor(
    public auth: AuthService,
    private http: HttpClient,
    private router: Router,
    private cart: CartService,
    private productService: ProductService,
    private orderService: OrderService,
    private toast: ToastService
  ) {
    this.loadDashboard();
    this.loadProducts();
    this.loadOrders();
    this.loadShippingFee();
  }

  get adminInitials(): string {
    const user = this.auth.user();
    if (!user) return '';
    return user.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  logout() {
    this.cart.persistToStorage();
    this.auth.logout();
  }

  get filteredOrders(): any[] {
    const filter = this.ordersFilter();
    if (filter === 'all') return this.orders();
    if (filter === 'confirmed') return this.orders().filter((o: any) => o.payment_status === 'payment_confirmed');
    return this.orders().filter((o: any) => o.payment_status === filter || o.status === filter);
  }

  /* ── Dashboard ── */
  private loadDashboard() {
    this.http.get<{ products: any[] }>(`${API_BASE}/products?admin=1`).subscribe(res => {
      this.stats.totalProducts = res.products.length;
    });
    this.http.get<{ orders: any[] }>(`${API_BASE}/admin/orders`).subscribe(res => {
      this.stats.totalOrders = res.orders.length;
      this.stats.pendingPayments = res.orders.filter((o: any) => o.payment_status === 'pending_payment').length;
      this.stats.ordersToProcess = res.orders.filter((o: any) =>
        o.payment_status === 'payment_confirmed' || o.payment_status === 'payment_submitted'
      ).length;
      this.recentOrders = res.orders.slice(0, 5);
    });
  }

  /* ── Products ── */
  private loadProducts() {
    this.productService.getProducts(true).subscribe(res => this.products.set(res.products));
  }

  openProductDrawer() {
    this.editingProductId = null;
    this.productForm = { name: '', description: '', category: 'Crafts', price: 0, stock: 0, image_url: '' };
    this.productDrawerOpen.set(true);
  }

  editProduct(p: Product) {
    this.editingProductId = p.id;
    this.productForm = {
      name: p.name,
      description: p.description || '',
      category: (p as any).category || 'Crafts',
      price: p.price,
      stock: p.stock,
      image_url: p.image_url || '',
    };
    this.productDrawerOpen.set(true);
  }

  closeProductDrawer() { this.productDrawerOpen.set(false); }

  saveProduct() {
    const payload = { ...this.productForm, is_active: 1 };
    const req = this.editingProductId
      ? this.productService.updateProduct(this.editingProductId, payload)
      : this.productService.createProduct(payload);
    req.subscribe({
      next: () => {
        this.toast.show(this.editingProductId ? 'Product updated!' : 'Product created!', 'success');
        this.closeProductDrawer();
        this.loadProducts();
        this.loadDashboard();
      },
      error: (err) => this.toast.show(err.error?.message || 'Failed to save product', 'error'),
    });
  }

  deleteProduct(id: number) {
    if (!confirm('Delete this product?')) return;
    this.productService.deleteProduct(id).subscribe({
      next: () => { this.toast.show('Product deleted', 'success'); this.loadProducts(); this.loadDashboard(); },
      error: (err) => this.toast.show(err.error?.message || 'Failed to delete', 'error'),
    });
  }

  /* ── Orders ── */
  private loadOrders() {
    this.orderService.allOrders().subscribe(res => this.orders.set(res.orders));
  }

  viewReceipt(url: string) { window.open(url, '_blank'); }

  confirmPayment(orderId: number) {
    this.http.patch(`${API_BASE}/admin/orders/${orderId}/payment`, { payment_status: 'payment_confirmed' })
      .subscribe({
        next: () => { this.toast.show('Payment confirmed!', 'success'); this.loadOrders(); this.loadDashboard(); },
        error: (err) => this.toast.show(err.error?.message || 'Failed', 'error'),
      });
  }

  rejectPayment(orderId: number) {
    this.http.patch(`${API_BASE}/admin/orders/${orderId}/payment`, { payment_status: 'failed' })
      .subscribe({
        next: () => { this.toast.show('Payment rejected', 'info'); this.loadOrders(); this.loadDashboard(); },
        error: (err) => this.toast.show(err.error?.message || 'Failed', 'error'),
      });
  }

  updateOrderStatus(orderId: number, status: string) {
    this.orderService.updateOrderStatus(orderId, status).subscribe({
      next: () => { this.loadOrders(); this.loadDashboard(); },
      error: (err) => this.toast.show(err.error?.message || 'Failed', 'error'),
    });
  }

  /* ── Settings ── */
  private loadShippingFee() {
    this.http.get<{ shipping_fee: number }>(`${API_BASE}/admin/settings/shipping-fee`).subscribe({
      next: (res) => this.shippingFee = res.shipping_fee,
      error: () => {},
    });
  }

  saveShippingFee() {
    this.http.put(`${API_BASE}/admin/settings/shipping-fee`, { shipping_fee: this.shippingFee })
      .subscribe({
        next: () => this.toast.show('Shipping fee updated!', 'success'),
        error: (err) => this.toast.show(err.error?.message || 'Failed', 'error'),
      });
  }

  badgeClass(status: string): string {
    const map: Record<string, string> = {
      'pending_payment': 'pending_payment',
      'payment_submitted': 'payment_submitted',
      'payment_confirmed': 'payment_confirmed',
      'failed': 'failed',
    };
    return map[status] || status;
  }
}