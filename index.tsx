

import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app/app.component';
import { provideRouter, withHashLocation } from '@angular/router';
import { AuthGuard } from './src/app/core/guards/auth.guard';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter([
      {
        path: '',
        loadComponent: () => import('./src/app/features/intelligence/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'login',
        loadComponent: () => import('./src/app/features/auth/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'tasks',
        loadComponent: () => import('./src/app/features/execution/tasks.component').then(m => m.TasksComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'traceability',
        loadComponent: () => import('./src/app/features/intelligence/traceability.component').then(m => m.TraceabilityComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'assets',
        loadComponent: () => import('./src/app/features/execution/assets.component').then(m => m.AssetsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'content',
        loadComponent: () => import('./src/app/features/execution/content.component').then(m => m.ContentComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'dev',
        loadComponent: () => import('./src/app/features/execution/dev.component').then(m => m.DevComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'ops',
        loadComponent: () => import('./src/app/features/strategy/ops.component').then(m => m.OpsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'reports',
        loadComponent: () => import('./src/app/features/intelligence/reports.component').then(m => m.ReportsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'system',
        loadComponent: () => import('./src/app/features/admin/system.component').then(m => m.SystemComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'settings',
        loadComponent: () => import('./src/app/features/admin/settings.component').then(m => m.SettingsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'team',
        loadComponent: () => import('./src/app/features/admin/team.component').then(m => m.TeamComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'admin-users',
        loadComponent: () => import('./src/app/features/admin/users.component').then(m => m.AdminUsersComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'finance',
        loadComponent: () => import('./src/app/features/admin/finance.component').then(m => m.FinanceComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'strategy',
        loadComponent: () => import('./src/app/features/strategy/strategy.component').then(m => m.StrategyComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'support',
        loadComponent: () => import('./src/app/features/admin/support.component').then(m => m.SupportComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'knowledge-base',
        loadComponent: () => import('./src/app/features/intelligence/knowledge-base.component').then(m => m.KnowledgeBaseComponent),
        canActivate: [AuthGuard]
      },
      { path: '**', redirectTo: '' }
    ], withHashLocation())
  ]
}).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.