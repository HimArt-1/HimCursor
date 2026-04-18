
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { RouterOutlet, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './layout/sidebar.component';
import { ToastComponent } from './shared/ui/toast.component';
import { CommandPaletteComponent } from './shared/widgets/command-palette.component';
import { NotificationPanelComponent } from './shared/widgets/notification-panel.component';
import { AiAssistantComponent } from './shared/widgets/ai-assistant.component';
import { SystemAlertComponent } from './shared/widgets/system-alert.component';
import { ChatWidgetComponent } from './features/social/chat-widget.component';
import { DataService } from './core/services/state/data.service';
import { PresenceService } from './core/services/state/presence.service';
import { AuthService } from './core/services/domain/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from './shared/ui/icons';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, SidebarComponent, ToastComponent, CommandPaletteComponent, NotificationPanelComponent, AiAssistantComponent, SystemAlertComponent, ChatWidgetComponent],
  // Using @defer in template for ChatWidget to improve initial load
  template: `
    <div class="h-screen w-full flex bg-wushai-light dark:bg-wushai-espresso transition-colors duration-300 overflow-hidden">
      @if(isAuthenticated()) {
        <!-- Backdrop for mobile menu -->
        @if(isMobileMenuOpen()) {
          <div (click)="closeMobileMenu()" class="fixed inset-0 bg-black/60 z-30 md:hidden animate-fade-in"></div>
        }
        
        <!-- Sidebar (Desktop) -->
        <app-sidebar class="fixed md:relative inset-y-0 left-0 transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out z-40"
          [class.translate-x-0]="isMobileMenuOpen()">
        </app-sidebar>
      }
      
      <div class="flex-1 flex flex-col w-full">
        @if(isAuthenticated()) {
          <!-- Mobile Header -->
          <header class="md:hidden flex-shrink-0 flex items-center justify-between p-4 border-b border-wushai-sand dark:border-wushai-olive bg-wushai-light/90 dark:bg-wushai-espresso/90 backdrop-blur-sm z-20">
            <button (click)="toggleMobileMenu()" class="text-wushai-dark dark:text-wushai-sand p-2 -ml-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </button>
            <h1 class="text-lg font-bold text-wushai-dark dark:text-wushai-sand">Washa Control</h1>
            <div class="w-6"></div>
          </header>
        }
        
        <main class="flex-1 overflow-auto" [class.p-4]="isAuthenticated()" [class.md:p-8]="isAuthenticated()" [class.p-0]="!isAuthenticated()" [class.pb-20]="isAuthenticated()" [class.md:pb-8]="isAuthenticated()">
          <router-outlet></router-outlet>
        </main>

        <!-- Mobile Bottom Navigation -->
        @if(isAuthenticated()) {
          <nav class="md:hidden fixed bottom-0 left-0 right-0 z-30 bottom-nav bg-white/95 dark:bg-[#1C1612]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
            <div class="flex items-center justify-around h-16 px-2">
              <a routerLink="/dashboard" routerLinkActive="text-wushai-cocoa dark:text-wushai-sand" class="flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all text-gray-500 dark:text-gray-400 active:scale-90">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                <span class="text-[10px] font-bold leading-none">الرئيسية</span>
              </a>
              <a routerLink="/tasks" routerLinkActive="text-wushai-cocoa dark:text-wushai-sand" class="flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all text-gray-500 dark:text-gray-400 active:scale-90">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                <span class="text-[10px] font-bold leading-none">المهام</span>
              </a>
              <a routerLink="/requests" routerLinkActive="text-wushai-cocoa dark:text-wushai-sand" class="flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all text-gray-500 dark:text-gray-400 active:scale-90">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>
                <span class="text-[10px] font-bold leading-none">الطلبات</span>
              </a>
              <a routerLink="/strategy" routerLinkActive="text-wushai-cocoa dark:text-wushai-sand" class="flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all text-gray-500 dark:text-gray-400 active:scale-90">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                <span class="text-[10px] font-bold leading-none">الاستراتيجية</span>
              </a>
              <button (click)="toggleMobileMenu()" class="flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all text-gray-500 dark:text-gray-400 active:scale-90">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                <span class="text-[10px] font-bold leading-none">المزيد</span>
              </button>
            </div>
          </nav>
        }
      </div>

      <!-- PWA Install Prompt -->
      @if(showInstallPrompt()) {
        <div class="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 install-prompt">
          <div class="bg-gradient-to-r from-wushai-cocoa to-wushai-cocoa text-white rounded-2xl p-4 shadow-2xl shadow-wushai-cocoa/30 flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold">تثبيت Washa Control</p>
              <p class="text-xs text-white/70">أضف التطبيق للشاشة الرئيسية</p>
            </div>
            <button (click)="installApp()" class="px-3 py-1.5 bg-white text-wushai-cocoa font-bold text-sm rounded-lg flex-shrink-0 active:scale-95 transition-transform">
              تثبيت
            </button>
            <button (click)="dismissInstallPrompt()" class="p-1 text-white/60 hover:text-white flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      }
      
      <!-- Global Overlays -->
      <app-toast-container></app-toast-container>
      <app-system-alert></app-system-alert>
      
      @if(isAuthenticated()) {
        <app-command-palette></app-command-palette>
        <app-notification-panel></app-notification-panel>
        <app-ai-assistant></app-ai-assistant>
        @defer (on idle) {
          <app-chat-widget></app-chat-widget>
        }
      }
    </div>
  `
})
export class AppComponent implements OnInit {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private router: Router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private _presence = inject(PresenceService);

  isAuthenticated = computed(() => {
    const hasSession = this.authService.hasSession();
    const hasUser = !!this.dataService.currentUser();
    const hasAdminUser = !!this.authService.adminUser();
    return hasSession || hasUser || hasAdminUser;
  });
  isMobileMenuOpen = this.dataService.isMobileMenuOpen;

  // PWA Install
  showInstallPrompt = signal(false);
  private deferredPrompt: any = null;

  constructor() { }

  ngOnInit() {
    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      // Only show if not dismissed before
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        this.showInstallPrompt.set(true);
      }
    });

    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/ngsw-worker.js').then(
          (reg) => console.log('SW registered:', reg.scope),
          (err) => console.log('SW registration failed:', err)
        );
      });
    }
  }

  toggleMobileMenu() {
    this.dataService.toggleMobileMenu();
  }

  closeMobileMenu() {
    this.dataService.closeMobileMenu();
  }

  async installApp() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    this.deferredPrompt = null;
    this.showInstallPrompt.set(false);
  }

  dismissInstallPrompt() {
    this.showInstallPrompt.set(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }
}

