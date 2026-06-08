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
    `.order{background:var(--cns-card);border:1px solid var(--cns-border);border-radius:var(--cns-radius);padding:.95rem;box-shadow:var(--cns-shadow)}`,
    `header{display:flex;justify-content:space-between;align-items:center}`,
    `.status{text-transform:capitalize;background:var(--cns-cream-strong);color:var(--cns-coral);border:1px solid rgba(232,99,58,.25);padding:.25rem .6rem;border-radius:999px;font-size:.8rem;font-weight:900}`,
    `.order h3{margin:0;color:var(--cns-brown);letter-spacing:0}`,
    `.order p{margin:.35rem 0;color:var(--cns-brown-soft)}`,
    `details{margin-top:.4rem}`,
    `summary{cursor:pointer;color:var(--cns-coral);font-weight:900}`,
    `ul{margin:0;padding-left:1.1rem}`,
    `li{color:var(--cns-brown-soft);line-height:1.5}`,
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
