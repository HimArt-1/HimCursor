import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/domain/analytics.service';
import { ChartComponent } from '../../shared/ui/chart.component';
import { Icons } from '../../shared/ui/icons';
import { DomSanitizer } from '@angular/platform-browser';
import { DataService } from '../../core/services/state/data.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  template: `
    <div class="h-full flex flex-col space-y-6">
      <!-- Header -->
      <header class="flex justify-between items-start">
        <div>
          <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand">التقارير التحليلية</h2>
          <p class="text-wushai-olive mt-2">نظرة شاملة على أداء المشاريع والأموال</p>
        </div>
        <div class="p-3 bg-white dark:bg-wushai-black rounded-xl border border-wushai-sand shadow-sm">
           <span [innerHTML]="getIcon('Activity')" class="text-wushai-olive"></span>
        </div>
      </header>

      <!-- KPI Summary -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-wushai-black p-4 rounded-2xl border border-wushai-sand shadow-sm">
          <p class="text-xs text-gray-400">Completion Rate</p>
          <p class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand mt-1">{{ completionRate() }}%</p>
          <p class="text-[10px] text-gray-400 mt-1">{{ taskStats().doneTasks }} / {{ taskStats().totalTasks }} مكتملة</p>
        </div>
        <div class="bg-white dark:bg-wushai-black p-4 rounded-2xl border border-red-200/60 dark:border-red-900/30 shadow-sm">
          <p class="text-xs text-gray-400">Overdue Tasks</p>
          <p class="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{{ overdueCount() }}</p>
          <p class="text-[10px] text-gray-400 mt-1">تحتاج معالجة</p>
        </div>
        <div class="bg-white dark:bg-wushai-black p-4 rounded-2xl border border-wushai-sand shadow-sm">
          <p class="text-xs text-gray-400">Active Tasks</p>
          <p class="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">{{ taskStats().doingTasks }}</p>
          <p class="text-[10px] text-gray-400 mt-1">قيد التنفيذ</p>
        </div>
        <div class="bg-white dark:bg-wushai-black p-4 rounded-2xl border border-wushai-sand shadow-sm">
          <p class="text-xs text-gray-400">Net Flow</p>
          <p class="text-3xl font-bold mt-1" [class.text-green-600]="netFlow() >= 0" [class.text-red-600]="netFlow() < 0">
            {{ netFlow() >= 0 ? '+' : '' }}{{ netFlow() }}
          </p>
          <p class="text-[10px] text-gray-400 mt-1">دخل - مصروف</p>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        
        <!-- 1. Task Status (Pie) -->
        <div class="bg-white dark:bg-wushai-black p-6 rounded-2xl border border-wushai-sand shadow-sm flex flex-col">
           <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
             <span [innerHTML]="getIcon('Activity')" class="w-5 h-5 text-blue-500"></span>
             حالة المهام (Task Status)
           </h3>
           <div class="flex-1 min-h-[250px]">
             <app-chart type="doughnut" [data]="statusData()"></app-chart>
           </div>
        </div>

        <!-- 2. Tasks by Domain (Bar) -->
         <div class="bg-white dark:bg-wushai-black p-6 rounded-2xl border border-wushai-sand shadow-sm flex flex-col md:col-span-2">
           <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
             <span [innerHTML]="getIcon('BarChart')" class="w-5 h-5 text-purple-500"></span>
             توزيع المهام (By Domain)
           </h3>
           <div class="flex-1 min-h-[250px]">
             <app-chart type="bar" [data]="domainData()"></app-chart>
           </div>
        </div>

        <!-- 3. Financial Flow (Line) -->
         <div class="bg-white dark:bg-wushai-black p-6 rounded-2xl border border-wushai-sand shadow-sm flex flex-col md:col-span-3">
           <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
             <span [innerHTML]="getIcon('TrendingUp')" class="w-5 h-5 text-green-500"></span>
             التدفق المالي (Revenue vs Expenses)
           </h3>
           <div class="flex-1 min-h-[300px]">
             <app-chart type="line" [data]="financeData()"></app-chart>
           </div>
        </div>

        <!-- 4. User Activity (Bar) -->
         <div class="bg-white dark:bg-wushai-black p-6 rounded-2xl border border-wushai-sand shadow-sm flex flex-col">
           <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
             <span [innerHTML]="getIcon('Users')" class="w-5 h-5 text-yellow-500"></span>
             نشاط الفريق (Activity Log)
           </h3>
           <div class="flex-1 min-h-[250px]">
             <app-chart type="bar" [data]="activityData()" [options]="{ indexAxis: 'y' }"></app-chart>
           </div>
        </div>

      </div>
    </div>
  `
})
export class ReportsComponent {
  private analytics = inject(AnalyticsService);
  private dataService = inject(DataService);
  private sanitizer = inject(DomSanitizer);

  statusData = this.analytics.taskStatusData;
  domainData = this.analytics.taskDomainData;
  financeData = this.analytics.financialFlowData;
  activityData = this.analytics.userActivityData;

  taskStats = this.dataService.stats;
  transactions = this.dataService.transactions;

  overdueCount = computed(() => this.dataService.tasks().filter(t => t.status !== 'Done' && this.isOverdue(t.dueDate)).length);
  completionRate = computed(() => {
    const stats = this.taskStats();
    if (!stats.totalTasks) return 0;
    return Math.round((stats.doneTasks / stats.totalTasks) * 100);
  });
  netFlow = computed(() => {
    const txs = this.transactions();
    const income = txs.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const expense = txs.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    return income - expense;
  });

  getIcon(name: keyof typeof Icons) {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  private isOverdue(dateStr: string): boolean {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }
}
