import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { API_BASE } from '../core/api';
import { CartService } from '../core/cart.service';
import { OrderService } from '../core/order.service';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  template: `
    <div class="checkout-wrapper">
      <div class="checkout-card">
        <h1>Checkout</h1>
        <p *ngIf="cart.items().length === 0" class="empty-msg">No items to checkout.</p>

        <form *ngIf="cart.items().length > 0" #checkoutForm="ngForm">
          <div class="form-fields">
            <div class="field">
              <label for="name">Full Name</label>
              <input id="name" name="name" [(ngModel)]="customer_name" required placeholder="Enter your full name" />
            </div>
            <div class="field">
              <label for="phone">Phone</label>
              <input id="phone" name="phone" [(ngModel)]="customer_phone" required placeholder="Enter your phone number" />
            </div>
            <div class="field">
              <label for="email">Email Address</label>
              <input id="email" name="email" type="email" [(ngModel)]="customer_email" required placeholder="Enter your email address" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$" />
            </div>
            <div class="field">
              <label for="address">Shipping Address</label>
              <textarea id="address" name="address" [(ngModel)]="shipping_address" required placeholder="Enter your shipping address"></textarea>
            </div>
          </div>

          <div class="summary">
            <div class="summary-row"><span>Subtotal</span><span>{{ cart.subtotal() | currency:'PHP':'symbol':'1.2-2' }}</span></div>
            <div class="summary-row"><span>Shipping</span><span>{{ shippingFee | currency:'PHP':'symbol':'1.2-2' }}</span></div>
            <div class="summary-row total"><span>Total</span><span>{{ cart.subtotal() + shippingFee | currency:'PHP':'symbol':'1.2-2' }}</span></div>
          </div>

          <div class="payment-section">
            <div class="payment-label">Payment Method</div>
            <div class="payment-option selected">
              <div class="option-left">
                <span class="gcash-icon">📲</span>
                <div>
                  <div class="option-title">Pay via GCash</div>
                  <div class="option-sub">Scan QR to pay</div>
                </div>
              </div>
              <span class="check-mark">✓</span>
            </div>
          </div>

          <button type="button" class="btn-continue" [disabled]="!checkoutForm.form.valid || loading" (click)="continueToPayment()">
            {{ loading ? 'Processing…' : 'Continue' }}
          </button>
          <p class="msg" *ngIf="message">{{ message }}</p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .checkout-wrapper {
      min-height: calc(100vh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .checkout-card {
      width: 100%;
      max-width: 520px;
      background: #fff;
      border: 1px solid rgba(59,31,14,0.12);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(59,31,14,0.08);
      padding: 1.75rem;
    }
    .checkout-card h1 {
      margin: 0 0 1rem;
      color: #3B1F0E;
      font-size: 1.4rem;
      letter-spacing: 0;
    }
    .empty-msg { color: #7a4a2e; }
    .form-fields { display: grid; gap: 0.85rem; margin-bottom: 1rem; }
    .field label {
      display: block;
      font-weight: 800;
      font-size: 0.85rem;
      color: #3B1F0E;
      margin-bottom: 0.3rem;
    }
    .field input, .field textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 0.65rem 0.8rem;
      border: 1px solid rgba(59,31,14,0.15);
      border-radius: 8px;
      background: #FFF8F0;
      color: #3B1F0E;
      font: inherit;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field input:focus, .field textarea:focus {
      border-color: #E8633A;
      box-shadow: 0 0 0 3px rgba(232,99,58,0.12);
      background: #fff;
    }
    .field textarea { min-height: 90px; resize: vertical; }

    .summary {
      background: #FFF8F0;
      border: 1px solid rgba(59,31,14,0.1);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 0.25rem 0;
      color: #7a4a2e;
      font-size: 0.9rem;
    }
    .summary-row.total {
      border-top: 1px solid rgba(59,31,14,0.12);
      margin-top: 0.25rem;
      padding-top: 0.5rem;
      font-weight: 900;
      color: #3B1F0E;
      font-size: 1rem;
    }

    .payment-section { margin-bottom: 1rem; }
    .payment-label {
      font-weight: 800;
      font-size: 0.85rem;
      color: #3B1F0E;
      margin-bottom: 0.5rem;
    }
    .payment-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 2px solid #007DFF;
      background: #F0F7FF;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      cursor: default;
    }
    .option-left { display: flex; align-items: center; gap: 0.65rem; }
    .gcash-icon { font-size: 1.4rem; }
    .option-title { font-weight: 800; font-size: 0.9rem; color: #3B1F0E; }
    .option-sub { font-size: 0.78rem; color: #7a4a2e; margin-top: 0.15rem; }
    .check-mark {
      width: 24px; height: 24px;
      border-radius: 50%;
      background: #007DFF;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 900;
    }

    .btn-continue {
      width: 100%;
      border: 0;
      background: #E8633A;
      color: #fff;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-weight: 900;
      font-size: 0.95rem;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-continue:hover { opacity: 0.85; }
    .btn-continue:disabled { opacity: 0.5; cursor: not-allowed; }
    .msg { font-weight: 900; color: #3B1F0E; margin: 0.5rem 0 0; text-align: center; }
  `]
})
export class CheckoutPageComponent {
  customer_name = '';
  customer_phone = '';
  customer_email = '';
  shipping_address = '';
  shippingFee = 80;
  loading = false;
  message = '';

  constructor(
    private orderService: OrderService,
    public cart: CartService,
    private router: Router,
    private http: HttpClient
  ) {
    // Fetch shipping fee
    this.http.get<{ shipping_fee: number }>(`${API_BASE}/admin/settings/shipping-fee`).subscribe({
      next: (res) => this.shippingFee = res.shipping_fee,
      error: () => {},
    });
  }

  continueToPayment() {
    if (this.cart.items().length === 0 || this.loading) return;
    if (!this.customer_name || !this.customer_phone || !this.customer_email || !this.shipping_address) {
      this.message = 'Please fill in all fields';
      return;
    }

    this.loading = true;
    this.message = '';

    const subtotal = this.cart.subtotal();
    const totalAmount = subtotal + this.shippingFee;

    const payload = {
      full_name: this.customer_name,
      phone: this.customer_phone,
      email: this.customer_email,
      delivery_address: this.shipping_address,
      payment_method: 'gcash_qr',
      payment_status: 'pending_payment',
      items: this.cart.items().map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      })),
      subtotal: subtotal,
      shipping_fee: this.shippingFee,
      total_amount: totalAmount,
    };

    console.log('Checkout payload:', payload);

    this.orderService
      .checkout(payload)
      .subscribe({
        next: (res) => {
          console.log('Order placed successfully:', res);
          this.cart.clear();
          this.loading = false;
          this.router.navigate(['/checkout/gcash-payment'], {
            queryParams: { order_id: res.order_id, total: totalAmount }
          });
        },
        error: (err) => {
          console.error('Order placement error:', err);
          this.loading = false;
          this.message = err?.error?.message ?? 'Failed to place order';
        },
      });
  }
}