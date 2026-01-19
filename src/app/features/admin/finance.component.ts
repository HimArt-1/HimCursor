
import { Component, inject, computed, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Transaction } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import * as d3 from 'd3';
import { ToastService } from '../../core/services/state/toast.service';

@Component({
   selector: 'app-finance',
   standalone: true,
   imports: [CommonModule],
   changeDetection: ChangeDetectionStrategy.OnPush,
   template: `
    <div class="space-y-8 animate-fade-in pb-10">
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-3">
             <span [innerHTML]="getIcon('Briefcase')"></span>
             الخزنة (The Treasury)
           </h2>
           <p class="text-wushai-olive mt-2">إدارة الميزانية، المصاريف، والتدفق المالي.</p>
        </div>
        
        <button (click)="openModal()" class="bg-wushai-dark hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
           <span [innerHTML]="getIcon('Plus')"></span> تسجيل عملية
        </button>
      </header>

      <!-- Main Overview Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         <!-- 1. The Virtual Card (Interactive) -->
         <div class="perspective-1000 h-64 group cursor-pointer" (click)="flipCard()">
            <div class="relative w-full h-full transition-transform duration-700 transform-style-3d shadow-2xl rounded-2xl" [class.rotate-y-180]="isFlipped()">
                
                <!-- Front -->
                <div class="absolute inset-0 bg-gradient-to-br from-wushai-dark to-wushai-olive text-white rounded-2xl p-8 flex flex-col justify-between backface-hidden border border-white/10">
                   <div class="flex justify-between items-start">
                      <span class="font-mono text-sm opacity-70">WUSHAI BUSINESS</span>
                      <span [innerHTML]="getIcon('Zap')" class="w-8 h-8 text-yellow-400"></span>
                   </div>
                   <div>
                      <p class="text-xs opacity-70 uppercase tracking-widest mb-1">Total Balance</p>
                      <p class="text-3xl font-mono font-bold tracking-tight">\${{ balance().toFixed(2) }}</p>
                   </div>
                   <div class="flex justify-between items-end">
                      <div class="font-mono text-sm space-x-2">
                         <span>****</span> <span>****</span> <span>****</span> <span>4242</span>
                      </div>
                      <span class="text-xs opacity-70">VALID THRU 12/26</span>
                   </div>
                   <!-- Chip -->
                   <div class="absolute top-20 left-8 w-12 h-10 bg-yellow-500/80 rounded-lg flex items-center justify-center border border-yellow-600/50">
                      <div class="w-8 h-0.5 bg-yellow-800/20"></div>
                   </div>
                   <!-- Flip Hint -->
                   <span class="absolute bottom-4 right-4 text-white/30 group-hover:text-white/70 transition-colors opacity-0 group-hover:opacity-100" [innerHTML]="getIcon('Flip')"></span>
                </div>

                <!-- Back -->
                <div class="absolute inset-0 bg-gray-800 text-white rounded-2xl p-8 flex flex-col justify-between rotate-y-180 backface-hidden shadow-inner">
                    <div class="w-full h-10 bg-black -mx-8 mt-4"></div>
                    <div class="flex items-center gap-4">
                       <div class="flex-1 h-8 bg-white/20 rounded flex items-center justify-end px-2 font-mono text-black text-sm font-bold bg-white">123</div>
                       <p class="text-xs opacity-60">CVV</p>
                    </div>
                    <div class="text-center">
                       <p class="text-xs text-gray-400">Issued by HimControl Treasury Dept.</p>
                       <p class="text-xs text-gray-500 mt-1">Authorized Signature Only</p>
                    </div>
                </div>
            </div>
         </div>

         <!-- 2. Budget Progress (Burn Rate) -->
         <div class="bg-white dark:bg-wushai-black dark:border-wushai-olive rounded-2xl border border-wushai-sand p-6 shadow-sm flex flex-col justify-between">
            <h3 class="font-bold text-wushai-dark dark:text-wushai-sand mb-4 flex items-center justify-between">
               <span>Budget Usage</span>
               @if(isOverBudget()) {
                  <span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold animate-pulse">Alert: High Spend</span>
               }
            </h3>

            <div class="space-y-6">
               @for(cat of categories; track cat.name) {
                  <div>
                     <div class="flex justify-between text-xs font-bold mb-1">
                        <span class="text-gray-600 dark:text-gray-300">{{ cat.name }}</span>
                        <span class="text-wushai-olive dark:text-wushai-sand">{{ getCategorySpend(cat.name) | currency }} / {{ cat.limit | currency }}</span>
                     </div>
                     <div class="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-1000"
                             [style.width.%]="getCategoryPercentage(cat.name)"
                             [class]="getCategoryColor(cat.name)"></div>
                     </div>
                  </div>
               }
            </div>
         </div>

         <!-- 3. Mini Chart (Cash Flow) -->
         <div class="bg-white dark:bg-wushai-black dark:border-wushai-olive rounded-2xl border border-wushai-sand p-6 shadow-sm flex flex-col relative overflow-hidden">
             <h3 class="font-bold text-wushai-dark dark:text-wushai-sand mb-1 z-10">Net Cash Flow</h3>
             <p class="text-3xl font-bold text-green-600 z-10" [class.text-red-500]="netCashFlow() < 0">
                {{ netCashFlow() > 0 ? '+' : '' }}{{ netCashFlow() | currency }}
             </p>
             <p class="text-xs text-gray-400 z-10 mb-4">Vs. last 30 days</p>

             <!-- Simple D3 Area Chart -->
             <div #miniChart class="absolute bottom-0 left-0 right-0 h-32 opacity-80 pointer-events-none"></div>
         </div>
      </div>

      <!-- Recent Transactions Table -->
      <div class="bg-white dark:bg-wushai-black dark:border-wushai-olive rounded-2xl border border-wushai-sand overflow-hidden shadow-sm">
         <div class="p-5 border-b border-wushai-sand dark:border-wushai-olive flex justify-between items-center bg-gray-50 dark:bg-wushai-deep/20">
            <h3 class="font-bold text-lg text-wushai-dark dark:text-wushai-sand">Recent Transactions</h3>
            <div class="flex gap-2">
               <span class="w-3 h-3 rounded-full bg-green-500"></span> <span class="text-xs text-gray-500">Income</span>
               <span class="w-3 h-3 rounded-full bg-red-500"></span> <span class="text-xs text-gray-500">Expense</span>
            </div>
         </div>
         <table class="w-full text-right text-sm">
            <thead class="bg-wushai-light dark:bg-wushai-deep/50 border-b border-wushai-sand dark:border-wushai-olive">
               <tr>
                  <th class="p-4 font-bold text-gray-600 dark:text-gray-300">Date</th>
                  <th class="p-4 font-bold text-gray-600 dark:text-gray-300">Description</th>
                  <th class="p-4 font-bold text-gray-600 dark:text-gray-300">Category</th>
                  <th class="p-4 font-bold text-gray-600 dark:text-gray-300">Amount</th>
                  <th class="p-4 font-bold text-gray-600 dark:text-gray-300">Type</th>
               </tr>
            </thead>
            <tbody>
               @for (tx of transactions(); track tx.id) {
                  <tr class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-wushai-deep/30 transition-colors">
                     <td class="p-4 font-mono text-xs text-gray-500">{{ tx.date | date:'shortDate' }}</td>
                     <td class="p-4 font-bold text-wushai-dark dark:text-white">{{ tx.description }}</td>
                     <td class="p-4">
                        <span class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                           {{ tx.category }}
                        </span>
                     </td>
                     <td class="p-4 font-mono font-bold" [class]="tx.type === 'Income' ? 'text-green-600' : 'text-red-600'">
                        {{ tx.type === 'Income' ? '+' : '-' }}{{ tx.amount | currency }}
                     </td>
                     <td class="p-4">
                        <span class="flex items-center gap-1 text-xs font-bold" [class]="tx.type === 'Income' ? 'text-green-600' : 'text-red-500'">
                           <span [innerHTML]="getIcon(tx.type === 'Income' ? 'TrendingUp' : 'TrendingDown')" class="w-4 h-4"></span>
                           {{ tx.type }}
                        </span>
                     </td>
                  </tr>
               }
            </tbody>
         </table>
      </div>

      <!-- Add Transaction Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
           <div class="bg-white dark:bg-wushai-black rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-wushai-sand">
              <div class="p-5 border-b border-wushai-sand bg-wushai-light dark:bg-wushai-deep flex justify-between items-center">
                 <h3 class="font-bold text-xl text-wushai-dark dark:text-wushai-sand">تسجيل عملية</h3>
                 <button (click)="closeModal()" class="text-gray-400 hover:text-red-600 transition-colors">
                    <span [innerHTML]="getIcon('X')"></span>
                 </button>
              </div>
              <div class="p-6 space-y-4">
                 <div>
                    <label class="block text-sm font-bold text-wushai-olive mb-1">الوصف</label>
                    <input #txDesc type="text" class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive" placeholder="مثال: اشتراك سيرفرات">
                 </div>
                 
                 <div class="grid grid-cols-2 gap-4">
                    <div>
                       <label class="block text-sm font-bold text-wushai-olive mb-1">المبلغ</label>
                       <input #txAmount type="number" class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive" placeholder="0.00">
                    </div>
                    <div>
                       <label class="block text-sm font-bold text-wushai-olive mb-1">النوع</label>
                       <select #txType class="w-full border rounded-lg p-3 outline-none bg-white">
                          <option value="Expense">مصروف (Expense)</option>
                          <option value="Income">دخل (Income)</option>
                       </select>
                    </div>
                 </div>

                 <div>
                    <label class="block text-sm font-bold text-wushai-olive mb-1">التصنيف</label>
                    <select #txCat class="w-full border rounded-lg p-3 outline-none bg-white">
                       <option value="Marketing">تسويق</option>
                       <option value="Server">سيرفرات وتقنية</option>
                       <option value="Tools">أدوات واشتراكات</option>
                       <option value="Sales">مبيعات</option>
                       <option value="Salaries">رواتب</option>
                    </select>
                 </div>

                 <button (click)="saveTransaction(txDesc.value, txAmount.value, txType.value, txCat.value)" 
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
    .perspective-1000 { perspective: 1000px; }
    .transform-style-3d { transform-style: preserve-3d; }
    .backface-hidden { backface-visibility: hidden; }
    .rotate-y-180 { transform: rotateY(180deg); }
  `]
})
export class FinanceComponent implements AfterViewInit, OnDestroy {
   private dataService = inject(DataService);
   private sanitizer = inject(DomSanitizer);
   private toastService = inject(ToastService);

