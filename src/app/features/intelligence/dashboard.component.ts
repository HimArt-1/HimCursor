
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8 animate-fade-in">
      <header class="flex justify-between items-center">
        <div>
          <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand">لوحة القيادة</h2>
          <p class="text-wushai-olive dark:text-wushai-lilac/80 mt-2">أهلاً بك، نظرة سريعة على أداء مشروع وشّى اليوم.</p>
        </div>
        <div class="bg-white dark:bg-wushai-surface px-4 py-2 rounded-full shadow-sm text-sm text-wushai-olive dark:text-wushai-sand font-medium border border-wushai-sand dark:border-wushai-lilac/10">
          {{ todayDate | date:'fullDate' }}
        </div>
      </header>

      <!-- Stats Cards (Clickable) -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <a routerLink="/tasks" class="bg-white dark:bg-wushai-surface p-6 rounded-2xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 hover:shadow-lg hover:border-wushai-olive dark:hover:border-wushai-lilac/30 transition-all cursor-pointer group">
          <div class="flex justify-between items-start">
             <p class="text-sm text-wushai-olive dark:text-wushai-lilac/70 font-medium group-hover:text-wushai-dark dark:group-hover:text-wushai-sand">المهام قيد العمل</p>
             <span class="text-wushai-sand dark:text-wushai-lilac/50 group-hover:text-wushai-olive dark:group-hover:text-wushai-lilac transition-colors" [innerHTML]="getIcon('List')"></span>
          </div>
          <p class="text-4xl font-bold text-wushai-dark dark:text-wushai-sand mt-2">{{ stats().doingTasks }}</p>
        </a>
        
        <a routerLink="/tasks" class="bg-white dark:bg-wushai-surface p-6 rounded-2xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 hover:shadow-lg hover:border-wushai-olive dark:hover:border-wushai-lilac/30 transition-all cursor-pointer group">
          <div class="flex justify-between items-start">
             <p class="text-sm text-wushai-olive dark:text-wushai-lilac/70 font-medium group-hover:text-wushai-dark dark:group-hover:text-wushai-sand">المهام المكتملة</p>
             <span class="text-wushai-sand dark:text-wushai-lilac/50 group-hover:text-wushai-olive dark:group-hover:text-wushai-lilac transition-colors" [innerHTML]="getIcon('Check')"></span>
          </div>
          <p class="text-4xl font-bold text-wushai-success dark:text-green-400 mt-2">{{ stats().doneTasks }}</p>
        </a>

        <a routerLink="/traceability" class="bg-white dark:bg-wushai-surface p-6 rounded-2xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 hover:shadow-lg hover:border-wushai-olive dark:hover:border-wushai-lilac/30 transition-all cursor-pointer group">
          <div class="flex justify-between items-start">
             <p class="text-sm text-wushai-olive dark:text-wushai-lilac/70 font-medium group-hover:text-wushai-dark dark:group-hover:text-wushai-sand">نسبة التغطية (Traceability)</p>
             <span class="text-wushai-sand dark:text-wushai-lilac/50 group-hover:text-wushai-olive dark:group-hover:text-wushai-lilac transition-colors" [innerHTML]="getIcon('Shield')"></span>
          </div>
          <p class="text-4xl font-bold mt-2"
             [class.text-wushai-success]="traceReport().verifiedCount === traceReport().total"
             [class.text-wushai-warning]="traceReport().verifiedCount < traceReport().total">
             {{ getCoveragePercent() }}%
          </p>
        </a>

        <a routerLink="/system" class="bg-white dark:bg-wushai-surface p-6 rounded-2xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 hover:shadow-lg hover:border-wushai-olive dark:hover:border-wushai-lilac/30 transition-all cursor-pointer group">
           <div class="flex justify-between items-start">
             <p class="text-sm text-wushai-olive dark:text-wushai-lilac/70 font-medium group-hover:text-wushai-dark dark:group-hover:text-wushai-sand">حالة النظام</p>
             <span class="text-wushai-sand dark:text-wushai-lilac/50 group-hover:text-wushai-olive dark:group-hover:text-wushai-lilac transition-colors" [innerHTML]="getIcon('Cpu')"></span>
          </div>
           @if (traceReport().status === 'Verified') {
             <div class="mt-2 flex items-center gap-2 text-wushai-success dark:text-green-400 font-bold text-lg">
               <span class="w-3 h-3 rounded-full bg-wushai-success dark:bg-green-400"></span> سليم 100%
             </div>
           } @else if (traceReport().status === 'Blocked') {
             <div class="mt-2 flex items-center gap-2 text-wushai-danger dark:text-red-400 font-bold text-lg">
               <span class="w-3 h-3 rounded-full bg-wushai-danger dark:bg-red-400"></span> محظور (Blocked)
             </div>
           } @else {
             <div class="mt-2 flex items-center gap-2 text-wushai-warning dark:text-yellow-500 font-bold text-lg">
               <span class="w-3 h-3 rounded-full bg-wushai-warning dark:bg-yellow-500"></span> يوجد نواقص
             </div>
           }
        </a>
      </div>

      <!-- Integrity Alert Section -->
      @if (traceReport().status !== 'Verified') {
        <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 animate-pulse-once">
          <div class="flex items-start gap-4">
             <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400" [innerHTML]="getIcon('Alert')"></div>
             <div>
               <h3 class="text-lg font-bold text-red-800 dark:text-red-300">تنبيهات النزاهة (Integrity Alerts)</h3>
               <p class="text-red-600 dark:text-red-400/80 mt-1">يوجد {{ traceReport().errors.length }} أخطاء و {{ traceReport().warnings.length }} تحذيرات تمنع إصدار تقرير موثوق.</p>
               <div class="mt-4 flex gap-2">
                  <a routerLink="/traceability" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                    إصلاح في المصفوفة
                  </a>
               </div>
             </div>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Live Activity -->
        <div class="bg-white dark:bg-wushai-surface rounded-2xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 p-6">
          <div class="flex justify-between items-center mb-4">
             <h3 class="text-lg font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-2">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                موجز الأنشطة
             </h3>
             <a routerLink="/system" class="text-xs font-bold text-wushai-olive dark:text-wushai-lilac hover:underline">عرض السجل الكامل</a>
          </div>
          <div class="space-y-3">
            @for (log of auditLogs().slice(0, 4); track log.id) {
              <div class="flex items-center gap-3 p-3 bg-wushai-sand/30 dark:bg-wushai-black/20 rounded-xl border border-wushai-sand/50 dark:border-wushai-lilac/5 text-xs animate-fade-in-down">
                <span class="w-5 h-5 flex-shrink-0" [innerHTML]="getIconForAction(log.action)"></span>
                <div class="flex-1">
                  <span class="font-bold text-wushai-dark dark:text-wushai-sand">{{ log.user }}</span>
                  <span class="text-wushai-olive dark:text-wushai-lilac/70 mx-1">{{ log.action.toLowerCase() === 'create' ? 'added a' : 'updated a' }} {{ log.entityType }}:</span>
                  <span class="font-mono text-blue-600 dark:text-blue-400 text-[10px]">{{ log.entityId }}</span>
                </div>
                <span class="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{{ log.timestamp | date:'shortTime' }}</span>
              </div>
            }
            @if (auditLogs().length === 0) {
              <p class="text-xs text-center text-gray-400 py-4">No activity yet.</p>
            }
          </div>
        </div>

        <!-- Objectives -->
        <div class="md:col-span-2 bg-white dark:bg-wushai-surface rounded-2xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 p-6">
          <div class="flex justify-between items-center mb-4">
             <h3 class="text-lg font-bold text-wushai-dark dark:text-wushai-sand">أهداف المشروع (OKRs)</h3>
             <a routerLink="/traceability" class="text-xs font-bold text-wushai-olive dark:text-wushai-lilac hover:underline">تعديل</a>
          </div>
          <div class="space-y-4">
            @for (obj of objectives(); track obj.id) {
              <div class="border-b border-wushai-sand/50 dark:border-wushai-lilac/5 last:border-0 pb-3 last:pb-0">
                <div class="flex justify-between items-center mb-1">
                   <h4 class="font-bold text-wushai-brown dark:text-wushai-sand">{{ obj.title }}</h4>
                   <span class="text-xs px-2 py-0.5 rounded-full bg-wushai-lavender/20 dark:bg-wushai-lilac/20 text-wushai-dark dark:text-wushai-lilac">{{ obj.status }}</span>
                </div>
                <p class="text-sm text-wushai-olive dark:text-wushai-lilac/70">{{ obj.description }}</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .8; }
    }
    .animate-pulse-once {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1);
    }
    @keyframes fade-in-down {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-down {
      animation: fade-in-down 0.5s ease-out forwards;
    }
  `]
})
export class DashboardComponent {
  private dataService = inject(DataService);
  private sanitizer = inject(DomSanitizer);

  todayDate = new Date();
  stats = this.dataService.stats;
  objectives = this.dataService.objectives;
  traceReport = this.dataService.preflightReport;
  auditLogs = this.dataService.auditLogs;

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  getIconForAction(action: string): SafeHtml {
    let icon: keyof typeof Icons = 'Plus';
    if (action.toLowerCase().includes('update')) icon = 'Edit';
    if (action.toLowerCase().includes('delete')) icon = 'Trash';
    if (action.toLowerCase().includes('login')) icon = 'Lock';
    return this.getIcon(icon);
  }

  getCoveragePercent() {
    const report = this.traceReport();
    if (report.total === 0) return 0;
    return Math.round((report.verifiedCount / report.total) * 100);
  }
}
