import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { ProductService } from '../core/product.service';
import { Product } from '../models/types';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  template: `
    <a routerLink="/shop" class="back">Back to shop</a>
    <article class="detail" *ngIf="product() as p">
      <img [src]="p.image_url" [alt]="p.name" />
      <div>
        <h1>{{ p.name }}</h1>
        <p>{{ p.description }}</p>
        <h2>{{ p.price | currency:'PHP':'symbol':'1.2-2' }}</h2>
        <p class="stock">Stock: {{ p.stock }}</p>
        <button
          type="button"
          class="add-button"
          [class.added]="added"
          [class.bounce]="bouncing"
          (click)="addToCart(p, $event)"
        >
          <span>{{ added ? '✓ Added!' : 'Add to cart' }}</span>
        </button>
      </div>
    </article>
  `,
  styles: [
    `.back{text-decoration:none;color:var(--cns-coral);font-weight:900;display:inline-block;margin-bottom:1rem}`,
    `.detail{display:grid;grid-template-columns:1.2fr 1fr;gap:1.2rem;background:var(--cns-card);padding:1rem;border-radius:var(--cns-radius);border:1px solid var(--cns-border);box-shadow:var(--cns-shadow)}`,
    `.detail img{width:100%;border-radius:.45rem;max-height:420px;object-fit:cover}`,
    `.detail h1{margin:0 0 .6rem;color:var(--cns-brown);letter-spacing:0}`,
    `.detail p{line-height:1.5;color:var(--cns-brown-soft)}`,
    `.stock{color:var(--cns-brown-soft)}`,
    `.add-button{min-width:7.4rem;background:var(--cns-coral);color:#fff;border:0;padding:.7rem 1rem;border-radius:.45rem;font-weight:900;cursor:pointer;transition:background-color .28s ease,transform .18s ease,box-shadow .28s ease;box-shadow:0 8px 18px rgba(232,99,58,.22)}`,
    `.add-button span{display:inline-block;animation:fadeText .18s ease}`,
    `.add-button.bounce{animation:addPress .42s cubic-bezier(.2,.9,.3,1.2)}`,
    `.add-button.added{background:#1d9e75;box-shadow:0 10px 22px rgba(29,158,117,.22)}`,
    `@keyframes addPress{0%{transform:scale(1)}35%{transform:scale(.95)}70%{transform:scale(1.05)}100%{transform:scale(1)}}`,
    `@keyframes fadeText{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}`,
    `@media (max-width: 820px){.detail{grid-template-columns:1fr;}}`,
  ],
})
export class ProductDetailPageComponent {
  product = signal<Product | null>(null);
  added = false;
  bouncing = false;
  private resetTimer: number | null = null;

  constructor(route: ActivatedRoute, private productService: ProductService, private cart: CartService) {
    const id = Number(route.snapshot.paramMap.get('id'));
    this.productService.getProduct(id).subscribe((res) => this.product.set(res.product));
  }

  addToCart(product: Product, event: MouseEvent) {
    this.cart.add(product);
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
