import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE } from './api';
import { Order } from '../models/types';

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private http: HttpClient) {}

  checkout(payload: {
    items: { product_id: number; quantity: number; unit_price: number }[];
    full_name: string;
    phone: string;
    email: string;
    delivery_address: string;
    payment_method: string;
    payment_status: string;
    subtotal: number;
    shipping_fee: number;
    total_amount: number;
  }) {
    return this.http.post<{ success: boolean; order_id: number }>(`${API_BASE}/orders`, payload);
  }

  myOrders() {
    return this.http.get<{ orders: Order[] }>(`${API_BASE}/orders/me`);
  }

  allOrders() {
    return this.http.get<{ orders: Order[] }>(`${API_BASE}/admin/orders`);
  }

  updateOrderStatus(id: number, status: string) {
    return this.http.patch<{ message: string }>(`${API_BASE}/admin/orders/${id}/status`, { status });
  }
}
