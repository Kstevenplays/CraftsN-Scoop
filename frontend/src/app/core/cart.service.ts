import { Injectable, computed, signal } from '@angular/core';
import { CartItem, Product } from '../models/types';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly itemsSignal = signal<CartItem[]>([]);
  private currentUserId: number | null = null;

  readonly items = this.itemsSignal.asReadonly();
  readonly count = computed(() => this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() => this.itemsSignal().reduce((sum, item) => sum + item.product.price * item.quantity, 0));

  private storageKey(): string {
    if (this.currentUserId === null) {
      return 'cns_cart_guest';
    }
    return `cns_cart_${this.currentUserId}`;
  }

  /** Set the current user (called by AuthService on login/register/fetchMe) */
  setCurrentUser(userId: number | null): void {
    // Save current cart for old user before switching
    if (this.currentUserId !== null && this.currentUserId !== userId) {
      this.persistToStorage();
    }
    this.currentUserId = userId;
    this.loadFromStorage();
  }

  /** Load cart for a specific user from localStorage */
  loadFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey());
    if (!raw) {
      this.itemsSignal.set([]);
      return;
    }
    try {
      this.itemsSignal.set(JSON.parse(raw) as CartItem[]);
    } catch {
      this.itemsSignal.set([]);
    }
  }

  /** Save current cart to localStorage */
  persistToStorage(): void {
    const items = this.itemsSignal();
    localStorage.setItem(this.storageKey(), JSON.stringify(items));
  }

  /** Clear the active cart signal (used on logout) */
  clearActiveCart(): void {
    this.itemsSignal.set([]);
    this.currentUserId = null;
  }

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
    this.persistToStorage();
  }
}