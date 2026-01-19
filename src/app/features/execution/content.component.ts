
import { Component, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Campaign } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

interface CalendarDay {
  date: number | null;
  fullDateStr: string | null;
  isToday: boolean;
  campaigns: Campaign[];
}

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-fade-in pb-10">
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand">استوديو المحتوى (Content Studio)</h2>
           <p class="text-wushai-olive mt-2">إدارة الحملات، الجدول التفاعلي، والمعاينة الحية.</p>
        </div>
        <div class="flex items-center gap-3 w-full md:w-auto">
          <!-- View Switcher -->
          <div class="bg-white border border-wushai-sand rounded-xl p-1 flex shadow-sm">
             <button (click)="viewMode.set('Grid')" 
                class="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                [ngClass]="viewMode() === 'Grid' ? 'bg-wushai-sand text-wushai-dark shadow-sm' : 'text-gray-400 hover:text-wushai-dark hover:bg-gray-50'">
                <span class="w-4 h-4" [innerHTML]="getIcon('List')"></span>
             </button>
             <button (click)="viewMode.set('Calendar')" 
                class="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                [ngClass]="viewMode() === 'Calendar' ? 'bg-wushai-sand text-wushai-dark shadow-sm' : 'text-gray-400 hover:text-wushai-dark hover:bg-gray-50'">
                <span class="w-4 h-4" [innerHTML]="getIcon('Clock')"></span>
             </button>
          </div>
          
          <button (click)="openModal(null)" 
             class="bg-wushai-dark text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-wushai-black transition-colors shadow-lg flex-1 md:flex-none justify-center">
             <span [innerHTML]="getIcon('Plus')"></span> حملة جديدة
          </button>
        </div>
      </header>

      <!-- Campaigns Section -->
      <section>
        <h3 class="text-xl font-bold text-wushai-deep dark:text-wushai-sand mb-4 flex items-center gap-2">
          <span [innerHTML]="getIcon('List')"></span> الحملات النشطة
        </h3>

        @if (viewMode() === 'Grid') {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            @for (camp of campaigns(); track camp.id) {
              <div (click)="openModal(camp)" class="cursor-pointer bg-white dark:bg-wushai-black dark:border-wushai-olive rounded-2xl p-6 border border-wushai-sand shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden group">
                 <div class="absolute top-0 left-0 w-1 h-full"
                   [ngClass]="getPlatformColor(camp.platform)"></div>

                 <div class="flex justify-between items-start mb-3">
                   <span class="text-xs font-bold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                      {{ camp.platform }}
                   </span>
                   <span class="text-xs font-medium px-2 py-1 rounded-full"
                     [ngClass]="getStatusColor(camp.status)">
                     {{ camp.status }}
                   </span>
                 </div>
                 
                 <h4 class="font-bold text-lg text-wushai-dark dark:text-wushai-sand mb-2">{{ camp.title }}</h4>
                 <p class="text-sm text-wushai-olive dark:text-gray-400 mb-4 line-clamp-2">{{ camp.brief }}</p>
                 
                 <div class="flex items-center gap-2 text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span [innerHTML]="getIcon('Clock')" class="w-3 h-3"></span>
                    {{ camp.date | date:'mediumDate' }}
                 </div>
              </div>
            }
          </div>
        } @else {
          <!-- Interactive Calendar View -->
          <div class="bg-white dark:bg-wushai-black border border-wushai-sand dark:border-wushai-olive rounded-2xl p-6 animate-fade-in overflow-x-auto">
             <div class="min-w-[800px]">
               <div class="flex justify-between items-center mb-4">
                  <span class="text-sm font-bold text-gray-500">Drag & Drop campaigns to reschedule</span>
                  <span class="text-lg font-bold text-wushai-dark dark:text-white">{{ currentMonthName }}</span>
               </div>
               <div class="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <!-- Headers -->
                  @for(day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; track day) {
                     <div class="bg-gray-50 dark:bg-wushai-deep p-2 text-center text-xs font-bold text-gray-500">{{ day }}</div>
                  }
                  <!-- Days -->
                  @for(day of calendarDays(); track $index) {
                     <div class="bg-white dark:bg-wushai-black p-2 h-32 flex flex-col items-start gap-1 relative transition-colors"
                          [class.bg-gray-50]="dragOverDate() === day.fullDateStr"
                          (dragover)="onCalendarDragOver($event, day.fullDateStr)"
                          (drop)="onCalendarDrop($event, day.fullDateStr)">
                        
                        @if(day.date) {
                            <span class="text-xs font-bold text-gray-400 mb-1" [class.text-wushai-olive]="day.isToday">{{ day.date }}</span>
                            @for(camp of day.campaigns; track camp.id) {
                            <div draggable="true"
                                (dragstart)="onDragStart($event, camp.id)"
                                (click)="openModal(camp)"
                                class="w-full text-[10px] p-1.5 rounded border-l-2 cursor-grab active:cursor-grabbing hover:opacity-80 transition-all shadow-sm flex items-center gap-1 group"
                                [ngClass]="getPlatformColorClass(camp.platform)">
                                <span [innerHTML]="getIcon('Grip')" class="w-2 h-2 opacity-50 group-hover:opacity-100"></span>
                                <span class="truncate font-bold">{{ camp.title }}</span>
                            </div>
                            }
                        }
                     </div>
                  }
               </div>
             </div>
          </div>
        }
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <!-- Idea Bank -->
         <div class="lg:col-span-2 bg-white dark:bg-wushai-black dark:border-wushai-olive rounded-2xl border border-wushai-sand p-6">
            <h3 class="font-bold text-wushai-dark dark:text-wushai-sand mb-4 flex items-center gap-2">
               <span class="w-2 h-6 bg-wushai-lavender rounded-full"></span> بنك الأفكار
               <span class="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ ideas().length }} أفكار</span>
            </h3>
            
            <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               @for (idea of ideas(); track idea.id) {
                 <div class="flex items-center gap-4 p-4 bg-wushai-light/30 dark:bg-wushai-deep/50 rounded-xl border border-wushai-light dark:border-wushai-olive/30 hover:border-wushai-lavender transition-all group">
                    <button (click)="vote(idea.id)" 
                        class="flex flex-col items-center justify-center min-w-[3rem] h-12 rounded-lg transition-colors"
                        [ngClass]="idea.votes > 0 ? 'bg-wushai-lavender text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'">
                       <span class="text-xs font-bold -mb-1">▲</span>
                       <span class="font-bold text-sm">{{ idea.votes }}</span>
                    </button>
                    
                    <div class="flex-1">
                       <p class="font-bold text-wushai-dark dark:text-wushai-sand text-sm leading-relaxed">{{ idea.text }}</p>
                       <div class="flex items-center gap-2 mt-1">
                          <span class="w-4 h-4 rounded-full bg-wushai-sand flex items-center justify-center text-[8px] text-wushai-brown font-bold">{{ idea.owner.charAt(0) }}</span>
                          <p class="text-xs text-gray-500">بواسطة {{ idea.owner }}</p>
                       </div>
                    </div>
                 </div>
               }
               @if(ideas().length === 0) {
                 <div class="p-8 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                    لا توجد أفكار حتى الآن. كن أول من يضيف!
                 </div>
               }
            </div>

            <div class="mt-6 flex gap-2 relative">
              <input #ideaInput type="text" 
                 (keyup.enter)="addIdea(ideaInput.value); ideaInput.value = ''"
                 placeholder="اكتب فكرة جديدة واضغط Enter..." 
                 class="w-full bg-white dark:bg-wushai-deep dark:text-white dark:border-gray-600 border border-gray-300 rounded-xl px-4 py-3 pl-12 text-sm focus:outline-none focus:border-wushai-olive focus:ring-2 focus:ring-wushai-olive/10 transition-all shadow-sm">
              <button (click)="addIdea(ideaInput.value); ideaInput.value = ''" 
                 class="absolute left-2 top-2 bottom-2 bg-wushai-olive hover:bg-wushai-dark text-white w-10 rounded-lg flex items-center justify-center transition-colors">
                 <span [innerHTML]="getIcon('Plus')"></span>
              </button>
            </div>
         </div>

         <!-- Quick Stats -->
         <div class="bg-wushai-dark text-wushai-sand rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
            <div class="absolute top-0 right-0 w-32 h-32 bg-wushai-olive/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div>
               <h4 class="text-lg font-bold mb-1">أداء المحتوى</h4>
               <p class="text-xs opacity-70">آخر 30 يوم</p>
            </div>
            <div class="space-y-6 mt-8 relative z-10">
               <div>
                 <div class="flex justify-between items-end mb-1">
                    <span class="text-sm opacity-80">الوصول (Reach)</span>
                    <span class="text-2xl font-bold">124K</span>
                 </div>
                 <div class="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div class="bg-wushai-lavender h-full w-[75%] shadow-[0_0_10px_rgba(157,139,177,0.5)]"></div>
                 </div>
               </div>
               
               <div>
                 <div class="flex justify-between items-end mb-1">
                    <span class="text-sm opacity-80">التفاعل (Engage)</span>
                    <span class="text-2xl font-bold">8.2%</span>
                 </div>
                 <div class="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div class="bg-wushai-sand h-full w-[40%] shadow-[0_0_10px_rgba(235,229,217,0.5)]"></div>
                 </div>
               </div>
            </div>
         </div>
      </div>

      <!-- Enhanced Add/Edit Campaign Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div class="bg-white dark:bg-wushai-black rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-wushai-sand flex flex-col md:flex-row max-h-[90vh]">
              
              <!-- Left Side: Form -->
              <div class="flex-1 flex flex-col border-r border-wushai-sand dark:border-gray-700">
                  <div class="p-5 border-b border-wushai-sand bg-wushai-light dark:bg-wushai-deep flex justify-between items-center">
                    <h3 class="font-bold text-xl text-wushai-dark dark:text-wushai-sand">
                        {{ editingCampaign() ? 'تعديل الحملة' : 'حملة جديدة' }}
                    </h3>
                    <button (click)="closeModal()" class="text-gray-400 hover:text-red-600 transition-colors md:hidden">
                        <span [innerHTML]="getIcon('X')"></span>
                    </button>
                  </div>

                  <div class="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label class="block text-sm font-bold text-wushai-olive mb-1">عنوان الحملة</label>
                        <input #cTitle type="text" [value]="editingCampaign()?.title || ''" (input)="previewTitle.set($any($event.target).value)" class="w-full border dark:border-gray-600 dark:bg-wushai-deep dark:text-white rounded-lg p-3 focus:outline-none focus:border-wushai-olive text-sm font-bold" placeholder="مثال: خصومات الصيف الكبرى">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-wushai-olive mb-1">المنصة</label>
                            <select #cPlatform [value]="editingCampaign()?.platform || 'Instagram'" (change)="previewPlatform.set($any($event.target).value)" class="w-full border dark:border-gray-600 dark:bg-wushai-deep dark:text-white rounded-lg p-3 focus:outline-none focus:border-wushai-olive text-sm">
                            <option value="Instagram">Instagram</option>
                            <option value="TikTok">TikTok</option>
                            <option value="Snapchat">Snapchat</option>
                            <option value="Email">Email</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-wushai-olive mb-1">الحالة</label>
                            <select #cStatus [value]="editingCampaign()?.status || 'Scheduled'" class="w-full border dark:border-gray-600 dark:bg-wushai-deep dark:text-white rounded-lg p-3 focus:outline-none focus:border-wushai-olive text-sm">
                            <option value="Scheduled">Scheduled</option>
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="block text-sm font-bold text-wushai-olive">المحتوى / الوصف</label>
                            <button (click)="generateMagicBrief(cTitle.value, cPlatform.value)" class="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-purple-200 transition-colors font-bold">
                                <span [innerHTML]="getIcon('Magic')" class="w-3 h-3"></span> AI Generator
                            </button>
                        </div>
                        <textarea #cBrief [value]="editingCampaign()?.brief || ''" (input)="previewBrief.set($any($event.target).value)" rows="6" class="w-full border dark:border-gray-600 dark:bg-wushai-deep dark:text-white rounded-lg p-3 focus:outline-none focus:border-wushai-olive text-sm leading-relaxed" placeholder="اكتب وصف الحملة هنا..."></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-wushai-olive mb-1">تاريخ النشر</label>
                        <input #cDate type="date" [value]="editingCampaign()?.date ? (editingCampaign()?.date | date:'yyyy-MM-dd') : ''" class="w-full border dark:border-gray-600 dark:bg-wushai-deep dark:text-white rounded-lg p-3 focus:outline-none focus:border-wushai-olive text-sm">
                    </div>

                    <div class="pt-4">
                        <button (click)="saveCampaign(cTitle.value, cPlatform.value, cBrief.value, cDate.value, cStatus.value)" 
                            class="w-full bg-wushai-dark text-white py-3 rounded-xl font-bold hover:bg-wushai-black transition-all shadow-lg flex items-center justify-center gap-2">
                            <span [innerHTML]="getIcon('Check')"></span> حفظ الحملة
                        </button>
                    </div>
                  </div>
              </div>

              <!-- Right Side: Live Preview -->
              <div class="w-full md:w-[400px] bg-gray-100 dark:bg-black/50 p-8 flex flex-col items-center justify-center relative">
                  <button (click)="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors hidden md:block">
                     <span [innerHTML]="getIcon('X')" class="w-6 h-6"></span>
                  </button>
                  
                  <h4 class="absolute top-6 left-6 text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <span [innerHTML]="getIcon('Smartphone')" class="w-4 h-4"></span> Live Preview
                  </h4>

                  <!-- Phone Frame -->
                  <div class="w-[280px] h-[500px] bg-white dark:bg-black rounded-[30px] border-8 border-gray-800 shadow-2xl overflow-hidden relative flex flex-col">
                     <!-- Notch -->
                     <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-20"></div>
                     
                     <!-- App Header -->
                     <div class="h-14 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800 flex items-end pb-2 px-4 z-10">
                        <span class="font-bold text-sm text-center w-full dark:text-white">{{ previewPlatform() }}</span>
                     </div>

                     <!-- Content Area -->
                     <div class="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-black">
                        @if(previewPlatform() === 'Instagram') {
                            <!-- Instagram Mock -->
                            <div class="p-3">
                                <div class="flex items-center gap-2 mb-2">
                                    <div class="w-8 h-8 rounded-full bg-gray-200"></div>
                                    <span class="text-xs font-bold dark:text-white">wushai_sa</span>
                                </div>
                                <div class="w-full aspect-square bg-gray-100 dark:bg-gray-900 rounded mb-2 flex items-center justify-center text-gray-300">
                                    <span [innerHTML]="getIcon('Image')"></span>
                                </div>
                                <div class="text-xs dark:text-white">
                                    <p><span class="font-bold">wushai_sa</span> {{ previewBrief() || 'Caption goes here...' }}</p>
                                </div>
                            </div>
                        } @else if (previewPlatform() === 'TikTok') {
                             <!-- TikTok Mock -->
                             <div class="h-full bg-gray-900 relative flex items-center justify-center">
                                 <p class="text-white font-bold opacity-50">Video Placeholder</p>
                                 <div class="absolute bottom-4 left-4 right-12 text-white text-xs text-shadow">
                                     <p class="font-bold mb-1">@wushai_sa</p>
                                     <p>{{ previewBrief() || 'My cool video description...' }}</p>
                                 </div>
                                 <div class="absolute bottom-4 right-2 flex flex-col gap-3 items-center text-white">
                                     <div class="w-8 h-8 rounded-full bg-gray-700"></div>
                                     <div class="w-6 h-6 bg-gray-700 rounded-full"></div>
                                     <div class="w-6 h-6 bg-gray-700 rounded-full"></div>
                                 </div>
                             </div>
                        } @else if (previewPlatform() === 'Email') {
                             <!-- Email Mock -->
                             <div class="p-4">
                                 <div class="border-b pb-2 mb-2">
                                     <p class="text-[10px] text-gray-500">Subject:</p>
                                     <p class="text-xs font-bold dark:text-white">{{ previewTitle() || 'Subject Line' }}</p>
                                 </div>
                                 <div class="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                                     {{ previewBrief() || 'Email body content...' }}
                                 </div>
                             </div>
                        } @else {
                            <div class="p-4 text-center mt-10 text-gray-400 text-xs">
                                Preview not available for this format.
                            </div>
                        }
                     </div>

                     <!-- Footer -->
                     <div class="h-12 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-800 flex items-center justify-around text-gray-400">
                        <div class="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700"></div>
                        <div class="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700"></div>
                        <div class="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700"></div>
                     </div>
                  </div>
              </div>
           </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #EBE5D9; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9D8BB1; }
    .text-shadow { text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
  `]
})
export class ContentComponent {
  private dataService = inject(DataService);
  private sanitizer = inject(DomSanitizer);

  campaigns = this.dataService.campaigns;
  ideas = this.dataService.ideas;
  showModal = signal(false);
  viewMode = signal<'Grid' | 'Calendar'>('Grid');

  // Modal State
  editingCampaign = signal<Campaign | null>(null);
  previewTitle = signal('');
  previewBrief = signal('');
  previewPlatform = signal('Instagram');

  // Drag & Drop State
  draggedCampaignId = signal<string | null>(null);
  dragOverDate = signal<string | null>(null);

  @ViewChild('cBrief') briefTextarea!: ElementRef;

  currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  // Computed Calendar Grid
  calendarDays = computed(() => {
    // Current Month Generator (Fixed to current month for demo)
    const days: CalendarDay[] = [];
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay(); // 0 = Sun

    // Empty Slots
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, fullDateStr: null, isToday: false, campaigns: [] });
    }

    // Real Days
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(now.getFullYear(), now.getMonth(), i);
      // Normalize date comparison
      const campaignsForDay = this.campaigns().filter(c => {
        const cDate = new Date(c.date);
        return cDate.getDate() === i && cDate.getMonth() === now.getMonth() && cDate.getFullYear() === now.getFullYear();
      });

      days.push({
        date: i,
        fullDateStr: currentDate.toISOString(), // Used for drop target
        isToday: i === now.getDate(),
        campaigns: campaignsForDay
      });
    }
    return days;
  });

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  getPlatformColor(platform: string) {
    switch (platform) {
      case 'Instagram': return 'bg-pink-500';
      case 'TikTok': return 'bg-black';
      case 'Email': return 'bg-blue-500';
      case 'Snapchat': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
  }

  getPlatformColorClass(platform: string) {
    switch (platform) {
      case 'Instagram': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'TikTok': return 'bg-gray-100 text-gray-900 border-gray-300';
      case 'Email': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Snapchat': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 text-gray-700';
    }
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-700';
      case 'Scheduled': return 'bg-yellow-100 text-yellow-700';
      case 'Completed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  addIdea(text: string) {
    if (!text) return;
    this.dataService.addIdea(text, 'Me');
  }

  vote(id: string) {
    this.dataService.voteForIdea(id);
  }

  // --- Modal Logic ---
  openModal(camp: Campaign | null) {
    this.editingCampaign.set(camp);

    // Init Preview
    if (camp) {
      this.previewTitle.set(camp.title);
      this.previewBrief.set(camp.brief);
      this.previewPlatform.set(camp.platform);
    } else {
      this.previewTitle.set('');
      this.previewBrief.set('');
      this.previewPlatform.set('Instagram');
    }

    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingCampaign.set(null);
  }

  saveCampaign(title: string, platform: any, brief: string, date: string, status: any) {
    if (!title) return;

    // Update data service (mock logic needs update capability in service for full crud, implementing basic update here by ID check manually)
    // Since dataService doesn't have updateCampaign yet, we'll simulate it by removing old and adding new if editing, or just add.
    // Ideally DataService should have updateCampaign. I'll use addCampaign for new.

    // For this demo, let's assume we just add new if it's new.
    // If editing, we actually need to update the signal in DataService. 
    // I will implement a quick update logic via a custom method on DataService or just re-add for now to keep it simple, 
    // but to be professional, let's assume DataService handles it.
    // Actually, I can use the same trick as Tasks:

    const camps = this.campaigns();
    const newCamp: Campaign = {
      id: this.editingCampaign()?.id || `CMP-${Date.now()}`,
      title,
      platform,
      brief,
      date: date || new Date().toISOString(),
      status
    };

    // Manual update of signal in component (since I can't edit service file in this block easily without reprinting it)
    // Wait, I can't modify the signal directly if it's readonly from service.
    // I will use addCampaign for new ones. 
    // Limitation: Editing existing campaigns won't persist "in-place" without a specific service method.
    // I'll create a new one for now or just add. User experience: "Create".

    if (this.editingCampaign()) {
      // Find and replace in dataService (Hack for demo without changing service file again)
      this.dataService.campaigns.update(c => c.map(x => x.id === newCamp.id ? newCamp : x));
    } else {
      this.dataService.addCampaign(newCamp);
    }

    this.closeModal();
  }

  // --- AI Generator (Simulated) ---
  generateMagicBrief(title: string, platform: string) {
    if (!title) return;

    const emojis = ['✨', '🚀', '🔥', '💡', '🌟', '👀'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    let generated = '';
    if (platform === 'Instagram') {
      generated = `${randomEmoji} ${title} is finally here! \n\nDon't miss out on the latest trends. Swipe left to see more! \n\nLink in bio to shop now. 🛍️\n\n#Wushai #${title.replace(/\s/g, '')} #NewDrop`;
    } else if (platform === 'TikTok') {
      generated = `${title} Check! ${randomEmoji} \nWait for the end... \n\n#fyp #wushai #${title.replace(/\s/g, '')}`;
    } else if (platform === 'Email') {
      generated = `Hi Team,\n\nWe are excited to announce ${title}.\n\nHighlights:\n- Exclusive access\n- Limited time offer\n\nBest,\nWushai Team`;
    } else {
      generated = `${title} - Check it out now! ${randomEmoji}`;
    }

    this.previewBrief.set(generated);
    // Update the textarea value manually if needed
    if (this.briefTextarea) this.briefTextarea.nativeElement.value = generated;
  }

  // --- Drag & Drop Calendar Logic ---
  onDragStart(event: DragEvent, id: string) {
    this.draggedCampaignId.set(id);
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onCalendarDragOver(event: DragEvent, dateStr: string | null) {
    if (dateStr) {
      event.preventDefault(); // Allow dropping
      this.dragOverDate.set(dateStr);
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    }
  }

  onCalendarDrop(event: DragEvent, dateStr: string | null) {
    event.preventDefault();
    const id = this.draggedCampaignId();
    if (id && dateStr) {
      // Update campaign date
      this.dataService.campaigns.update(camps =>
        camps.map(c => c.id === id ? { ...c, date: dateStr } : c)
      );
    }
    this.draggedCampaignId.set(null);
    this.dragOverDate.set(null);
  }
}
