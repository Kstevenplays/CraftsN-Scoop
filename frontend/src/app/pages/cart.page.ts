import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  template: `
    <h1>Your Cart</h1>
    <p *ngIf="cart.items().length === 0">Your cart is empty.</p>

    <section *ngIf="cart.items().length > 0" class="list">
      <article *ngFor="let item of cart.items()" class="row">
        <img [src]="item.product.image_url" [alt]="item.product.name" />
        <div class="info">
          <h3>{{ item.product.name }}</h3>
          <p>{{ item.product.price | currency:'PHP':'symbol':'1.2-2' }}</p>
          <div class="qty">
            <button type="button" (click)="change(item.product.id, item.quantity - 1)">-</button>
            <span>{{ item.quantity }}</span>
            <button type="button" (click)="change(item.product.id, item.quantity + 1)">+</button>
          </div>
        </div>
        <div class="end">
          <strong>{{ item.product.price * item.quantity | currency:'PHP':'symbol':'1.2-2' }}</strong>
          <button type="button" (click)="cart.remove(item.product.id)">Remove</button>
        </div>
      </article>

      <footer>
        <p>Subtotal: <strong>{{ cart.subtotal() | currency:'PHP':'symbol':'1.2-2' }}</strong></p>
        <a routerLink="/checkout">Proceed to checkout</a>
      </footer>
    </section>
  `,
  styles: [
    `.list{display:flex;flex-direction:column;gap:.8rem}`,
    `.row{display:grid;grid-template-columns:120px 1fr auto;gap:1rem;align-items:center;background:var(--cns-card);border:1px solid var(--cns-border);border-radius:var(--cns-radius);padding:.85rem;box-shadow:var(--cns-shadow)}`,
    `.row img{width:120px;height:95px;object-fit:cover;border-radius:.45rem}`,
    `.info h3{margin:.1rem 0;color:var(--cns-brown);letter-spacing:0}`,
    `.info p{color:var(--cns-brown-soft);margin:.2rem 0 .5rem}`,
    `.qty{display:flex;align-items:center;gap:.5rem}`,
    `.qty span{min-width:1.5rem;text-align:center;font-weight:900;color:var(--cns-brown)}`,
    `.qty button,.end button{border:0;background:var(--cns-coral);color:#fff;padding:.3rem .65rem;border-radius:.45rem;font-weight:900;cursor:pointer}`,
    `.end{display:flex;flex-direction:column;align-items:flex-end;gap:.5rem}`,
    `.end strong{color:var(--cns-brown)}`,
    `footer{display:flex;justify-content:space-between;align-items:center;margin-top:.8rem}`,
    `footer p{margin:0;color:var(--cns-brown-soft)}`,
    `footer a{text-decoration:none;background:var(--cns-coral);color:#fff;padding:.65rem 1rem;border-radius:.45rem;font-weight:900}`,
    `@media (max-width: 820px){.row{grid-template-columns:1fr;}.row img{width:100%;height:180px}.end{align-items:flex-start}}`
  ],
})
export class CartPageComponent {
  constructor(public cart: CartService) {}

  change(productId: number, quantity: number) {
    this.cart.setQuantity(productId, Math.max(1, quantity));
  }
}
