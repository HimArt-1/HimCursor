
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../ui/icons';

@Component({
   selector: 'app-system-alert',
   standalone: true,
   imports: [CommonModule],
   template: `
    @if (alert()) {
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
         <div class="bg-white dark:bg-wushai-forest dark:border-wushai-olive border border-wushai-sand rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-scale-in">
            <!-- Header -->
            <div class="bg-wushai-olive text-white p-4 flex items-center gap-3">
               <div class="p-2 bg-white/20 rounded-full animate-pulse">
                  <span [innerHTML]="getIcon('Bell')" class="w-6 h-6"></span>
               </div>
               <div>
                  <h3 class="font-bold text-lg">تنبيه إداري هام</h3>
                  <p class="text-xs opacity-80">System Broadcast • {{ alert()?.timestamp | date:'shortTime' }}</p>
               </div>
            </div>
            
            <!-- Body -->
            <div class="p-8 text-center">
               <p class="text-xl font-bold text-wushai-dark dark:text-wushai-sand leading-relaxed">
                  {{ alert()?.message }}
               </p>
               <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  مرسل من: {{ alert()?.sender }}
               </div>
            </div>

            <!-- Footer -->
            <div class="p-4 bg-gray-50 dark:bg-wushai-espresso/30 flex justify-center">
               <button (click)="closeAlert()" class="bg-wushai-dark hover:bg-wushai-black text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
                  <span [innerHTML]="getIcon('Check')"></span>
                  علم، إغلاق التنبيه
               </button>
            </div>
         </div>
      </div>
    }
  `,
   styles: [`
    @keyframes scale-in {
       from { transform: scale(0.9); opacity: 0; }
       to { transform: scale(1); opacity: 1; }
    }
    .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  `]
})
export class SystemAlertComponent {
   dataService = inject(DataService);
   private sanitizer = inject(DomSanitizer);

   alert = this.dataService.activeAlert;
   currentUser = this.dataService.currentUser;

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   closeAlert() {
      const active = this.alert();
      const user = this.currentUser();
      if (active && user) {
         this.dataService.markAlertSeen(active.id, user.id);
      }
   }
}
