import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCardComponent } from '../components/product-card.component';
import { CartService } from '../core/cart.service';
import { ProductService } from '../core/product.service';
import { Product } from '../models/types';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  template: `
    <section class="hero">
      <p class="eyebrow">Handmade. Heartmade.</p>
      <h1>Crafts N' Scoop</h1>
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
    `.hero{padding:1.5rem;border-radius:var(--cns-radius);background:var(--cns-card);border:1px solid var(--cns-border);box-shadow:var(--cns-shadow);margin-bottom:1rem;color:var(--cns-brown)}`,
    `.eyebrow{text-transform:uppercase;letter-spacing:.1em;font-size:.75rem;margin:0;font-weight:900;color:var(--cns-coral)}`,
    `.hero h1{margin:.3rem 0;letter-spacing:0;color:var(--cns-brown)}`,
    `.hero p:not(.eyebrow){color:var(--cns-brown-soft);margin:0}`,
    `.toolbar{display:flex;gap:.75rem;margin-bottom:1rem}`,
    `.toolbar input{flex:1;padding:.7rem .85rem;border-radius:.45rem;border:1px solid var(--cns-border);background:#fffaf5;color:var(--cns-brown);outline:none}`,
    `.toolbar input:focus{border-color:var(--cns-coral);box-shadow:0 0 0 3px rgba(232,99,58,.16);background:#fff}`,
    `.toolbar button{border:0;border-radius:.45rem;background:var(--cns-coral);color:#fff;padding:.65rem 1rem;font-weight:900;cursor:pointer}`,
    `.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}`,
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

  constructor(private productService: ProductService, private cart: CartService) {
    this.reload();
  }

  reload() {
    this.productService.getProducts().subscribe((res) => this.products.set(res.products));
  }

  add(product: Product) {
    this.cart.add(product, 1);
  }
}
