import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { Router } from '@angular/router';
import { ProductService } from '../core/product.service';
import { Product } from '../models/types';
import { ProductCardComponent } from '../components/product-card.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, ProductCardComponent],
  template: `
    <section class="hero">
      <p class="eyebrow">Handmade. Heartmade.</p>
      <h1>Crafts N Scoop</h1>
      <p>Shop curated handmade crafts and scoop-ready kitchen goods in one checkout.</p>
    </section>

    <section class="toolbar">
      <input [(ngModel)]="query" placeholder="Search products" />
      <button type="button" (click)="reload()">Refresh</button>
    </section>

    <section class="grid">
      <app-product-card *ngFor="let product of filteredProducts()" [product]="product" (add)="add($event)"></app-product-card>
    </section>
  `,
  styles: [
    `.hero{padding:1.5rem;border-radius:18px;background:linear-gradient(125deg,#ffe8cc,#d8f3dc);margin-bottom:1rem}`,
    `.eyebrow{text-transform:uppercase;letter-spacing:.1em;font-size:.75rem;margin:0}`,
    `.hero h1{margin:.3rem 0}`,
    `.toolbar{display:flex;gap:.75rem;margin-bottom:1rem}`,
    `.toolbar input{flex:1;padding:.65rem .8rem;border-radius:10px;border:1px solid #d0d7de}`,
    `.toolbar button{border:0;border-radius:10px;background:#0f766e;color:#fff;padding:.65rem 1rem}`,
    `.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}`,
    `.card{background:#fff;border:1px solid #e8e8e8;border-radius:14px;padding:.8rem;display:flex;flex-direction:column;gap:.6rem}`,
    `.card img{width:100%;height:170px;object-fit:cover;border-radius:10px}`,
    `.card h3{margin:0;font-size:1rem}`,
    `.card p{margin:0;color:#4b5563;line-height:1.35}`,
    `.meta{display:flex;justify-content:space-between;align-items:center;font-size:.85rem}`,
    `.actions{display:flex;justify-content:space-between;align-items:center}`,
    `.actions a{text-decoration:none;color:#0f766e;font-weight:600}`,
    `.actions button{border:0;background:#111827;color:#fff;padding:.45rem .7rem;border-radius:8px}`,
  ],
})
export class HomePageComponent {
  products = signal<Product[]>([]);
  query = '';

  filteredProducts = computed(() => {
    const q = this.query.toLowerCase().trim();
    if (!q) {
      return this.products();
    }
    return this.products().filter((p) =>
      `${p.name} ${p.description}`.toLowerCase().includes(q)
    );
  });

  constructor(
    private productService: ProductService,
    private cart: CartService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.reload();
  }

  reload() {
    this.productService.getProducts().subscribe((res) => this.products.set(res.products));
  }

  add(product: Product) {
    if (this.auth.isAuthenticated()) {
      this.cart.add(product, 1);
      return;
    }

    // Not authenticated — show toast and redirect to login with returnUrl
    this.toast.show('Please log in to add items to your cart 🧺', 'info');
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
