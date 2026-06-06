import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../core/order.service';
import { ProductService } from '../core/product.service';
import { Order, Product } from '../models/types';
import { OrderTimelineComponent } from './order-timeline.component';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe, OrderTimelineComponent],
  template: `
    <h1>Admin Dashboard</h1>

    <section class="panel">
      <h2>{{ editingId ? 'Edit Product' : 'New Product' }}</h2>
      <form (ngSubmit)="saveProduct()" class="grid">
        <input placeholder="Name" name="name" [(ngModel)]="form.name" required />
        <input placeholder="Price" type="number" name="price" [(ngModel)]="form.price" required />
        <input placeholder="Stock" type="number" name="stock" [(ngModel)]="form.stock" required />
        <input placeholder="Image URL" name="image" [(ngModel)]="form.image_url" />
        <label class="upload-field">
          Product image file
          <input type="file" accept="image/*" (change)="onImageSelected($event)" />
        </label>
        <p class="upload-status" *ngIf="uploadMessage" [class.error]="uploadError">{{ uploadMessage }}</p>
        <textarea placeholder="Description" name="description" [(ngModel)]="form.description"></textarea>
        <label class="switch">
          <input type="checkbox" name="active" [(ngModel)]="form.is_active" />
          Active
        </label>
        <div class="actions">
          <button type="submit">{{ editingId ? 'Update' : 'Create' }}</button>
          <button type="button" (click)="reset()">Clear</button>
        </div>
      </form>
    </section>

    <section class="panel">
      <h2>Products</h2>
      <table>
        <tr>
          <th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Active</th><th>Action</th>
        </tr>
        <tr *ngFor="let p of products()">
          <td>{{ p.id }}</td>
          <td>{{ p.name }}</td>
          <td>{{ p.price | currency:'PHP':'symbol':'1.2-2' }}</td>
          <td>{{ p.stock }}</td>
          <td>{{ p.is_active ? 'Yes' : 'No' }}</td>
          <td>
            <button type="button" (click)="edit(p)">Edit</button>
            <button type="button" (click)="remove(p.id)">Delete</button>
          </td>
        </tr>
      </table>
    </section>

    <section class="panel">
      <h2>Orders</h2>
      <article class="order" *ngFor="let order of orders()">
        <header>
          <h3>#{{ order.id }} - {{ order.user_email }}</h3>
          <select [ngModel]="order.status" (ngModelChange)="updateStatus(order.id, $event)">
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </header>
        <p>{{ order.created_at | date:'medium' }} | {{ order.total | currency:'PHP':'symbol':'1.2-2' }}</p>
        <app-order-timeline [status]="order.status"></app-order-timeline>
        <details>
          <summary>Items ({{ order.items.length }})</summary>
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
    `.panel{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:1rem;margin-bottom:1rem}`,
    `.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}`,
    `.grid textarea{grid-column:1/-1;min-height:90px}`,
    `.upload-field{display:grid;gap:.35rem;font-weight:600;font-size:.9rem}`,
    `.upload-field input[type='file']{padding:.35rem .2rem;border:0}`,
    `.upload-status{grid-column:1/-1;margin:0;color:#065f46;font-weight:700}`,
    `.upload-status.error{color:#b91c1c}`,
    `.grid input,.grid textarea{padding:.6rem .75rem;border-radius:8px;border:1px solid #ced6e0}`,
    `.switch{display:flex;align-items:center;gap:.4rem}`,
    `.actions{display:flex;gap:.5rem}`,
    `button{border:0;background:#111827;color:#fff;padding:.45rem .75rem;border-radius:8px}`,
    `table{width:100%;border-collapse:collapse}`,
    `th,td{padding:.45rem;border-bottom:1px solid #eceff3;text-align:left}`,
    `.order{border:1px solid #eef2f7;border-radius:10px;padding:.75rem;margin:.45rem 0}`,
    `.order header{display:flex;justify-content:space-between;gap:.8rem}`,
    `details{margin-top:.35rem}`,
    `summary{cursor:pointer;color:#0f766e;font-weight:700}`,
    `ul{margin:.35rem 0 0;padding-left:1.1rem}`,
    `@media (max-width: 820px){.grid{grid-template-columns:1fr} table{display:block;overflow:auto}}`
  ],
})
export class AdminPageComponent {
  products = signal<Product[]>([]);
  orders = signal<Order[]>([]);
  uploadMessage = '';
  uploadError = false;

  editingId: number | null = null;
  form: {
    name: string;
    description: string;
    price: number;
    image_url: string;
    stock: number;
    is_active: boolean;
  } = {
    name: '',
    description: '',
    price: 0,
    image_url: '',
    stock: 0,
    is_active: true,
  };

  constructor(private productService: ProductService, private orderService: OrderService) {
    this.loadProducts();
    this.loadOrders();
  }

  loadProducts() {
    this.productService.getProducts(true).subscribe((res) => this.products.set(res.products));
  }

  loadOrders() {
    this.orderService.allOrders().subscribe((res) => this.orders.set(res.orders));
  }

  edit(product: Product) {
    this.editingId = product.id;
    this.form = {
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image_url,
      stock: product.stock,
      is_active: !!product.is_active,
    };
  }

  reset() {
    this.editingId = null;
    this.form = { name: '', description: '', price: 0, image_url: '', stock: 0, is_active: true };
    this.uploadMessage = '';
    this.uploadError = false;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploadMessage = 'Uploading image...';
    this.uploadError = false;

    this.productService.uploadImage(file).subscribe({
      next: (res) => {
        this.form.image_url = res.image_url;
        this.uploadMessage = 'Upload complete';
      },
      error: (err) => {
        this.uploadError = true;
        this.uploadMessage = err?.error?.message ?? 'Image upload failed';
      },
    });
  }

  saveProduct() {
    const payload = {
      ...this.form,
      is_active: this.form.is_active ? 1 : 0,
    };

    const request = this.editingId
      ? this.productService.updateProduct(this.editingId, payload)
      : this.productService.createProduct(payload);

    request.subscribe(() => {
      this.reset();
      this.loadProducts();
    });
  }

  remove(id: number) {
    if (!confirm('Delete this product?')) {
      return;
    }

    this.productService.deleteProduct(id).subscribe(() => this.loadProducts());
  }

  updateStatus(orderId: number, status: string) {
    this.orderService.updateOrderStatus(orderId, status).subscribe(() => this.loadOrders());
  }
}
