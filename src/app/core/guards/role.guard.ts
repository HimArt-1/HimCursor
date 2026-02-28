import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/domain/auth.service';
import { RbacService } from '../services/domain/rbac.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';

/**
 * Role Guard Factory — creates a guard that checks for specific permissions.
 *
 * Usage in routes:
 *   canActivate: [RoleGuard('finance.view')]
 *   canActivate: [RoleGuard('admin.users', 'admin.roles')]
 */
export function RoleGuard(...requiredPermissions: string[]): CanActivateFn {
    return (route, state) => {
        const authService = inject(AuthService);
        const rbacService = inject(RbacService);
        const router = inject(Router);

        return toObservable(authService.sessionReady).pipe(
            filter(ready => ready === true),
            take(1),
            map(() => {
                const session = authService.session();
                const profile = authService.activeProfile();

                if (!session || !profile) {
                    return router.createUrlTree(['/login']);
                }

                // Admin always has access
                if (rbacService.isAdmin()) {
                    return true;
                }

                // Check required permissions
                if (requiredPermissions.length === 0) {
                    return true;
                }

                const hasAccess = rbacService.hasAnyPermission(requiredPermissions);
                if (hasAccess) {
                    return true;
                }

                // Redirect to dashboard if no permission
                return router.createUrlTree(['/']);
            })
        );
    };
}
