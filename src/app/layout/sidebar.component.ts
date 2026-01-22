
import { Component, inject, signal, OnDestroy, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Icons } from '../shared/ui/icons';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DataService } from '../core/services/state/data.service';
import { ToastService } from '../core/services/state/toast.service';
import { PermissionsService } from '../core/services/domain/permissions.service';

@Component({
   selector: 'app-sidebar',
   standalone: true,
   imports: [CommonModule, RouterLink, RouterLinkActive],
   template: `
    <aside class="h-full w-64 bg-wushai-dark dark:bg-wushai-sidebar-dark text-wushai-sand dark:text-wushai-lilac flex flex-col shadow-xl transition-colors duration-500 border-l border-transparent dark:border-wushai-surface/20">
      <div class="p-6 border-b border-wushai-olive/30 dark:border-wushai-lilac/10 flex justify-between items-center">
        <div>
           <h1 class="text-2xl font-bold tracking-wide text-wushai-sand dark:text-wushai-lilac">HimControl</h1>
           <p class="text-xs text-wushai-lavender dark:text-wushai-lilac/70 mt-1 opacity-80">نظام إدارة وشّى</p>
        </div>
        <!-- AI Assistant Toggle -->
        <button (click)="toggleAiAssistant()" class="relative text-wushai-sand dark:text-wushai-lilac hover:text-white dark:hover:text-white transition-colors p-1" title="مساعد الذكاء الاصطناعي">
           <span [innerHTML]="getIcon('Bot')" class="w-5 h-5"></span>
           <!-- Optional: Status indicator if needed -->
           <span class="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-green-500 animate-pulse"></span>
        </button>

        <!-- Notification Bell -->
        <button (click)="toggleNotifications()" class="relative text-wushai-sand dark:text-wushai-lilac hover:text-white dark:hover:text-white transition-colors p-1">
           <span [innerHTML]="getIcon('Bell')" class="w-5 h-5"></span>
           @if(unreadCount() > 0) {
              <span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-wushai-dark dark:border-wushai-sidebar-dark">
                {{ unreadCount() > 9 ? '9+' : unreadCount() }}
              </span>
           }
        </button>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <!-- Main Section -->
        <a (click)="closeMobileMenu()" routerLink="/" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20" [routerLinkActiveOptions]="{exact: true}"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Home')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">لوحة التحكم</span>
        </a>

        <a (click)="closeMobileMenu()" routerLink="/strategy" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Map')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">خارطة الطريق</span>
        </a>

        <a (click)="closeMobileMenu()" routerLink="/tasks" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('List')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">المهام والإنتاج</span>
        </a>

        <a (click)="closeMobileMenu()" routerLink="/assets" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Image')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">أصول البراند</span>
        </a>

        <a (click)="closeMobileMenu()" routerLink="/content" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Edit')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">استوديو المحتوى</span>
        </a>
        
        <a (click)="closeMobileMenu()" routerLink="/knowledge-base" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('BookOpen')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">مركز المعرفة</span>
        </a>

        <a (click)="closeMobileMenu()" routerLink="/dev" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Code')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">مركز التطوير</span>
        </a>

        <!-- Live Ops -->
        <a (click)="closeMobileMenu()" routerLink="/ops" routerLinkActive="bg-red-900/50 text-red-100 border border-red-800 dark:bg-red-900/20 dark:border-red-800/50"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group text-red-200 dark:text-red-300 font-bold">
           <span [innerHTML]="getIcon('Activity')" class="w-5 h-5 opacity-80 group-hover:opacity-100 animate-pulse"></span>
           <span class="font-bold text-sm">غرفة العمليات</span>
        </a>

        <!-- Section Header -->
        <div class="pt-4 pb-2 px-2">
           <p class="text-[11px] font-bold text-wushai-olive/70 dark:text-wushai-lilac/50 uppercase tracking-widest">إدارة الموارد</p>
        </div>

        <a (click)="closeMobileMenu()" routerLink="/finance" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Briefcase')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">الخزنة (المالية)</span>
        </a>

        <a (click)="closeMobileMenu()" routerLink="/team" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Users')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">الفريق والترتيب</span>
        </a>
        @if(canManageUsers()) {
          <a (click)="closeMobileMenu()" routerLink="/admin-users" routerLinkActive="bg-red-900/50 text-red-100 border border-red-800 dark:bg-red-900/20 dark:border-red-800/50"
             class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group text-red-200 dark:text-red-300">
             <span [innerHTML]="getIcon('Users')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
             <span class="font-medium text-sm">إدارة المستخدمين</span>
             @if(isSystemAdmin()) {
               <span class="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">SYS</span>
             }
          </a>
        }

        <!-- Section Header -->
        <div class="pt-4 pb-2 px-2">
           <p class="text-[11px] font-bold text-wushai-olive/70 dark:text-wushai-lilac/50 uppercase tracking-widest">الجودة والتقارير</p>
        </div>

        <a (click)="closeMobileMenu()" routerLink="/traceability" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Shield')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">مصفوفة التتبع</span>
        </a>

        <a (click)="closeMobileMenu()" routerLink="/reports" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('BarChart')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">التقارير</span>
        </a>

        <a (click)="closeMobileMenu()" routerLink="/system" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Cpu')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">النظام</span>
        </a>

        <!-- System Admin Only -->
        @if(isSystemAdmin()) {
           <a (click)="closeMobileMenu()" routerLink="/monitoring" routerLinkActive="bg-indigo-900/50 text-indigo-100 border border-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800/50"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-indigo-900/30 dark:hover:bg-indigo-900/20 group text-indigo-300 font-bold mt-2">
              <span [innerHTML]="getIcon('Activity')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
              <span class="font-bold text-sm">رصد وتنفيذ</span>
              <span class="text-[8px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
           </a>
        }

        <!-- Admin Only -->
        @if(isAdmin()) {
           <a (click)="closeMobileMenu()" routerLink="/support" routerLinkActive="bg-green-900/50 text-green-300 border border-green-800 dark:text-green-300 dark:border-green-800/50"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group text-green-400 dark:text-green-300 font-bold">
              <span [innerHTML]="getIcon('LifeBuoy')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
              <span class="font-bold text-sm">الدعم الفني</span>
           </a>
        }

        <!-- Divider -->
        <div class="py-2">
           <div class="h-px bg-wushai-olive/20 dark:bg-wushai-lilac/10 mx-2"></div>
        </div>

        <a (click)="closeMobileMenu()" routerLink="/settings" routerLinkActive="bg-wushai-olive/50 text-white dark:bg-wushai-lilac/10 dark:text-white dark:border dark:border-wushai-lilac/20"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-wushai-olive/30 dark:hover:bg-wushai-lilac/5 group">
           <span [innerHTML]="getIcon('Settings')" class="w-5 h-5 opacity-80 group-hover:opacity-100"></span>
           <span class="font-medium text-sm">الإعدادات</span>
        </a>
      </nav>

      <!-- Focus Timer Widget -->
      <div class="mx-4 mb-4 bg-wushai-olive/20 dark:bg-wushai-lilac/5 rounded-xl p-3 text-center border border-wushai-olive/30 dark:border-wushai-lilac/10 relative overflow-hidden">
         <div class="absolute inset-0 bg-wushai-olive/10 dark:bg-wushai-lilac/5" [style.width.%]="(timeLeft() / (25 * 60)) * 100"></div>
         <p class="text-[10px] text-wushai-lavender dark:text-wushai-lilac/60 uppercase tracking-widest font-bold mb-1 relative z-10">Focus Timer</p>
         <div class="text-2xl font-mono font-bold text-white dark:text-wushai-lilac relative z-10">{{ formatTime(timeLeft()) }}</div>
         <div class="flex justify-center gap-2 mt-2 relative z-10">
            @if(!timerActive()) {
               <button (click)="startTimer()" class="bg-wushai-olive dark:bg-wushai-lilac hover:bg-wushai-success text-white dark:text-wushai-sidebar-dark px-3 py-1 rounded-lg text-xs font-bold transition-colors">Start</button>
            } @else {
               <button (click)="stopTimer()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors">Stop</button>
            }
            <button (click)="resetTimer()" class="bg-white/10 dark:bg-black/20 hover:bg-white/20 text-white dark:text-wushai-lilac px-3 py-1 rounded-lg text-xs font-bold transition-colors">Reset</button>
         </div>
      </div>

      <div class="p-6 border-t border-wushai-olive/30 dark:border-wushai-lilac/10">
        @if (user()) {
           <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                @if (user()?.avatarUrl) {
                  <img [src]="user()?.avatarUrl" [alt]="user()?.name" class="w-10 h-10 rounded-full object-cover border-2 border-white/20 dark:border-wushai-lilac/20 shadow-sm">
                } @else {
                  <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm border-2 border-white/20 dark:border-wushai-lilac/20" 
                       [style.background-color]="user()?.avatarColor">
                    {{ user()?.name?.charAt(0) }}
                  </div>
                }
                <div>
                  <p class="text-sm font-bold truncate w-20 text-wushai-sand dark:text-wushai-lilac">{{ user()?.name }}</p>
                  <p class="text-[10px] text-wushai-sand/60 dark:text-wushai-lilac/60 truncate w-20">{{ user()?.role }}</p>
                </div>
              </div>
              <button (click)="logout()" class="text-gray-400 dark:text-wushai-lilac/50 hover:text-red-400 dark:hover:text-red-300 transition-colors" title="تسجيل الخروج">
                 <span [innerHTML]="getIcon('LogOut')" class="w-5 h-5"></span>
              </button>
           </div>
        } @else {
           <div class="text-center">
              <p class="text-xs text-wushai-sand/50 dark:text-wushai-lilac/50">غير مسجل دخول</p>
           </div>
        }
      </div>
    </aside>
  `,
   styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(157, 139, 177, 0.3); border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(157, 139, 177, 0.6); }
  `]
})
export class SidebarComponent implements OnDestroy {
   private sanitizer = inject(DomSanitizer);
   private dataService = inject(DataService);
   private toastService = inject(ToastService);
   private permissions = inject(PermissionsService);
   private readonly timerStorageKey = 'himcontrol_focus_timer';
   private timerEndsAt: number | null = null;

   timeLeft = signal(25 * 60); // 25 minutes
   timerActive = signal(false);
   intervalId: any;
  unreadCount = computed(() => this.dataService.notifications().filter(n => !n.read).length);
  user = this.dataService.currentUser;
  
  // Use permissions service
  isAdmin = this.permissions.isAdmin;
  isSystemAdmin = this.permissions.isSystemAdmin;
  canManageUsers = this.permissions.canManageUsers;

   constructor() {
      this.restoreTimer();
   }

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   toggleNotifications() {
      this.dataService.toggleNotifications();
   }

   logout() {
      this.dataService.logout();
      this.closeMobileMenu();
   }

   toggleAiAssistant() {
      this.dataService.toggleAiAssistant();
   }

   closeMobileMenu() {
      this.dataService.closeMobileMenu();
   }

   formatTime(seconds: number): string {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
   }

   startTimer() {
      if (this.timerActive()) return;
      this.timerEndsAt = Date.now() + (this.timeLeft() * 1000);
      this.timerActive.set(true);
      this.persistTimer();
      this.startInterval();
   }

   stopTimer() {
      this.timerActive.set(false);
      clearInterval(this.intervalId);
      this.timerEndsAt = null;
      this.clearTimerStorage();
   }

   resetTimer() {
      this.stopTimer();
      this.timeLeft.set(25 * 60);
   }

   ngOnDestroy() {
      this.stopTimer();
   }

   private startInterval() {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => {
         if (!this.timerEndsAt) return;
         const remaining = Math.max(0, Math.ceil((this.timerEndsAt - Date.now()) / 1000));
         this.timeLeft.set(remaining);
         if (remaining <= 0) {
            this.completeTimer();
         }
      }, 1000);
   }

   private completeTimer() {
      this.stopTimer();
      this.timeLeft.set(0);
      this.toastService.show('انتهت جلسة التركيز', 'success', 4000);
   }

   private restoreTimer() {
      const stored = localStorage.getItem(this.timerStorageKey);
      if (!stored) return;
      try {
         const data = JSON.parse(stored);
         if (typeof data.endsAt !== 'number') return;
         const remaining = Math.ceil((data.endsAt - Date.now()) / 1000);
         if (remaining > 0) {
            this.timerEndsAt = data.endsAt;
            this.timeLeft.set(remaining);
            this.timerActive.set(true);
            this.startInterval();
         } else {
            this.clearTimerStorage();
         }
      } catch {
         this.clearTimerStorage();
      }
   }

   private persistTimer() {
      if (!this.timerEndsAt) return;
      localStorage.setItem(this.timerStorageKey, JSON.stringify({ endsAt: this.timerEndsAt }));
   }

   private clearTimerStorage() {
      localStorage.removeItem(this.timerStorageKey);
   }
}