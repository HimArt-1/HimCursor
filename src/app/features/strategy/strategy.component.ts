import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/state/data.service';
import { StrategyService, Objective, Milestone } from '../../core/services/domain/strategy.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { ToastService } from '../../core/services/state/toast.service';

type ModalType = 'none' | 'objective' | 'milestone';

@Component({
   selector: 'app-strategy',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-8 animate-fade-in pb-10">
      <!-- Header -->
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-3">
             <span [innerHTML]="getIcon('Map')"></span>
             خارطة الطريق (Strategy Deck)
           </h2>
           <p class="text-wushai-olive mt-2">الرؤية العليا، الأهداف الاستراتيجية، والجدول الزمني.</p>
        </div>
        <div class="flex gap-3">
           <button (click)="openModal('objective')" class="bg-wushai-olive hover:bg-wushai-dark text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
              <span [innerHTML]="getIcon('Target')"></span> هدف جديد
           </button>
           <button (click)="openModal('milestone')" class="bg-wushai-dark hover:bg-black text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
              <span [innerHTML]="getIcon('Flag')"></span> معلم جديد
           </button>
        </div>
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
               <span class="flex items-center gap-2"><span [innerHTML]="getIcon('Target')" class="w-4 h-4"></span> {{ objectives().length }} هدف</span>
               <span class="flex items-center gap-2"><span [innerHTML]="getIcon('Flag')" class="w-4 h-4"></span> {{ milestones().length }} معلم</span>
               <span class="flex items-center gap-2"><span [innerHTML]="getIcon('TrendingUp')" class="w-4 h-4"></span> {{ overallProgress() }}% إنجاز</span>
            </div>
         </div>
      </div>

      <!-- OKR Section - Objectives & Key Results -->
      <div class="bg-white dark:bg-wushai-black border border-wushai-sand dark:border-wushai-olive rounded-2xl shadow-sm overflow-hidden">
         <div class="p-6 border-b border-wushai-sand dark:border-wushai-olive flex justify-between items-center bg-gradient-to-r from-wushai-light to-white dark:from-wushai-deep dark:to-wushai-surface">
            <div class="flex items-center gap-3">
               <span [innerHTML]="getIcon('Target')" class="w-6 h-6 text-wushai-olive"></span>
               <div>
                  <h3 class="font-bold text-lg text-wushai-dark dark:text-white">الأهداف الاستراتيجية (OKRs)</h3>
                  <p class="text-xs text-gray-500">Objectives & Key Results</p>
               </div>
            </div>
            <div class="flex gap-2">
               @for (term of ['Short', 'Medium', 'Long']; track term) {
                  <button (click)="filterTerm.set(filterTerm() === term ? null : term)"
                     class="text-[10px] px-3 py-1.5 rounded-full font-bold transition-all"
                     [class.bg-wushai-olive]="filterTerm() === term"
                     [class.text-white]="filterTerm() === term"
                     [class.bg-gray-100]="filterTerm() !== term"
                     [class.dark:bg-gray-800]="filterTerm() !== term"
                     [class.text-gray-600]="filterTerm() !== term">
                     {{ term === 'Short' ? 'قصير المدى' : term === 'Medium' ? 'متوسط' : 'طويل المدى' }}
                  </button>
               }
            </div>
         </div>

         <div class="p-6 space-y-4">
            @if (filteredObjectives().length === 0) {
               <div class="text-center py-12 text-gray-400">
                  <span [innerHTML]="getIcon('Target')" class="w-16 h-16 opacity-20 mx-auto block mb-4"></span>
                  <p class="font-bold">لا توجد أهداف</p>
                  <p class="text-sm">اضغط "هدف جديد" لإضافة أول هدف استراتيجي</p>
               </div>
            }

            @for (obj of filteredObjectives(); track obj.id) {
               <div class="bg-gray-50 dark:bg-wushai-deep/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all group">
                  <div class="flex items-start justify-between gap-4">
                     <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                           <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              [class.bg-green-100]="obj.term === 'Short'"
                              [class.text-green-700]="obj.term === 'Short'"
                              [class.bg-yellow-100]="obj.term === 'Medium'"
                              [class.text-yellow-700]="obj.term === 'Medium'"
                              [class.bg-purple-100]="obj.term === 'Long'"
                              [class.text-purple-700]="obj.term === 'Long'">
                              {{ obj.term === 'Short' ? 'قصير' : obj.term === 'Medium' ? 'متوسط' : 'طويل' }}
                           </span>
                           <span class="text-[10px] text-gray-400 font-mono">{{ obj.id.substring(0, 8) }}</span>
                        </div>
                        <h4 class="font-bold text-wushai-dark dark:text-white text-lg">{{ obj.title }}</h4>
                        @if (obj.description) {
                           <p class="text-sm text-gray-500 mt-1">{{ obj.description }}</p>
                        }
                        @if (obj.owner) {
                           <p class="text-xs text-wushai-olive mt-2 flex items-center gap-1">
                              <span [innerHTML]="getIcon('User')" class="w-3 h-3"></span> {{ obj.owner }}
                           </p>
                        }
                     </div>
                     
                     <!-- Progress Ring -->
                     <div class="relative w-20 h-20">
                        <svg class="w-20 h-20 transform -rotate-90">
                           <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="6" fill="transparent" class="text-gray-200 dark:text-gray-700"/>
                           <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="6" fill="transparent" 
                              class="text-wushai-olive" 
                              [style.stroke-dasharray]="'226.2'"
                              [style.stroke-dashoffset]="226.2 - (226.2 * (obj.progress || 0) / 100)"/>
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center">
                           <span class="text-lg font-bold text-wushai-dark dark:text-white">{{ obj.progress || 0 }}%</span>
                        </div>
                     </div>
                  </div>

                  <!-- Progress Slider -->
                  <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                     <div class="flex items-center justify-between mb-2">
                        <span class="text-xs text-gray-500">تحديث التقدم:</span>
                        <span class="text-xs font-bold text-wushai-olive">{{ obj.progress || 0 }}%</span>
                     </div>
                     <input type="range" min="0" max="100" [value]="obj.progress || 0" 
                        (change)="updateProgress(obj.id, $any($event.target).value)"
                        class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-wushai-olive">
                     <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                     </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex justify-end gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button (click)="editObjective(obj)" class="text-xs text-wushai-olive hover:text-wushai-dark font-bold">تعديل</button>
                     <button (click)="deleteObjective(obj.id)" class="text-xs text-red-500 hover:text-red-700 font-bold">حذف</button>
                  </div>
               </div>
            }
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
                        <div class="w-8 h-8 rounded-full border-4 border-white dark:border-wushai-black shadow-lg flex items-center justify-center text-white z-10 transition-transform group-hover:scale-110"
                           [class.bg-yellow-500]="ms.type === 'Launch'"
                           [class.bg-blue-500]="ms.type === 'Event'"
                           [class.bg-green-500]="ms.type === 'Update'">
                           <span [innerHTML]="getIcon('Flag')" class="w-4 h-4"></span>
                        </div>
                        <div class="absolute top-full mt-2 w-32 text-center opacity-70 group-hover:opacity-100 transition-opacity">
                           <p class="text-[10px] font-bold text-wushai-dark dark:text-white bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border border-gray-100 dark:border-gray-700">{{ ms.title }}</p>
                           <p class="text-[9px] text-gray-500">{{ ms.date | date:'shortDate' }}</p>
                        </div>
                     </div>
                  }
                  @if (milestones().length === 0) {
                     <div class="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        لا توجد معالم - اضغط "معلم جديد" للإضافة
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

      <!-- Release Notes Generator -->
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
            <button (click)="copyReleaseNotes()" class="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-white px-3 py-1.5 rounded font-bold transition-colors">
               Copy to Clipboard
            </button>
         </div>
      </div>

      <!-- Modal -->
      @if (modalType() !== 'none') {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
           <div class="bg-white dark:bg-wushai-black rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-wushai-sand">
              <div class="p-5 border-b border-wushai-sand bg-wushai-light dark:bg-wushai-deep flex justify-between items-center">
                 <h3 class="font-bold text-xl text-wushai-dark dark:text-wushai-sand">
                    {{ modalType() === 'objective' ? (editingObjective() ? 'تعديل الهدف' : 'هدف استراتيجي جديد') : 'إضافة معلم جديد' }}
                 </h3>
                 <button (click)="closeModal()" class="text-gray-400 hover:text-red-600 transition-colors">
                    <span [innerHTML]="getIcon('X')"></span>
                 </button>
              </div>
              
              @if (modalType() === 'objective') {
                 <!-- Objective Form -->
                 <div class="p-6 space-y-4">
                    <div>
                       <label class="block text-sm font-bold text-wushai-olive mb-1">عنوان الهدف *</label>
                       <input #objTitle type="text" 
                          [value]="editingObjective()?.title || ''"
                          class="w-full border border-gray-200 dark:border-gray-700 dark:bg-wushai-surface dark:text-white rounded-lg p-3 outline-none focus:border-wushai-olive" 
                          placeholder="مثال: زيادة المبيعات بنسبة 50%">
                    </div>
                    
                    <div>
                       <label class="block text-sm font-bold text-wushai-olive mb-1">الوصف</label>
                       <textarea #objDesc 
                          class="w-full border border-gray-200 dark:border-gray-700 dark:bg-wushai-surface dark:text-white rounded-lg p-3 outline-none focus:border-wushai-olive h-20 resize-none"
                          placeholder="تفاصيل إضافية عن الهدف...">{{ editingObjective()?.description || '' }}</textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                       <div>
                          <label class="block text-sm font-bold text-wushai-olive mb-1">المدى الزمني *</label>
                          <select #objTerm class="w-full border border-gray-200 dark:border-gray-700 dark:bg-wushai-surface dark:text-white rounded-lg p-3 outline-none bg-white">
                             <option value="Short" [selected]="editingObjective()?.term === 'Short'">قصير المدى (1-3 أشهر)</option>
                             <option value="Medium" [selected]="editingObjective()?.term === 'Medium'">متوسط المدى (3-6 أشهر)</option>
                             <option value="Long" [selected]="editingObjective()?.term === 'Long'">طويل المدى (6+ أشهر)</option>
                          </select>
                       </div>
                       <div>
                          <label class="block text-sm font-bold text-wushai-olive mb-1">المسؤول</label>
                          <input #objOwner type="text" 
                             [value]="editingObjective()?.owner || ''"
                             class="w-full border border-gray-200 dark:border-gray-700 dark:bg-wushai-surface dark:text-white rounded-lg p-3 outline-none focus:border-wushai-olive" 
                             placeholder="اسم الشخص المسؤول">
                       </div>
                    </div>

                    @if (editingObjective()) {
                       <div>
                          <label class="block text-sm font-bold text-wushai-olive mb-1">نسبة الإنجاز: {{ editingObjective()?.progress || 0 }}%</label>
                          <input #objProgress type="range" min="0" max="100" 
                             [value]="editingObjective()?.progress || 0"
                             class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-wushai-olive">
                       </div>
                    }

                    <button (click)="saveObjective(objTitle.value, objDesc.value, objTerm.value, objOwner.value)" 
                       class="w-full bg-wushai-dark text-white py-3 rounded-xl font-bold hover:bg-wushai-black transition-all mt-2 shadow-lg flex items-center justify-center gap-2">
                       <span [innerHTML]="getIcon('Check')" class="w-5 h-5"></span>
                       {{ editingObjective() ? 'تحديث الهدف' : 'إضافة الهدف' }}
                    </button>
                 </div>
              } @else {
                 <!-- Milestone Form -->
                 <div class="p-6 space-y-4">
                    <div>
                       <label class="block text-sm font-bold text-wushai-olive mb-1">العنوان *</label>
                       <input #mTitle type="text" class="w-full border border-gray-200 dark:border-gray-700 dark:bg-wushai-surface dark:text-white rounded-lg p-3 outline-none focus:border-wushai-olive" placeholder="مثال: إطلاق النسخة التجريبية">
                    </div>
                    
                    <div>
                       <label class="block text-sm font-bold text-wushai-olive mb-1">التاريخ *</label>
                       <input #mDate type="date" class="w-full border border-gray-200 dark:border-gray-700 dark:bg-wushai-surface dark:text-white rounded-lg p-3 outline-none focus:border-wushai-olive">
                    </div>

                    <div>
                       <label class="block text-sm font-bold text-wushai-olive mb-1">النوع</label>
                       <select #mType class="w-full border border-gray-200 dark:border-gray-700 dark:bg-wushai-surface dark:text-white rounded-lg p-3 outline-none bg-white">
                          <option value="Launch">🚀 إطلاق (Launch)</option>
                          <option value="Event">📅 حدث (Event)</option>
                          <option value="Update">✨ تحديث (Update)</option>
                       </select>
                    </div>

                    <button (click)="saveMilestone(mTitle.value, mDate.value, mType.value)" 
                       class="w-full bg-wushai-dark text-white py-3 rounded-xl font-bold hover:bg-wushai-black transition-all mt-2 shadow-lg flex items-center justify-center gap-2">
                       <span [innerHTML]="getIcon('Check')" class="w-5 h-5"></span>
                       حفظ المعلم
                    </button>
                 </div>
              }
           </div>
        </div>
      }
    </div>
  `,
   styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #6B7049;
      cursor: pointer;
    }
  `]
})
export class StrategyComponent {
   private dataService = inject(DataService);
   private strategyService = inject(StrategyService);
   private sanitizer = inject(DomSanitizer);
   private toastService = inject(ToastService);

