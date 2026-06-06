import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE } from './api';
import { Order } from '../models/types';

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private http: HttpClient) {}

  checkout(payload: {
    items: { product_id: number; quantity: number }[];
    customer_name: string;
    customer_phone: string;
    shipping_address: string;
  }) {
    return this.http.post<{ message: string; order_id: number }>(`${API_BASE}/orders`, payload);
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
