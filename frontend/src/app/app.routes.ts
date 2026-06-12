import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard, guestGuard } from './guards/auth.guard';
import { AdminPageComponent } from './pages/admin.page';
import { CartPageComponent } from './pages/cart.page';
import { CheckoutPageComponent } from './pages/checkout.page';
import { GcashPaymentPageComponent } from './pages/gcash-payment.page';
import { HomePageComponent } from './pages/home.page';
import { OrdersPageComponent } from './pages/orders.page';
import { ProductDetailPageComponent } from './pages/product-detail.page';
import { LandingPageComponent } from './pages/landing.page';
import { ProfilePageComponent } from './pages/profile.page';

export const routes: Routes = [
	{ path: '', component: LandingPageComponent, canActivate: [guestGuard] },
	{ path: 'shop', component: HomePageComponent, canActivate: [authGuard] },
	{ path: 'shop/:id', component: ProductDetailPageComponent, canActivate: [authGuard] },
	{ path: 'cart', component: CartPageComponent, canActivate: [authGuard] },
	{ path: 'checkout', component: CheckoutPageComponent, canActivate: [authGuard] },
	{ path: 'checkout/gcash-payment', component: GcashPaymentPageComponent, canActivate: [authGuard] },
	{ path: 'orders/my', component: OrdersPageComponent, canActivate: [authGuard] },
	{ path: 'profile', component: ProfilePageComponent, canActivate: [authGuard] },
	{ path: 'admin', component: AdminPageComponent, canActivate: [adminGuard] },
	{ path: '**', redirectTo: '' },
];