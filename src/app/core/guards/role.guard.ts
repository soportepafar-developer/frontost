import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser;

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  // Los administradores tienen acceso total a todas las rutas
  if (authService.isAdmin) {
    return true;
  }

  const expectedRoles = route.data?.['roles'] as Array<string> | undefined;

  if (!expectedRoles || expectedRoles.length === 0) {
    return true; // Si no hay roles requeridos en la ruta, permitir acceso
  }

  const rawRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [currentUser.roles];
  const userRoleStrings = rawRoles.map((r: unknown) => {
    if (typeof r === 'string') return r.toUpperCase();
    if (r && typeof r === 'object') {
      const rec = r as Record<string, unknown>;
      return String(rec['rol'] || rec['name'] || rec['value'] || '').toUpperCase();
    }
    return '';
  }).filter(Boolean);

  const hasAccess = expectedRoles.some(exp =>
    userRoleStrings.some(userRole => userRole.includes(exp.toUpperCase()))
  );

  if (!hasAccess) {
    router.navigate(['/dashboard/default']);
    return false;
  }

  return true;
};
