import { Component, computed, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ToastComponent } from './components/toast.component';
import { AuthService } from './core/auth.service';
import { CartService } from './core/cart.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  currentUrl = '/';
  dropdownOpen = false;

  userInitials = computed(() => {
    const user = this.auth.user();
    if (!user) return '';
    return user.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  constructor(public auth: AuthService, public cart: CartService, private router: Router) {
    this.currentUrl = this.router.url.split('?')[0];
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl = event.urlAfterRedirects.split('?')[0];
      });

    if (this.auth.token()) {
      this.auth.fetchMe().subscribe({ error: () => this.auth.logout() });
    }

    // Watch auth.user changes and sync cart accordingly
    effect(() => {
      const user = this.auth.user();
      if (user) {
        // User logged in or changed — load their cart
        this.cart.setCurrentUser(user.id);
      } else {
        // User logged out — clear cart
        this.cart.clearActiveCart();
      }
    });
  }

  handleLogout() {
    this.cart.persistToStorage();
    this.auth.logout();
  }

  isAdminRoute() {
    return this.currentUrl.startsWith('/admin');
  }

  showCustomerNavbar() {
    return this.currentUrl !== '/' && !this.isAdminRoute();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Close dropdown when clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.user-dropdown')) {
      this.dropdownOpen = false;
    }
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown() {
    this.dropdownOpen = false;
  }
}