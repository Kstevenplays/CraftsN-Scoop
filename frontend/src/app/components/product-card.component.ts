import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../models/types';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="card">
      <img [src]="product.image_url" [alt]="product.name" />
      <h3>{{ product.name }}</h3>
      <p class="desc">{{ product.description }}</p>
      <div class="meta">
        <strong>{{ product.price | currency:'PHP':'symbol':'1.2-2' }}</strong>
        <span>Stock: {{ product.stock }}</span>
      </div>
      <div class="actions">
        <a [routerLink]="['/shop', product.id]">Details</a>
        <button
          type="button"
          class="add-button"
          [class.added]="added"
          [class.bounce]="bouncing"
          (click)="addToCart($event)"
        >
          <span>{{ added ? '✓ Added!' : 'Add to cart' }}</span>
        </button>
      </div>
    </article>
  `,
  styles: [
    `.card{background:var(--cns-card);border:1px solid var(--cns-border);border-radius:var(--cns-radius);padding:.85rem;display:flex;flex-direction:column;gap:.65rem;box-shadow:var(--cns-shadow)}`,
    `.card img{width:100%;height:170px;object-fit:cover;border-radius:.45rem}`,
    `.card h3{margin:0;font-size:1rem;color:var(--cns-brown);letter-spacing:0}`,
    `.desc{margin:0;color:var(--cns-brown-soft);line-height:1.4}`,
    `.meta{display:flex;justify-content:space-between;align-items:center;font-size:.85rem;color:var(--cns-brown-soft)}`,
    `.meta strong{color:var(--cns-brown)}`,
    `.actions{display:flex;justify-content:space-between;align-items:center}`,
    `.actions a{text-decoration:none;color:var(--cns-coral);font-weight:900}`,
    `.add-button{min-width:6.9rem;border:0;background:var(--cns-coral);color:#fff;padding:.48rem .75rem;border-radius:.45rem;font-weight:900;cursor:pointer;transition:background-color .28s ease,transform .18s ease,box-shadow .28s ease;box-shadow:0 8px 18px rgba(232,99,58,.22)}`,
    `.add-button span{display:inline-block;animation:fadeText .18s ease}`,
    `.add-button.bounce{animation:addPress .42s cubic-bezier(.2,.9,.3,1.2)}`,
    `.add-button.added{background:#1d9e75;box-shadow:0 10px 22px rgba(29,158,117,.22)}`,
    `@keyframes addPress{0%{transform:scale(1)}35%{transform:scale(.95)}70%{transform:scale(1.05)}100%{transform:scale(1)}}`,
    `@keyframes fadeText{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}`,
  ],
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() add = new EventEmitter<Product>();
  added = false;
  bouncing = false;
  private resetTimer: number | null = null;

  addToCart(event: MouseEvent) {
    this.add.emit(this.product);
    this.playButtonAnimation();
    this.flyToCart(event.currentTarget as HTMLElement);
  }

  private playButtonAnimation() {
    if (this.resetTimer) {
      window.clearTimeout(this.resetTimer);
    }

    this.added = true;
    this.bouncing = false;
    window.requestAnimationFrame(() => {
      this.bouncing = true;
    });

    window.setTimeout(() => {
      this.bouncing = false;
    }, 430);

    this.resetTimer = window.setTimeout(() => {
      this.added = false;
      this.resetTimer = null;
    }, 1500);
  }

  private flyToCart(source: HTMLElement) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const target = document.querySelector('.cart-link');
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const flyer = document.createElement('span');

    flyer.className = 'cart-flyer';
    flyer.textContent = '+';
    flyer.style.left = `${from.left + from.width / 2}px`;
    flyer.style.top = `${from.top + from.height / 2}px`;
    document.body.appendChild(flyer);

    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    flyer
      .animate(
        [
          { transform: 'translate(-50%, -50%) scale(.75)', opacity: 0 },
          { transform: 'translate(-50%, -110%) scale(1.2)', opacity: 1, offset: 0.18 },
          { transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy - 70}px)) scale(1)`, opacity: 1, offset: 0.68 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.35)`, opacity: 0 },
        ],
        { duration: 760, easing: 'cubic-bezier(.22,.9,.24,1)' }
      )
      .addEventListener('finish', () => flyer.remove());
  }
}