   objectives = this.strategyService.objectives;
   milestones = this.strategyService.milestones;
   campaigns = this.dataService.campaigns;
   tasks = this.dataService.tasks;

   modalType = signal<ModalType>('none');
   editingObjective = signal<Objective | null>(null);
   filterTerm = signal<string | null>(null);
   today = new Date();

   // Computed
   filteredObjectives = computed(() => {
      const term = this.filterTerm();
      if (!term) return this.objectives();
      return this.objectives().filter(o => o.term === term);
   });

   overallProgress = computed(() => {
      const objs = this.objectives();
      if (objs.length === 0) return 0;
      const total = objs.reduce((sum, o) => sum + (o.progress || 0), 0);
      return Math.round(total / objs.length);
   });

   highPriorityTasks = computed(() =>
      this.tasks().filter(t => t.priority === 'High' && t.status !== 'Done')
   );

   recentDoneTasks = computed(() =>
      this.tasks().filter(t => t.status === 'Done').slice(0, 5)
   );

   recentCampaigns = computed(() =>
      this.campaigns().filter(c => new Date(c.date) <= new Date()).slice(0, 3)
   );

   timelineMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   getDatePosition(dateStr: string): number {
      const start = new Date('2026-01-01').getTime();
      const end = new Date('2026-06-30').getTime();
      const current = new Date(dateStr).getTime();

      if (current < start) return 0;
      if (current > end) return 100;

      return ((current - start) / (end - start)) * 100;
   }