   transactions = this.dataService.transactions;
   isFlipped = signal(false);
   showModal = signal(false);

   @ViewChild('miniChart') miniChartRef!: ElementRef;

   categories = [
      { name: 'Marketing', limit: 5000 },
      { name: 'Server', limit: 1000 },
      { name: 'Tools', limit: 500 },
      { name: 'Salaries', limit: 15000 }
   ];

   constructor() {
      effect(() => {
         this.transactions(); // Subscribe effect to changes
         if (this.miniChartRef) {
            this.renderChart();
         }
      });
   }

   balance = computed(() => {
      return this.transactions().reduce((acc, tx) => {
         return tx.type === 'Income' ? acc + tx.amount : acc - tx.amount;
      }, 0); // Starting balance
   });

   netCashFlow = computed(() => {
      return this.transactions().reduce((acc, tx) => {
         return tx.type === 'Income' ? acc + tx.amount : acc - tx.amount;
      }, 0);
   });

   getCategorySpend(category: string) {
      return this.transactions()
         .filter(t => t.category === category && t.type === 'Expense')
         .reduce((acc, t) => acc + t.amount, 0);
   }

   getCategoryPercentage(category: string) {
      const cat = this.categories.find(c => c.name === category);
      if (!cat) return 0;
      const spend = this.getCategorySpend(category);
      return Math.min((spend / cat.limit) * 100, 100);
   }

