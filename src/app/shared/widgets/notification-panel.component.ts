
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../ui/icons';

@Component({
   selector: 'app-notification-panel',
   standalone: true,
   imports: [CommonModule],
   template: `
    @if (dataService.showNotifications()) {
      <div class="fixed inset-0 z-[100] flex justify-end">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" (click)="close()"></div>
        
        <!-- Drawer -->
        <div class="relative w-full max-w-sm bg-white dark:bg-wushai-black border-l border-wushai-sand dark:border-wushai-olive shadow-2xl h-full flex flex-col animate-slide-in">
           
           <div class="p-4 border-b border-wushai-sand dark:border-wushai-olive flex justify-between items-center bg-wushai-light dark:bg-wushai-deep">
              <div>
                 <h3 class="font-bold text-lg text-wushai-dark dark:text-wushai-sand flex items-center gap-2">
                    <span [innerHTML]="getIcon('Bell')"></span> الإشعارات
                 </h3>
                 <p class="text-xs text-wushai-olive">لديك {{ unreadCount() }} إشعارات غير مقروءة</p>
              </div>
              <div class="flex items-center gap-2">
                 <button (click)="markAll()" class="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors" title="Mark all as read">
                    مقروء
                 </button>
                 <button (click)="close()" class="text-gray-400 hover:text-red-500 transition-colors">
                    <span [innerHTML]="getIcon('X')"></span>
                 </button>
              </div>
           </div>

           <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              @for (notif of dataService.notifications(); track notif.id) {
                 <div class="p-4 rounded-xl border transition-all relative group"
                      [ngClass]="notif.read ? 'bg-white dark:bg-wushai-black border-gray-100 dark:border-gray-800 opacity-75' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 shadow-sm'">
                    
                    <button (click)="delete(notif.id)" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                       <span [innerHTML]="getIcon('Trash')" class="w-4 h-4"></span>
                    </button>

                    <div class="flex items-start gap-3">
                       <div class="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                            [ngClass]="{
                               'bg-blue-500': notif.type === 'Info',
                               'bg-green-500': notif.type === 'Success',
                               'bg-yellow-500': notif.type === 'Warning'
                            }"></div>
                       <div>
                          <p class="font-bold text-sm text-wushai-dark dark:text-white">{{ notif.title }}</p>
                          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{{ notif.message }}</p>
                          <p class="text-[10px] text-gray-400 mt-2 font-mono">{{ notif.time | date:'shortTime' }}</p>
                       </div>
                    </div>
                 </div>
              }
              @if (dataService.notifications().length === 0) {
                 <div class="flex flex-col items-center justify-center h-40 text-gray-400">
                    <span [innerHTML]="getIcon('Check')" class="w-8 h-8 opacity-50 mb-2"></span>
                    <p class="text-sm">لا توجد إشعارات</p>
                 </div>
              }
           </div>
        </div>
      </div>
    }
  `,
   styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
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
   dataService = inject(DataService);
   private sanitizer = inject(DomSanitizer);

   unreadCount = computed(() => this.dataService.notifications().filter(n => !n.read).length);

   close() {
      this.dataService.showNotifications.set(false);
   }

   markAll() {
      this.dataService.markAllNotificationsRead();
   }

   delete(id: string) {
      this.dataService.deleteNotification(id);
   }

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }
}
