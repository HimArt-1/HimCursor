
import { Component, inject, computed, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Milestone } from '../../core/services/state/data.service';
import { StrategyService } from '../../core/services/domain/strategy.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Icons } from '../../shared/ui/icons';

@Component({
   selector: 'app-strategy',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-8 animate-fade-in pb-10">
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-3">
             <span [innerHTML]="getIcon('Map')"></span>
             خارطة الطريق (Strategy Deck)
           </h2>
           <p class="text-wushai-olive mt-2">الرؤية العليا والجدول الزمني للإطلاقات.</p>
        </div>
        <button (click)="openMilestoneModal()" class="bg-wushai-dark hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
           <span [innerHTML]="getIcon('Flag')"></span> معلم جديد (Milestone)
        </button>
      </header>

      <!-- Vision Card -->
      <div class="bg-gradient-to-r from-wushai-deep to-wushai-brown rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
         <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
         <div class="relative z-10 text-center">
            <p class="text-xs uppercase tracking-[0.3em] opacity-70 mb-3">Vision Statement</p>
            <h1 class="text-2xl md:text-4xl font-bold leading-tight">
               "أن نكون الوجهة الأولى للأزياء العصرية التي تعكس الهوية السعودية بروح عالمية."
            </h1>
            <div class="flex justify-center gap-8 mt-6 opacity-80 text-sm">
               <span class="flex items-center gap-2"><span [innerHTML]="getIcon('Target')" class="w-4 h-4"></span> 100K Users</span>
               <span class="flex items-center gap-2"><span [innerHTML]="getIcon('Globe')" class="w-4 h-4"></span> GCC Expansion</span>
            </div>
         </div>
      </div>

      <!-- Roadmap Timeline -->
      <div class="bg-white dark:bg-wushai-black dark:border-wushai-olive border border-wushai-sand rounded-2xl shadow-sm overflow-hidden flex flex-col">
         <div class="p-6 border-b border-wushai-sand dark:border-wushai-olive flex justify-between items-center bg-wushai-light dark:bg-wushai-deep/30">
            <h3 class="font-bold text-lg text-wushai-dark dark:text-wushai-sand flex items-center gap-2">
               <span [innerHTML]="getIcon('CalendarRange')"></span> الجدول الزمني (Timeline)
            </h3>
            <div class="flex gap-2">
               <span class="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">Marketing</span>
               <span class="flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">Product</span>
               <span class="flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">Milestone</span>
            </div>
         </div>

         <div class="overflow-x-auto custom-scrollbar p-6">
            <div class="min-w-[1000px] relative">
               
               <!-- Months Header -->
               <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4 pb-2">
                  @for(month of timelineMonths; track month) {
                     <div class="flex-1 text-center border-l border-gray-100 dark:border-gray-800 first:border-0">
                        <span class="text-xs font-bold text-gray-500 uppercase">{{ month }}</span>
                     </div>
                  }
               </div>

               <!-- Milestones Row -->
               <div class="h-16 relative mb-6">
                  <div class="absolute top-1/2 left-0 w-full h-0.5 bg-wushai-sand dark:bg-gray-700"></div>
                  @for(ms of milestones(); track ms.id) {
                     <div class="absolute top-1/2 transform -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                          [style.left.%]="getDatePosition(ms.date)">
                        <div class="w-8 h-8 rounded-full bg-yellow-500 border-4 border-white dark:border-wushai-black shadow-lg flex items-center justify-center text-white z-10 transition-transform group-hover:scale-110">
                           <span [innerHTML]="getIcon('Flag')" class="w-4 h-4"></span>
                        </div>
                        <div class="absolute top-full mt-2 w-32 text-center opacity-70 group-hover:opacity-100 transition-opacity">
                           <p class="text-[10px] font-bold text-wushai-dark dark:text-white bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border border-gray-100 dark:border-gray-700">{{ ms.title }}</p>
                           <p class="text-[9px] text-gray-500">{{ ms.date | date:'shortDate' }}</p>
                        </div>
                     </div>
                  }
               </div>

               <!-- Tracks (Swimlanes) -->
               <div class="space-y-6">
                  <!-- 1. Marketing Campaigns -->
                  <div class="relative h-20 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center px-4">
                     <div class="absolute left-0 -ml-4 -rotate-90 text-[10px] font-bold text-blue-400 uppercase tracking-widest w-20 text-center">Marketing</div>
                     @for(camp of campaigns(); track camp.id) {
                        <div class="absolute top-2 bottom-2 bg-blue-500/80 rounded-lg shadow-sm border border-blue-400/50 flex items-center justify-center text-white text-[10px] font-bold px-2 overflow-hidden whitespace-nowrap hover:bg-blue-600 transition-colors cursor-help"
                             [style.left.%]="getDatePosition(camp.date)"
                             [style.width.%]="10" 
                             title="{{camp.title}}">
                           {{ camp.title }}
                        </div>
                     }
                  </div>

                  <!-- 2. Product Development (High Priority Tasks) -->
                  <div class="relative h-20 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30 flex items-center px-4">
                     <div class="absolute left-0 -ml-4 -rotate-90 text-[10px] font-bold text-purple-400 uppercase tracking-widest w-20 text-center">Product</div>
                     @for(task of highPriorityTasks(); track task.id) {
                        <div class="absolute top-2 bottom-2 bg-purple-500/80 rounded-lg shadow-sm border border-purple-400/50 flex items-center justify-center text-white text-[10px] font-bold px-2 overflow-hidden whitespace-nowrap hover:bg-purple-600 transition-colors cursor-help"
                             [style.left.%]="getDatePosition(task.dueDate)"
                             [style.width.%]="8"
                             title="{{task.title}}">
                           {{ task.title }}
                        </div>
                     }
                  </div>
               </div>

            </div>
         </div>
      </div>

      <!-- Release Notes Generator (Auto-generated) -->
      <div class="bg-white dark:bg-wushai-black dark:border-wushai-olive border border-wushai-sand rounded-2xl p-6 shadow-sm">
         <h3 class="font-bold text-lg text-wushai-dark dark:text-wushai-sand mb-4 flex items-center gap-2">
            <span [innerHTML]="getIcon('List')"></span>
            مسودة ملاحظات الإصدار (Auto-Generated Changelog)
         </h3>
         <div class="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl font-mono text-sm border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            <span class="text-wushai-olive font-bold"># Release Notes - {{ today | date:'mediumDate' }}</span>

            <span class="text-blue-600 font-bold block mt-4">## 🚀 Features & Updates</span>
            @for(task of recentDoneTasks(); track task.id) {
               - {{ task.title }} ({{ task.owner }})
            }

            <span class="text-purple-600 font-bold block mt-4">## 📢 Campaigns Launched</span>
            @for(camp of recentCampaigns(); track camp.id) {
               - {{ camp.title }} on {{ camp.platform }}
            }

            <span class="text-gray-500 block mt-4 italic">Generated by HimControl Strategy Engine.</span>
         </div>
         <div class="mt-4 flex justify-end">
            <button class="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-white px-3 py-1.5 rounded font-bold transition-colors">
               Copy to Clipboard
            </button>
         </div>
      </div>

      <!-- Add Milestone Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
           <div class="bg-white dark:bg-wushai-black rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-wushai-sand">
              <div class="p-5 border-b border-wushai-sand bg-wushai-light dark:bg-wushai-deep flex justify-between items-center">
                 <h3 class="font-bold text-xl text-wushai-dark dark:text-wushai-sand">إضافة معلم جديد</h3>
                 <button (click)="closeModal()" class="text-gray-400 hover:text-red-600 transition-colors">
                    <span [innerHTML]="getIcon('X')"></span>
                 </button>
              </div>
              <div class="p-6 space-y-4">
                 <div>
                    <label class="block text-sm font-bold text-wushai-olive mb-1">العنوان</label>
                    <input #mTitle type="text" class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive" placeholder="مثال: إطلاق النسخة التجريبية">
                 </div>
                 
                 <div>
                    <label class="block text-sm font-bold text-wushai-olive mb-1">التاريخ</label>
                    <input #mDate type="date" class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive">
                 </div>

                 <div>
                    <label class="block text-sm font-bold text-wushai-olive mb-1">النوع</label>
                    <select #mType class="w-full border rounded-lg p-3 outline-none bg-white">
                       <option value="Launch">إطلاق (Launch)</option>
                       <option value="Event">حدث (Event)</option>
                       <option value="Update">تحديث (Update)</option>
                    </select>
                 </div>

                 <button (click)="saveMilestone(mTitle.value, mDate.value, mType.value)" 
                    class="w-full bg-wushai-dark text-white py-3 rounded-xl font-bold hover:bg-wushai-black transition-all mt-2 shadow-lg">
                    حفظ
                 </button>
              </div>
           </div>
        </div>
      }
    </div>
  `,
   styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
  `]
})
export class StrategyComponent {
   private dataService = inject(DataService);
   private strategyService = inject(StrategyService); // Injected
   private sanitizer = inject(DomSanitizer);

