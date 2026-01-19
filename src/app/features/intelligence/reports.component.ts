import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/domain/analytics.service';
import { ChartComponent } from '../../shared/ui/chart.component';
import { Icons } from '../../shared/ui/icons';
import { DomSanitizer } from '@angular/platform-browser';

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
  private sanitizer = inject(DomSanitizer);

  statusData = this.analytics.taskStatusData;
  domainData = this.analytics.taskDomainData;
  financeData = this.analytics.financialFlowData;
  activityData = this.analytics.userActivityData;

  getIcon(name: keyof typeof Icons) {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }
}
