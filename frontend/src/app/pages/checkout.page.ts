import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../core/cart.service';
import { OrderService } from '../core/order.service';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  template: `
    <h1>Checkout</h1>
    <p *ngIf="cart.items().length === 0">No items to checkout.</p>

    <form *ngIf="cart.items().length > 0" (ngSubmit)="placeOrder()" class="form">
      <label>
        Full Name
        <input name="name" [(ngModel)]="customer_name" required />
      </label>
      <label>
        Phone
        <input name="phone" [(ngModel)]="customer_phone" required />
      </label>
      <label>
        Shipping Address
        <textarea name="address" [(ngModel)]="shipping_address" required></textarea>
      </label>

      <div class="summary">
        <p>Subtotal: {{ cart.subtotal() | currency:'PHP':'symbol':'1.2-2' }}</p>
        <p>Shipping: {{ shippingFee | currency:'PHP':'symbol':'1.2-2' }}</p>
        <strong>Total: {{ cart.subtotal() + shippingFee | currency:'PHP':'symbol':'1.2-2' }}</strong>
      </div>

      <button type="submit" [disabled]="loading">{{ loading ? 'Placing order...' : 'Place Order' }}</button>
      <p class="msg" *ngIf="message">{{ message }}</p>
    </form>
  `,
  styles: [
    `.form{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1rem;max-width:640px;display:grid;gap:.8rem}`,
    `label{display:grid;gap:.35rem;font-weight:600}`,
    `input,textarea{padding:.65rem .75rem;border-radius:10px;border:1px solid #cdd4db;font:inherit}`,
    `textarea{min-height:110px;resize:vertical}`,
    `.summary{background:#f8fafc;border-radius:10px;padding:.8rem}`,
    `button{border:0;background:#0f766e;color:#fff;padding:.7rem 1rem;border-radius:10px}`,
    `.msg{font-weight:600}`,
  ],
})
export class CheckoutPageComponent {
  customer_name = '';
  customer_phone = '';
  shipping_address = '';
  shippingFee = 80;
  loading = false;
  message = '';

  constructor(private orderService: OrderService, public cart: CartService, private router: Router) {}

  placeOrder() {
    if (this.cart.items().length === 0 || this.loading) {
      return;
    }

    this.loading = true;
    this.message = '';

    this.orderService
      .checkout({
        customer_name: this.customer_name,
        customer_phone: this.customer_phone,
        shipping_address: this.shipping_address,
        items: this.cart.items().map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      })
      .subscribe({
        next: (res) => {
          this.cart.clear();
          this.loading = false;
          this.message = `Order #${res.order_id} placed successfully.`;
          setTimeout(() => this.router.navigateByUrl('/orders'), 700);
        },
        error: (err) => {
          this.loading = false;
          this.message = err?.error?.message ?? 'Failed to place order';
        },
      });
  }
}
