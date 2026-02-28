
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/domain/notification.service';
import { UiService } from '../../core/services/state/ui.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../ui/icons';

@Component({
   selector: 'app-notification-panel',
   standalone: true,
   imports: [CommonModule],
   template: `
    @if (uiService.showNotifications()) {
      <div class="fixed inset-0 z-[100] flex justify-end">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" (click)="close()"></div>
        
        <!-- Drawer -->
        <div class="relative w-full max-w-sm bg-white dark:bg-wushai-black border-l border-wushai-sand dark:border-wushai-olive shadow-2xl h-full flex flex-col animate-slide-in">
           
           <!-- Header -->
           <div class="p-4 border-b border-wushai-sand dark:border-wushai-olive bg-wushai-light dark:bg-wushai-deep">
              <div class="flex justify-between items-center">
                 <div>
                    <h3 class="font-bold text-lg text-wushai-dark dark:text-wushai-sand flex items-center gap-2">
                       <span [innerHTML]="getIcon('Bell')"></span> الإشعارات
                    </h3>
                    <p class="text-xs text-wushai-olive mt-0.5">
                       @if (notifService.unreadCount() > 0) {
                         {{ notifService.unreadCount() }} غير مقروءة
                       } @else {
                         لا توجد إشعارات جديدة
                       }
                    </p>
                 </div>
                 <div class="flex items-center gap-2">
                    <button (click)="markAll()" class="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors">
                       مقروء
                    </button>
                    <button (click)="close()" class="text-gray-400 hover:text-red-500 transition-colors">
                       <span [innerHTML]="getIcon('X')"></span>
                    </button>
                 </div>
              </div>

              <!-- Category Filters -->
              <div class="flex gap-1.5 mt-3 overflow-x-auto custom-scrollbar pb-1">
                @for (cat of notifService.categories; track cat.key) {
                  <button (click)="notifService.activeCategory.set(cat.key)"
                    class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0"
                    [ngClass]="notifService.activeCategory() === cat.key
                      ? 'bg-wushai-cocoa text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'">
                    <span class="text-sm">{{ cat.icon }}</span>
                    {{ cat.label }}
                  </button>
                }
              </div>
           </div>

           <!-- Notification List -->
           <div class="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              @if (notifService.isLoading()) {
                <div class="flex justify-center py-8">
                  <div class="w-6 h-6 border-2 border-wushai-cocoa/30 border-t-wushai-cocoa rounded-full animate-spin"></div>
                </div>
              } @else {
                @for (notif of notifService.groupedNotifications(); track notif.id) {
                   <div class="p-3.5 rounded-xl border transition-all relative group cursor-pointer hover:shadow-sm"
                        (click)="handleClick(notif)"
                        [ngClass]="notif.read
                          ? 'bg-white dark:bg-wushai-black border-gray-100 dark:border-gray-800 opacity-70'
                          : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-100 dark:border-blue-900/30 shadow-sm'">
                      
                      <!-- Delete Button -->
                      <button (click)="deleteNotif($event, notif.id)" class="absolute top-2 left-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                         <span [innerHTML]="getIcon('Trash')" class="w-4 h-4"></span>
                      </button>

                      <div class="flex items-start gap-3">
                         <!-- Type Indicator -->
                         <div class="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                              [ngClass]="{
                                 'bg-blue-100 dark:bg-blue-900/30': notif.type === 'Info',
                                 'bg-green-100 dark:bg-green-900/30': notif.type === 'Success',
                                 'bg-amber-100 dark:bg-amber-900/30': notif.type === 'Warning',
                                 'bg-purple-100 dark:bg-purple-900/30': notif.type === 'celebrate'
                              }">
                            {{ getCategoryIcon(notif.category || 'system') }}
                         </div>

                         <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                              <p class="font-bold text-sm text-wushai-dark dark:text-white truncate">{{ notif.title }}</p>
                              @if (!notif.read) {
                                <span class="w-2 h-2 bg-blue-500 rounded-full shrink-0 animate-pulse"></span>
                              }
                            </div>
                            <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{{ notif.message }}</p>
                            <!-- Grouped badge -->
                            @if (getGroupCount(notif) > 0) {
                              <span class="inline-flex items-center mt-1 px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded-full text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                +{{ getGroupCount(notif) - 1 }} أخرى
                              </span>
                            }
                            <p class="text-[10px] text-gray-400 mt-1.5">{{ notifService.getRelativeTime(notif.time) }}</p>
                         </div>
                      </div>
                   </div>
                }
                @if (notifService.groupedNotifications().length === 0) {
                   <div class="flex flex-col items-center justify-center h-40 text-gray-400">
                      <span [innerHTML]="getIcon('Check')" class="w-8 h-8 opacity-50 mb-2"></span>
                      <p class="text-sm">لا توجد إشعارات</p>
                   </div>
                }
              }
           </div>
        </div>
      </div>
    }
  `,
   styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
    .line-clamp-2 {
       display: -webkit-box;
       -webkit-line-clamp: 2;
       -webkit-box-orient: vertical;
       overflow: hidden;
    }
    @keyframes slide-in {
       from { transform: translateX(100%); }
       to { transform: translateX(0); }
    }
    .animate-slide-in {
       animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class NotificationPanelComponent {
   notifService = inject(NotificationService);
   uiService = inject(UiService);
   private router = inject(Router);
   private sanitizer = inject(DomSanitizer);

   close() {
      this.uiService.showNotifications.set(false);
   }

   markAll() {
      this.notifService.markAllRead();
   }

   deleteNotif(event: Event, id: string) {
      event.stopPropagation();
      this.notifService.deleteNotification(id);
   }

   handleClick(notif: any) {
      this.notifService.markAsRead(notif.id);
      if (notif.actionUrl) {
         this.router.navigateByUrl(notif.actionUrl);
         this.close();
      }
   }

   getCategoryIcon(category: string): string {
      const icons: Record<string, string> = {
         tasks: '✅', finance: '💰', system: '⚙️', team: '👥', all: '📋'
      };
      return icons[category] || '📋';
   }

   getGroupCount(notif: any): number {
      return notif.groupCount || 0;
   }

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }
}
