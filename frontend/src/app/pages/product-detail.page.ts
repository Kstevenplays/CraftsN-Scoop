import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CartService } from '../core/cart.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { ProductService } from '../core/product.service';
import { Product } from '../models/types';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  template: `
    <a routerLink="/" class="back">Back to shop</a>
    <article class="detail" *ngIf="product() as p">
      <img [src]="p.image_url" [alt]="p.name" />
      <div>
        <h1>{{ p.name }}</h1>
        <p>{{ p.description }}</p>
        <h2>{{ p.price | currency:'PHP':'symbol':'1.2-2' }}</h2>
        <p class="stock">Stock: {{ p.stock }}</p>
        <button type="button" (click)="addToCart(p)">Add to cart</button>
      </div>
    </article>
  `,
  styles: [
    `.back{text-decoration:none;color:#0f766e;font-weight:600;display:inline-block;margin-bottom:1rem}`,
    `.detail{display:grid;grid-template-columns:1.2fr 1fr;gap:1.2rem;background:#fff;padding:1rem;border-radius:14px;border:1px solid #e5e7eb}`,
    `.detail img{width:100%;border-radius:12px;max-height:420px;object-fit:cover}`,
    `.detail h1{margin:0 0 .6rem}`,
    `.detail p{line-height:1.5}`,
    `.stock{color:#6b7280}`,
    `.detail button{background:#111827;color:#fff;border:0;padding:.7rem 1rem;border-radius:10px}`,
    `@media (max-width: 820px){.detail{grid-template-columns:1fr;}}`
  ],
})
export class ProductDetailPageComponent {
  product = signal<Product | null>(null);

  constructor(
    route: ActivatedRoute,
    private productService: ProductService,
    private cart: CartService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    const id = Number(route.snapshot.paramMap.get('id'));
    this.productService.getProduct(id).subscribe((res) => this.product.set(res.product));
  }

  addToCart(product: Product) {
    if (this.auth.isAuthenticated()) {
      this.cart.add(product);
      return;
    }

    this.toast.show('Please log in to add items to your cart 🧺', 'info');
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