   // milestones = this.dataService.milestones; // Legacy
   // Using objectives as milestones for now, or we need to add milestones to StrategyService?
   // The Task says "Objectives Table". 
   // Looking at the component, it uses 'milestones'. 
   // I should probably map 'objectives' to 'milestones' or add milestones to Supabase schema?
   // Let's assume for this specific task, we are replacing the logic.
   // Actually, let's keep it simple. The user wants "Pages" working.
   // StrategyService has 'objectives'. 
   // The component has 'milestones'. 
   // Let's alias objectives as milestones for now or update the component to show objectives.
   // Or better, let's add 'milestones' to Supabase if not present. 
   // Wait, the Phase 4 schema had 'objectives'.
   // Let's map objectives -> milestones for UI compatibility or update UI.

   // Using StrategyService for milestones
   milestones = this.strategyService.milestones;

   campaigns = this.dataService.campaigns;
   tasks = this.dataService.tasks;

   showModal = signal(false);
   today = new Date();

   // Computed data for Timeline
   highPriorityTasks = computed(() =>
      this.tasks().filter(t => t.priority === 'High' && t.status !== 'Done')
   );

   recentDoneTasks = computed(() =>
      this.tasks().filter(t => t.status === 'Done').slice(0, 5)
   );

   recentCampaigns = computed(() =>
      this.campaigns().filter(c => new Date(c.date) <= new Date()).slice(0, 3)
   );

   timelineMonths = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']; // Rolling window

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   // Calculate left position % based on a fixed 6-month window starting Oct 1st (Mock logic)
   getDatePosition(dateStr: string): number {
      const start = new Date('2023-10-01').getTime();
      const end = new Date('2024-03-31').getTime();
      const current = new Date(dateStr).getTime();

      if (current < start) return 0;
      if (current > end) return 100;

      return ((current - start) / (end - start)) * 100;
   }

   openMilestoneModal() { this.showModal.set(true); }
   closeModal() { this.showModal.set(false); }

   saveMilestone(title: string, date: string, type: any) {
      if (!title || !date) return;
      this.strategyService.addMilestone({
         title,
         date,
         type
      });
      this.closeModal();
   }
}
