
import { Component, inject, computed } from '@angular/core';
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

      <!-- Smart Insights -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <a routerLink="/tasks" [queryParams]="{ overdue: 1 }" class="bg-white dark:bg-wushai-surface p-5 rounded-2xl shadow-sm border border-red-200/60 dark:border-red-900/30 hover:shadow-lg transition-all">
          <p class="text-xs font-bold text-red-500 uppercase tracking-widest">متأخرة</p>
          <p class="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-2">{{ overdueCount() }}</p>
          <p class="text-xs text-gray-500 mt-1">تحتاج تدخل عاجل</p>
        </a>
        <a routerLink="/tasks" [queryParams]="{ due: 7 }" class="bg-white dark:bg-wushai-surface p-5 rounded-2xl shadow-sm border border-amber-200/60 dark:border-amber-900/30 hover:shadow-lg transition-all">
          <p class="text-xs font-bold text-amber-500 uppercase tracking-widest">قريبة</p>
          <p class="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">{{ dueSoonCount() }}</p>
          <p class="text-xs text-gray-500 mt-1">خلال 7 أيام</p>
        </a>
        <a routerLink="/tasks" [queryParams]="{ priority: 'High' }" class="bg-white dark:bg-wushai-surface p-5 rounded-2xl shadow-sm border border-purple-200/60 dark:border-purple-900/30 hover:shadow-lg transition-all">
          <p class="text-xs font-bold text-purple-500 uppercase tracking-widest">أولوية عالية</p>
          <p class="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">{{ highPriorityCount() }}</p>
          <p class="text-xs text-gray-500 mt-1">تأثير مباشر على الهدف</p>
        </a>
        <a routerLink="/tasks" [queryParams]="{ owner: 'غير محدد' }" class="bg-white dark:bg-wushai-surface p-5 rounded-2xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 hover:shadow-lg transition-all">
          <p class="text-xs font-bold text-wushai-olive uppercase tracking-widest">غير مسندة</p>
          <p class="text-3xl font-extrabold text-wushai-dark dark:text-wushai-sand mt-2">{{ unassignedCount() }}</p>
          <p class="text-xs text-gray-500 mt-1">بحاجة لمالك</p>
        </a>
      </div>

      <!-- Quick Actions -->
      <div class="flex flex-wrap items-center gap-3">
        <a routerLink="/tasks" [queryParams]="{ new: 1 }" class="px-4 py-2 rounded-xl bg-wushai-dark text-white text-sm font-bold shadow hover:bg-wushai-black transition-colors">
          مهمة جديدة
        </a>
        <a routerLink="/tasks" [queryParams]="{ owner: 'me' }" class="px-4 py-2 rounded-xl bg-wushai-olive/20 text-wushai-olive text-sm font-bold border border-wushai-olive/30 hover:bg-wushai-olive/30 transition-colors">
          مهامي
        </a>
        <a routerLink="/traceability" class="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100 hover:bg-red-100 transition-colors">
          إصلاح التتبع
        </a>
      </div>

      <!-- Daily Brief -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white dark:bg-wushai-surface rounded-2xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 p-6">
          <h3 class="text-lg font-bold text-wushai-dark dark:text-wushai-sand mb-4">الملخص اليومي</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 rounded-xl bg-wushai-sand/40 dark:bg-wushai-black/20 border border-wushai-sand/50 dark:border-wushai-lilac/10">
              <p class="text-xs text-gray-500">الأولوية القصوى</p>
              <p class="text-sm font-bold text-wushai-dark dark:text-wushai-sand mt-1">عالج المتأخرات أولاً</p>
              <p class="text-xs text-gray-400 mt-2">يوجد {{ overdueCount() }} مهام متأخرة</p>
            </div>
            <div class="p-4 rounded-xl bg-wushai-sand/40 dark:bg-wushai-black/20 border border-wushai-sand/50 dark:border-wushai-lilac/10">
              <p class="text-xs text-gray-500">الأسبوع القادم</p>
              <p class="text-sm font-bold text-wushai-dark dark:text-wushai-sand mt-1">أغلق المهم قبل الموعد</p>
              <p class="text-xs text-gray-400 mt-2">{{ dueSoonCount() }} مهام خلال 7 أيام</p>
            </div>
            <div class="p-4 rounded-xl bg-wushai-sand/40 dark:bg-wushai-black/20 border border-wushai-sand/50 dark:border-wushai-lilac/10">
              <p class="text-xs text-gray-500">توزيع العمل</p>
              <p class="text-sm font-bold text-wushai-dark dark:text-wushai-sand mt-1">اسند غير المملوك</p>
              <p class="text-xs text-gray-400 mt-2">{{ unassignedCount() }} مهام بلا مالك</p>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-wushai-surface rounded-2xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 p-6">
          <h3 class="text-lg font-bold text-wushai-dark dark:text-wushai-sand mb-4">المهام الحرجة</h3>
          <div class="space-y-3">
            @for (task of riskTasks(); track task.id) {
              <a routerLink="/tasks" [queryParams]="{ q: task.title }"
                 class="flex items-center justify-between gap-3 p-3 rounded-xl bg-wushai-light/60 dark:bg-wushai-black/30 border border-wushai-sand/40 dark:border-wushai-lilac/10 hover:bg-wushai-sand/60 transition-colors">
                <div>
                  <p class="text-sm font-bold text-wushai-dark dark:text-wushai-sand">{{ task.title }}</p>
                  <p class="text-xs text-gray-400 mt-1">{{ task.owner }} • {{ task.dueDate | date:'shortDate' }}</p>
                </div>
                <span class="text-xs font-bold"
                      [class.text-red-600]="isOverdue(task.dueDate)"
                      [class.text-amber-600]="!isOverdue(task.dueDate) && isDueWithin(task.dueDate, 7)">
                  {{ isOverdue(task.dueDate) ? 'متأخرة' : 'قريبة' }}
                </span>
              </a>
            }
            @if (riskTasks().length === 0) {
              <p class="text-xs text-gray-400 text-center py-6">لا توجد مهام حرجة حالياً</p>
            }
          </div>
        </div>
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
  tasks = this.dataService.tasks;
  objectives = this.dataService.objectives;
  traceReport = this.dataService.preflightReport;
  auditLogs = this.dataService.auditLogs;

  overdueCount = computed(() => this.tasks().filter(t => t.status !== 'Done' && this.isOverdue(t.dueDate)).length);
  dueSoonCount = computed(() => this.tasks().filter(t => t.status !== 'Done' && this.isDueWithin(t.dueDate, 7)).length);
  highPriorityCount = computed(() => this.tasks().filter(t => t.status !== 'Done' && t.priority === 'High').length);
  unassignedCount = computed(() => this.tasks().filter(t => !t.owner || t.owner === 'غير محدد').length);

  riskTasks = computed(() => {
    const tasks = this.tasks().filter(t => t.status !== 'Done');
    return tasks
      .map(task => {
        const overdue = this.isOverdue(task.dueDate);
        const dueSoon = this.isDueWithin(task.dueDate, 7);
        const high = task.priority === 'High';
        const score = (overdue ? 3 : 0) + (dueSoon ? 2 : 0) + (high ? 1 : 0);
        return { task, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime())
      .slice(0, 5)
      .map(item => item.task);
  });

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

  private isOverdue(dateStr: string): boolean {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  private isDueWithin(dateStr: string, days: number): boolean {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const now = new Date();
    const end = new Date();
    end.setDate(now.getDate() + days);
    now.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return due >= now && due <= end;
  }
}