   // Modal
   openModal(type: ModalType) { 
      this.modalType.set(type); 
      this.editingObjective.set(null);
   }
   
   closeModal() { 
      this.modalType.set('none'); 
      this.editingObjective.set(null);
   }

   // Objectives CRUD
   async saveObjective(title: string, description: string, term: string, owner: string) {
      if (!title.trim()) {
         this.toastService.show('العنوان مطلوب', 'error');
         return;
      }

      if (this.editingObjective()) {
         await this.strategyService.updateObjective(this.editingObjective()!.id, {
            title,
            description,
            term: term as Objective['term'],
            owner
         });
         this.toastService.show('تم تحديث الهدف', 'success');
      } else {
         await this.strategyService.addObjective({
            title,
            description,
            term: term as Objective['term'],
            owner,
            progress: 0
         });
         this.toastService.show('تم إضافة الهدف', 'success');
      }
      this.closeModal();
   }

   editObjective(obj: Objective) {
      this.editingObjective.set(obj);
      this.modalType.set('objective');
   }

   async updateProgress(id: string, value: string) {
      const progress = parseInt(value, 10);
      await this.strategyService.updateProgress(id, progress);
   }

   async deleteObjective(id: string) {
      if (confirm('هل أنت متأكد من حذف هذا الهدف؟')) {
         await this.strategyService.deleteObjective(id);
         this.toastService.show('تم حذف الهدف', 'info');
      }
   }

   // Milestones
   saveMilestone(title: string, date: string, type: string) {
      if (!title || !date) {
         this.toastService.show('العنوان والتاريخ مطلوبان', 'error');
         return;
      }
      this.strategyService.addMilestone({ title, date, type });
      this.toastService.show('تم إضافة المعلم', 'success');
      this.closeModal();
   }

   copyReleaseNotes() {
      const notes = `# Release Notes - ${this.today.toLocaleDateString()}

## 🚀 Features & Updates
${this.recentDoneTasks().map(t => `- ${t.title} (${t.owner})`).join('\n')}

## 📢 Campaigns Launched
${this.recentCampaigns().map(c => `- ${c.title} on ${c.platform}`).join('\n')}

Generated by HimControl Strategy Engine.`;
      
      navigator.clipboard.writeText(notes);
      this.toastService.show('تم النسخ إلى الحافظة', 'success');
   }
}
