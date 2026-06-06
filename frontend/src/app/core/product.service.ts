import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE } from './api';
import { Product } from '../models/types';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}

  getProducts(admin = false) {
    let params = new HttpParams();
    if (admin) {
      params = params.set('admin', '1');
    }
    return this.http.get<{ products: Product[] }>(`${API_BASE}/products`, { params });
  }

  getProduct(id: number) {
    return this.http.get<{ product: Product }>(`${API_BASE}/products/${id}`);
  }

  createProduct(payload: Partial<Product>) {
    return this.http.post<{ message: string; id: number }>(`${API_BASE}/admin/products`, payload);
  }

  updateProduct(id: number, payload: Partial<Product>) {
    return this.http.put<{ message: string }>(`${API_BASE}/admin/products/${id}`, payload);
  }

  uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ message: string; image_url: string }>(`${API_BASE}/admin/upload-image`, formData);
  }

  deleteProduct(id: number) {
    return this.http.delete<{ message: string }>(`${API_BASE}/admin/products/${id}`);
  }
}