   getCategoryColor(category: string) {
      const pct = this.getCategoryPercentage(category);
      if (pct > 90) return 'bg-red-500';
      if (pct > 70) return 'bg-yellow-500';
      return 'bg-blue-500';
   }

   isOverBudget() {
      return this.categories.some(c => this.getCategoryPercentage(c.name) > 90);
   }

   ngAfterViewInit() {
      this.renderChart();
      window.addEventListener('resize', this.renderChart);
   }

   ngOnDestroy() {
      window.removeEventListener('resize', this.renderChart);
   }

   private renderChart = () => {
      if (!this.miniChartRef) return;
      const el = this.miniChartRef.nativeElement;
      d3.select(el).selectAll('*').remove();

      const txs = this.transactions();
      const startingBalance = 0;

      if (txs.length === 0) return;

      // 1. Process data
      const processedData = txs
         .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
         .map(tx => ({ ...tx, date: new Date(tx.date) }));

      let runningBalance = startingBalance;
      const chartData = [{ date: new Date(processedData[0].date.getTime() - 86400000), balance: startingBalance }];

      for (const tx of processedData) {
         runningBalance += tx.type === 'Income' ? tx.amount : -tx.amount;
         chartData.push({ date: tx.date, balance: runningBalance });
      }

      // 2. D3 setup
      const width = el.offsetWidth;
      const height = 128; // h-32

      const svg = d3.select(el).append('svg')
         .attr('width', width)
         .attr('height', height);

      const x = d3.scaleTime()
         .domain(d3.extent(chartData, d => d.date) as [Date, Date])
         .range([0, width]);

      const y = d3.scaleLinear()
         .domain([d3.min(chartData, d => d.balance) as number, d3.max(chartData, d => d.balance) as number])
         .range([height, 0]);

      const areaColor = this.netCashFlow() >= 0 ? '#16a34a' : '#ef4444';

      // Gradient
      const defs = svg.append("defs");
      const gradient = defs.append("linearGradient")
         .attr("id", "financeGradient")
         .attr("x1", "0%").attr("x2", "0%").attr("y1", "0%").attr("y2", "100%");
      gradient.append("stop").attr("offset", "0%").attr("stop-color", areaColor).attr("stop-opacity", 0.4);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", areaColor).attr("stop-opacity", 0);

      // Area
      const areaGenerator = d3.area<any>()
         .x(d => x(d.date))
         .y0(height)
         .y1(d => y(d.balance))
         .curve(d3.curveBasis);

      svg.append('path')
         .datum(chartData)
         .attr('fill', 'url(#financeGradient)')
         .attr('d', areaGenerator);

      // Line
      const lineGenerator = d3.line<any>()
         .x(d => x(d.date))
         .y(d => y(d.balance))
         .curve(d3.curveBasis);

      svg.append("path")
         .datum(chartData)
         .attr("fill", "none")
         .attr("stroke", areaColor)
         .attr("stroke-width", 2)
         .attr("d", lineGenerator);
   }

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   flipCard() {
      this.isFlipped.update(v => !v);
   }

   openModal() { this.showModal.set(true); }
   closeModal() { this.showModal.set(false); }

   saveTransaction(desc: string, amount: string, type: any, category: any) {
      if (!desc.trim()) {
         this.toastService.show('الرجاء إدخال وصف للعملية', 'error');
         return;
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
         this.toastService.show('الرجاء إدخال مبلغ صحيح وأكبر من صفر', 'error');
         return;
      }

      this.dataService.addTransaction({
         id: `TX-${Date.now()}`,
         date: new Date().toISOString(),
         description: desc,
         amount: numAmount,
         type,
         category
      });
      this.closeModal();
   }
}
