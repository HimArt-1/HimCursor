import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/domain/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';

export const AuthGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Wait for initialization
    return toObservable(authService.sessionReady).pipe(
        filter(init => init === true), // Wait until session is ready
        take(1),
        map(() => {
            const session = authService.session();
            const profile = authService.activeProfile();
            const adminUser = authService.adminUser();
            if (session && (profile || adminUser)) {
                return true;
            } else {
                return router.createUrlTree(['/login']);
            }
        })
    );
};
