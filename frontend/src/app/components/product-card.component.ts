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
        <a [routerLink]="['/product', product.id]">Details</a>
        <button type="button" (click)="$emitAdd()">Add to cart</button>
      </div>
    </article>
  `,
  styles: [
    `.card{background:#fff;border:1px solid #e8e8e8;border-radius:14px;padding:.8rem;display:flex;flex-direction:column;gap:.6rem}`,
    `.card img{width:100%;height:170px;object-fit:cover;border-radius:10px}`,
    `.card h3{margin:0;font-size:1rem}`,
    `.desc{margin:0;color:#4b5563;line-height:1.35}`,
    `.meta{display:flex;justify-content:space-between;align-items:center;font-size:.85rem}`,
    `.actions{display:flex;justify-content:space-between;align-items:center}`,
    `.actions a{text-decoration:none;color:#0f766e;font-weight:600}`,
    `.actions button{border:0;background:#111827;color:#fff;padding:.45rem .7rem;border-radius:8px}`,
  ],
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() add = new EventEmitter<Product>();

  $emitAdd() {
    this.add.emit(this.product);
  }
}
