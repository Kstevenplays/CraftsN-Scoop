import { Component } from '@angular/core';
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
  }

  showNavbar() {
    return this.currentUrl !== '/';
  }
}
