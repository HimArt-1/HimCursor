
import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SidebarComponent } from './layout/sidebar.component';
import { ToastComponent } from './shared/ui/toast.component';
import { CommandPaletteComponent } from './shared/widgets/command-palette.component';
import { NotificationPanelComponent } from './shared/widgets/notification-panel.component';
import { AiAssistantComponent } from './shared/widgets/ai-assistant.component';
import { SystemAlertComponent } from './shared/widgets/system-alert.component';
import { ChatWidgetComponent } from './features/social/chat-widget.component';
import { DataService } from './core/services/state/data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ToastComponent, CommandPaletteComponent, NotificationPanelComponent, AiAssistantComponent, SystemAlertComponent, ChatWidgetComponent],
  template: `
    <div class="h-screen w-full flex bg-wushai-light dark:bg-wushai-espresso transition-colors duration-300 overflow-hidden">
      @if(isAuthenticated()) {
        <!-- Backdrop for mobile menu -->
        @if(isMobileMenuOpen()) {
          <div (click)="closeMobileMenu()" class="fixed inset-0 bg-black/60 z-30 md:hidden animate-fade-in"></div>
        }
        
        <!-- Sidebar -->
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
            <h1 class="text-lg font-bold text-wushai-dark dark:text-wushai-sand">HimControl</h1>
            <div class="w-6"></div> <!-- Spacer -->
          </header>
        }
        
        <main class="flex-1 overflow-auto" [class.p-4]="isAuthenticated()" [class.md:p-8]="isAuthenticated()" [class.p-0]="!isAuthenticated()">
          <router-outlet></router-outlet>
        </main>
      </div>
      
      <!-- Global Overlays -->
      <app-toast-container></app-toast-container>
      <app-system-alert></app-system-alert>
      
      @if(isAuthenticated()) {
        <app-command-palette></app-command-palette>
        <app-notification-panel></app-notification-panel>
        <app-ai-assistant></app-ai-assistant>
        <app-chat-widget></app-chat-widget>
      }
    </div>
  `
})
export class AppComponent {
  private dataService = inject(DataService);
  // FIX: Explicitly type injected Router to fix type inference issue.
  private router: Router = inject(Router);

  isAuthenticated = computed(() => !!this.dataService.currentUser());
  isMobileMenuOpen = this.dataService.isMobileMenuOpen;

  constructor() {
    // Auth handled by Guard
  }

  toggleMobileMenu() {
    this.dataService.toggleMobileMenu();
  }

  closeMobileMenu() {
    this.dataService.closeMobileMenu();
  }
}
