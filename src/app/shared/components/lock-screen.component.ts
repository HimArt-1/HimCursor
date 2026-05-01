import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppLockService } from '../../core/services/infra/app-lock.service';
import { SafeHtmlPipe } from '../pipes/safe-html.pipe';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  template: `
    @if (appLock.isLocked()) {
      <div class="fixed inset-0 z-[9999] bg-[#fdfaf6]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
        
        <div class="w-32 h-32 bg-white rounded-[40px] shadow-2xl flex items-center justify-center mb-10 relative overflow-hidden group">
            <div class="absolute inset-0 bg-[#7A4E2D]/5 group-hover:bg-[#7A4E2D]/10 transition-colors"></div>
            <div [innerHTML]="lockIcon | safeHtml" class="w-16 h-16 text-[#7A4E2D] animate-pulse"></div>
        </div>

        <h1 class="text-3xl font-black text-[#2c1810] tracking-tight mb-3">الجلسة مقفلة</h1>
        <p class="text-[#a09c94] mb-12 font-medium">يرجى التحقق من هويتك للمتابعة</p>

        <button 
            (click)="unlock()"
            class="flex items-center gap-4 bg-[#7A4E2D] text-white px-10 py-5 rounded-[30px] font-black hover:shadow-[0_20px_40px_rgba(122,78,45,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 group"
        >
            <div [innerHTML]="fingerprintIcon | safeHtml" class="w-7 h-7 fill-white group-hover:rotate-12 transition-transform"></div>
            <span class="text-lg">فتح القفل</span>
        </button>
        
        <div class="absolute bottom-10 text-[#a09c94] text-xs font-bold tracking-widest uppercase opacity-50">
            Washa Control System · Secured
        </div>
      </div>
    }
  `
})
export class LockScreenComponent {
    appLock = inject(AppLockService);

    lockIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
    fingerprintIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm10 6c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm-2-6c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"></path></svg>`;

    unlock() {
        this.appLock.promptBiometricUnlock();
    }
}
