
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/state/toast.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from './icons';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="pointer-events-auto min-w-[300px] max-w-sm bg-white dark:bg-wushai-black border rounded-xl shadow-xl p-4 flex items-center gap-3 animate-slide-up transform transition-all"
             [ngClass]="{
               'border-green-500': toast.type === 'success',
               'border-red-500': toast.type === 'error',
               'border-blue-500': toast.type === 'info',
               'border-purple-500': toast.type === 'celebrate'
             }">
           
           <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
             [ngClass]="{
               'bg-green-100 text-green-600': toast.type === 'success',
               'bg-red-100 text-red-600': toast.type === 'error',
               'bg-blue-100 text-blue-600': toast.type === 'info',
               'bg-purple-100 text-purple-600': toast.type === 'celebrate'
             }">
             <span [innerHTML]="getIcon(toast.type)"></span>
           </div>

           <div class="flex-1">
             <p class="text-sm font-bold text-wushai-dark dark:text-white">{{ toast.message }}</p>
           </div>

           <button (click)="toastService.remove(toast.id)" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
             <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
           </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out forwards;
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  getIcon(type: string): SafeHtml {
    const iconName =
      type === 'success' ? 'Check' :
        type === 'error' ? 'Alert' :
          type === 'celebrate' ? 'Sparkles' :
            'Cpu';
    return this.sanitizer.bypassSecurityTrustHtml(Icons[iconName as keyof typeof Icons] || Icons.Alert);
  }
}
