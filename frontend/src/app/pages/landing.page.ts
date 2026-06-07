import { CommonModule } from '@angular/common';
import { Component, signal, AfterViewInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { ProductService } from '../core/product.service';
import { CartService } from '../core/cart.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { Product } from '../models/types';
import { ProductCardComponent } from '../components/product-card.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent],
  template: `
    <main class="landing" style="background:#FFF8F0;color:#3B1F0E">
      <section class="hero animate">
        <div class="inner">
          <h1>Crafts N' Scoop</h1>
          <p class="tag">Handmade with love, scooped with joy.</p>
          <div class="ctas">
            <a routerLink="/shop" class="btn primary">Shop Now</a>
            <a href="#about" class="btn ghost">View Our Story</a>
          </div>
        </div>
      </section>

      <section class="features">
        <article class="feat animate">
          <div class="icon" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#E8633A" stroke-width="1.5"/><path d="M8 13c1.333-1 2-2 4-2s2.667 1 4 2" stroke="#E8633A" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <h3>Handmade Quality</h3>
          <p>Each product is crafted by local artisans with attention to detail.</p>
        </article>
        <article class="feat animate">
          <div class="icon" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v6" stroke="#3B1F0E" stroke-width="1.5" stroke-linecap="round"/><path d="M5 12c1.5-3 5-5 7-5s5.5 2 7 5c-1.5 3-5 5-7 5s-5.5-2-7-5z" stroke="#E8633A" stroke-width="1.2" fill="none"/></svg></div>
          <h3>Fresh Scoops Daily</h3>
          <p>Our scoop-ready goods are prepared daily for freshness.</p>
        </article>
        <article class="feat animate">
          <div class="icon" aria-hidden="true"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="7" width="13" height="8" rx="1.5" stroke="#E8633A" stroke-width="1.2"/><path d="M16 11h4l-1 3" stroke="#3B1F0E" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <h3>Fast Local Delivery</h3>
          <p>Quick delivery so your treats arrive ready to enjoy.</p>
        </article>
      </section>

      <section class="featured animate">
        <h2>Featured Products</h2>
        <div class="grid">
          <app-product-card *ngFor="let p of products()" [product]="p" (add)="add(p)"></app-product-card>
        </div>
        <div class="see-all"><a routerLink="/shop" class="btn">See All Products</a></div>
      </section>

      <section id="about" class="about animate">
        <h2>About Crafts N' Scoop</h2>
        <p>We are a small, family-run shop blending handcrafted goods with scoop-ready treats. Our mission is to bring warmth, quality, and convenience to your table.</p>
      </section>

      <footer class="footer animate">
        <div>
          <strong>Crafts N' Scoop</strong>
          <p>Handmade & scoop-ready — delivered with care</p>
        </div>
        <nav>
          <a routerLink="/">Home</a>
          <a routerLink="/shop">Shop</a>
          <a routerLink="/orders">My Orders</a>
        </nav>
      </footer>
    </main>
  `,
  styles: [
    `:host{display:block;scroll-behavior:smooth}`,
    `.animate{opacity:0;transform:translateY(18px);transition:opacity .6s cubic-bezier(.2,.9,.2,1),transform .6s cubic-bezier(.2,.9,.2,1)}`,
    `.animate.visible{opacity:1;transform:none}`,
    `.hero{padding:3rem 1rem;background:linear-gradient(135deg,#FFF8F0,#FFEDE2);border-radius:18px;margin-bottom:1rem}`,
    `.hero .inner{max-width:1100px;margin:0 auto;text-align:center}`,
    `.hero h1{font-size:2.4rem;margin:.2rem 0;color:#3B1F0E}`,
    `.tag{color:#6b4a3a;margin:.5rem 0}`,
    `.ctas{display:flex;gap:.6rem;justify-content:center;margin-top:1rem}`,
    `.btn{padding:.6rem 1rem;border-radius:10px;text-decoration:none}`,
    `.btn.primary{background:#E8633A;color:#fff}`,
    `.btn.ghost{background:transparent;border:1px solid #E8633A;color:#3B1F0E}`,
    `.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin:1rem 0}`,
    `.feat{background:#fff;padding:1rem;border-radius:12px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.6rem}`,
    `.feat .icon{width:48px;height:48px;display:flex;align-items:center;justify-content:center}`,
    `.features .feat:nth-child(1){transition-delay:.05s}`,
    `.features .feat:nth-child(2){transition-delay:.12s}`,
    `.features .feat:nth-child(3){transition-delay:.18s}`,
    `.featured h2{margin:0 0 .6rem}`,
    `.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}`,
    `.see-all{margin-top:.8rem;text-align:center}`,
    `.about{margin:1.25rem 0;padding:1rem;background:#fff;border-radius:12px}`,
    `.footer{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1.25rem;padding:1rem;background:#fff;border-radius:10px}`,
    `@media(max-width:820px){.hero h1{font-size:1.8rem}}`
  ],
})
export class LandingPageComponent implements AfterViewInit {
  products = signal<Product[]>([]);

  constructor(
    private productService: ProductService,
    private cart: CartService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.loadFeatured();
  }

  loadFeatured() {
    this.productService.getProducts(false, 6, 'created_at').subscribe((res) => {
      this.products.set(res.products);
    });
  }

  add(p: Product) {
    if (this.auth.isAuthenticated()) {
      this.cart.add(p, 1);
      return;
    }

    this.toast.show('Please log in to add items to your cart 🧺', 'info');
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  ngAfterViewInit(): void {
    const els = Array.from(document.querySelectorAll('.animate')) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    els.forEach((el) => io.observe(el));
  }
}
