import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.isAdmin()) {
    return true;
  }

  // If logged in but not admin, redirect to shop
  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/shop']);
  }

  return router.createUrlTree(['/']);
};
