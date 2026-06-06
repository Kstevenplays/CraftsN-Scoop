import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { AdminPageComponent } from './pages/admin.page';
import { CartPageComponent } from './pages/cart.page';
import { CheckoutPageComponent } from './pages/checkout.page';
import { HomePageComponent } from './pages/home.page';
import { LoginPageComponent } from './pages/login.page';
import { OrdersPageComponent } from './pages/orders.page';
import { ProductDetailPageComponent } from './pages/product-detail.page';
import { RegisterPageComponent } from './pages/register.page';

export const routes: Routes = [
	{ path: '', component: HomePageComponent },
	{ path: 'product/:id', component: ProductDetailPageComponent },
	{ path: 'cart', component: CartPageComponent },
	{ path: 'checkout', component: CheckoutPageComponent, canActivate: [authGuard] },
	{ path: 'orders', component: OrdersPageComponent, canActivate: [authGuard] },
	{ path: 'login', component: LoginPageComponent },
	{ path: 'register', component: RegisterPageComponent },
	{ path: 'admin', component: AdminPageComponent, canActivate: [adminGuard] },
	{ path: '**', redirectTo: '' },
];
