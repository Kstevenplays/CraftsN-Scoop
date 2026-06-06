import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product } from '../models/types';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>(this.readItems());

  readonly items = this.itemsSignal.asReadonly();
  readonly count = computed(() => this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() => this.itemsSignal().reduce((sum, item) => sum + item.product.price * item.quantity, 0));

  add(product: Product, quantity = 1) {
    const current = [...this.itemsSignal()];
    const existing = current.find((item) => item.product.id === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      current.push({ product, quantity });
    }

    this.save(current);
  }

  setQuantity(productId: number, quantity: number) {
    const next = this.itemsSignal().map((item) => {
      if (item.product.id === productId) {
        return { ...item, quantity: Math.max(1, quantity) };
      }
      return item;
    });
    this.save(next);
  }

  remove(productId: number) {
    this.save(this.itemsSignal().filter((item) => item.product.id !== productId));
  }

  clear() {
    this.save([]);
  }

  private save(items: CartItem[]) {
    this.itemsSignal.set(items);
    localStorage.setItem('cns_cart', JSON.stringify(items));
  }

  private readItems(): CartItem[] {
    const raw = localStorage.getItem('cns_cart');
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as CartItem[];
    } catch {
      return [];
    }
  }
}
