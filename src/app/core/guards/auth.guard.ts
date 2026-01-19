import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from '../services/domain/user.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';

export const AuthGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserService);
    const router = inject(Router);

    // Wait for initialization
    return toObservable(userService.initialized).pipe(
        filter(init => init === true), // Wait until initialized becomes true
        take(1),
        map(() => {
            const user = userService.currentUser();
            if (user) {
                return true;
            } else {
                return router.createUrlTree(['/login']);
            }
        })
    );
};
