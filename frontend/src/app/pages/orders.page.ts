import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { OrderService } from '../core/order.service';
import { Order } from '../models/types';
import { OrderTimelineComponent } from './order-timeline.component';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, OrderTimelineComponent],
  template: `
    <h1>My Orders</h1>
    <p *ngIf="orders().length === 0">No orders yet.</p>

    <section class="list" *ngIf="orders().length > 0">
      <article *ngFor="let order of orders()" class="order">
        <header>
          <h3>Order #{{ order.id }}</h3>
          <span class="status">{{ order.status }}</span>
        </header>
        <p>Date: {{ order.created_at | date:'medium' }}</p>
        <p>Total: <strong>{{ order.total | currency:'PHP':'symbol':'1.2-2' }}</strong></p>
        <app-order-timeline [status]="order.status"></app-order-timeline>
        <details>
          <summary>View items ({{ order.items.length }})</summary>
          <ul>
            <li *ngFor="let item of order.items">
              {{ item.product_name }} x{{ item.quantity }} - {{ item.line_total | currency:'PHP':'symbol':'1.2-2' }}
            </li>
          </ul>
        </details>
      </article>
    </section>
  `,
  styles: [
    `.list{display:grid;gap:.8rem}`,
    `.order{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:.9rem}`,
    `header{display:flex;justify-content:space-between;align-items:center}`,
    `.status{text-transform:capitalize;background:#dbeafe;color:#1e3a8a;padding:.2rem .55rem;border-radius:999px;font-size:.8rem}`,
    `details{margin-top:.4rem}`,
    `summary{cursor:pointer;color:#0f766e;font-weight:700}`,
    `ul{margin:0;padding-left:1.1rem}`,
  ],
})
export class OrdersPageComponent {
  orders = signal<Order[]>([]);

  constructor(private orderService: OrderService) {
    this.reload();
  }

  reload() {
    this.orderService.myOrders().subscribe((res) => this.orders.set(res.orders));
  }
}
