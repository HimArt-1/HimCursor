
import { Component, inject, signal, OnDestroy, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { ConfettiService } from '../../core/services/state/confetti.service';

interface LogItem {
   id: string;
   time: Date;
   text: string;
   type: 'sale' | 'traffic' | 'system' | 'cart';
}

@Component({
   selector: 'app-ops',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-6 animate-fade-in pb-10 min-h-screen">
      <header class="flex justify-between items-center bg-wushai-black text-white p-6 rounded-2xl shadow-xl border border-gray-800 relative overflow-hidden">
        <div class="relative z-10">
           <h2 class="text-3xl font-bold flex items-center gap-3">
             <span class="relative flex h-4 w-4">
               <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
               <span class="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
             </span>
             غرفة العمليات (War Room)
           </h2>
           <p class="text-gray-400 mt-2 font-mono text-sm">Real-time store monitoring & operations.</p>
        </div>
        
        <div class="flex items-center gap-4 relative z-10">
           <div class="text-right">
              <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Server Time</p>
              <p class="text-xl font-mono font-bold">{{ currentTime() | date:'mediumTime' }}</p>
           </div>
           <button class="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 px-4 py-2 rounded-lg text-xs font-bold animate-pulse">
              LIVE MODE
           </button>
        </div>

        <!-- Background Decor -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-wushai-olive/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      </header>

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
         <!-- Revenue -->
         <div class="bg-wushai-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
            <div class="absolute right-4 top-4 text-green-500/20 group-hover:scale-110 transition-transform">
               <span class="scale-150" [innerHTML]="getIcon('DollarSign')"></span>
            </div>
            <p class="text-gray-500 text-xs font-bold uppercase tracking-widest">Total Revenue</p>
            <p class="text-3xl font-mono font-bold text-white mt-2 transition-all" [class.text-green-400]="highlightRevenue()">
               \${{ revenue().toFixed(2) }}
            </p>
            <div class="mt-4 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
               <div class="h-full bg-green-500 transition-all duration-500" [style.width.%]="(revenue() % 1000) / 10"></div>
            </div>
         </div>

         <!-- Active Users -->
         <div class="bg-wushai-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
            <div class="absolute right-4 top-4 text-blue-500/20 group-hover:scale-110 transition-transform">
               <span class="scale-150" [innerHTML]="getIcon('Eye')"></span>
            </div>
            <p class="text-gray-500 text-xs font-bold uppercase tracking-widest">Active Visitors</p>
            <p class="text-3xl font-mono font-bold text-white mt-2">{{ activeUsers() }}</p>
            <p class="text-xs text-green-500 mt-1 flex items-center gap-1">
               <span [innerHTML]="getIcon('TrendingUp')" class="w-3 h-3"></span> +{{ (activeUsers() * 0.1).toFixed(0) }}% this hour
            </p>
         </div>

         <!-- Orders -->
         <div class="bg-wushai-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
            <div class="absolute right-4 top-4 text-purple-500/20 group-hover:scale-110 transition-transform">
               <span class="scale-150" [innerHTML]="getIcon('ShoppingCart')"></span>
            </div>
            <p class="text-gray-500 text-xs font-bold uppercase tracking-widest">Orders Today</p>
            <p class="text-3xl font-mono font-bold text-white mt-2">{{ ordersCount() }}</p>
            <div class="flex items-center gap-1 mt-2">
               @for(i of [1,2,3,4,5]; track i) {
                  <div class="w-1.5 h-1.5 rounded-full" [ngClass]="i <= (ordersCount() % 5) + 1 ? 'bg-purple-500' : 'bg-gray-800'"></div>
               }
            </div>
         </div>

         <!-- Server Load -->
         <div class="bg-wushai-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
            <div class="absolute right-4 top-4 text-yellow-500/20 group-hover:scale-110 transition-transform">
               <span class="scale-150" [innerHTML]="getIcon('Zap')"></span>
            </div>
            <p class="text-gray-500 text-xs font-bold uppercase tracking-widest">System Load</p>
            <div class="flex items-end gap-1 h-12 mt-2">
               @for(bar of serverLoadHistory(); track $index) {
                  <div class="flex-1 bg-yellow-500/50 rounded-t-sm transition-all duration-300" [style.height.%]="bar"></div>
               }
            </div>
            <p class="text-xs text-right text-yellow-500 font-mono mt-1">{{ serverLoadHistory()[serverLoadHistory().length-1] }}%</p>
         </div>
      </div>

      <!-- Main Panel: Live Feed & Traffic Map (Simulated) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         <!-- Live Feed -->
         <div class="lg:col-span-1 bg-wushai-black border border-gray-800 rounded-2xl p-4 flex flex-col h-[400px]">
            <h3 class="text-white font-bold mb-4 flex items-center gap-2 text-sm border-b border-gray-800 pb-2">
               <span [innerHTML]="getIcon('Activity')"></span> Activity Stream
            </h3>
            <div class="flex-1 overflow-hidden relative">
               <!-- Fade Mask -->
               <div class="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-wushai-black to-transparent z-10"></div>
               <div class="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-wushai-black to-transparent z-10"></div>
               
               <div class="flex flex-col gap-2 transition-all duration-300 absolute bottom-0 w-full p-2">
                  @for(log of logs(); track log.id) {
                     <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900/50 animate-slide-in text-xs">
                        <div class="w-2 h-2 rounded-full flex-shrink-0"
                             [ngClass]="{
                                'bg-green-500': log.type === 'sale',
                                'bg-blue-500': log.type === 'traffic',
                                'bg-yellow-500': log.type === 'cart',
                                'bg-gray-500': log.type === 'system'
                             }"></div>
                        <span class="text-gray-500 font-mono">{{ log.time | date:'HH:mm:ss' }}</span>
                        <span class="text-gray-300">{{ log.text }}</span>
                     </div>
                  }
               </div>
            </div>
         </div>

         <!-- Traffic Distribution (Visual Mock) -->
         <div class="lg:col-span-2 bg-wushai-black border border-gray-800 rounded-2xl p-6 relative overflow-hidden flex items-center justify-center">
            <div class="absolute top-4 left-4 z-10">
               <h3 class="text-white font-bold text-sm">Traffic Source</h3>
               <p class="text-gray-500 text-xs">Live Geo-Distribution</p>
            </div>

            <!-- Animated Radar / Map Abstract -->
            <div class="relative w-64 h-64">
               <div class="absolute inset-0 border border-gray-700 rounded-full animate-[ping_3s_linear_infinite] opacity-20"></div>
               <div class="absolute inset-4 border border-gray-700 rounded-full animate-[ping_3s_linear_infinite_1s] opacity-20"></div>
               <div class="absolute inset-8 border border-gray-700 rounded-full animate-[ping_3s_linear_infinite_2s] opacity-20"></div>
               
               <!-- Center -->
               <div class="absolute inset-0 flex items-center justify-center">
                  <div class="text-wushai-olive opacity-20 scale-[5]" [innerHTML]="getIcon('Globe')"></div>
               </div>

               <!-- Random Dots (Simulating users) -->
               @for(dot of mapDots(); track $index) {
                  <div class="absolute w-1.5 h-1.5 bg-blue-400 rounded-full transition-all duration-1000 shadow-[0_0_5px_rgba(96,165,250,0.8)]"
                       [style.top.%]="dot.top"
                       [style.left.%]="dot.left"
                       [style.opacity]="dot.opacity"></div>
               }
            </div>
            
            <div class="absolute bottom-4 right-4 flex gap-4 text-xs text-gray-400">
               <div class="flex items-center gap-1"><div class="w-2 h-2 rounded-full bg-blue-400"></div> Mobile (65%)</div>
               <div class="flex items-center gap-1"><div class="w-2 h-2 rounded-full bg-purple-400"></div> Desktop (35%)</div>
            </div>
         </div>
      </div>
    </div>
  `,
   styles: [`
    @keyframes slide-in {
       from { transform: translateY(20px); opacity: 0; }
       to { transform: translateY(0); opacity: 1; }
    }
    .animate-slide-in {
       animation: slide-in 0.3s ease-out forwards;
    }
  `]
})
export class OpsComponent implements OnInit, OnDestroy {
   private sanitizer = inject(DomSanitizer);
   private confettiService = inject(ConfettiService);

   revenue = signal(12450.00);
   activeUsers = signal(42);
   ordersCount = signal(15);
   currentTime = signal(new Date());

   logs = signal<LogItem[]>([]);
   serverLoadHistory = signal<number[]>(new Array(20).fill(10));
   mapDots = signal<{ top: number, left: number, opacity: number }[]>([]);

   highlightRevenue = signal(false);

   private intervals: any[] = [];

   ngOnInit() {
      this.startSimulation();
   }

   ngOnDestroy() {
      this.intervals.forEach(clearInterval);
   }

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   startSimulation() {
      // 1. Clock
      this.intervals.push(setInterval(() => this.currentTime.set(new Date()), 1000));

      // 2. Random Logs & Events
      this.intervals.push(setInterval(() => {
         const rand = Math.random();
         if (rand > 0.7) this.generateTrafficLog();
         else if (rand > 0.9) this.generateCartLog();
         else if (rand > 0.95) this.generateSale();
      }, 800));

      // 3. Server Load Pulse
      this.intervals.push(setInterval(() => {
         this.serverLoadHistory.update(prev => {
            const newVal = Math.floor(Math.random() * 40) + 10; // 10-50%
            return [...prev.slice(1), newVal];
         });
      }, 1500));

      // 4. Map Dots Animation
      this.intervals.push(setInterval(() => {
         this.mapDots.update(() => {
            const dots = [];
            for (let i = 0; i < 8; i++) {
               dots.push({
                  top: Math.random() * 80 + 10,
                  left: Math.random() * 80 + 10,
                  opacity: Math.random()
               });
            }
            return dots;
         });
      }, 2000));
   }

   generateTrafficLog() {
      const cities = ['Riyadh', 'Jeddah', 'Dammam', 'Dubai', 'Cairo'];
      const city = cities[Math.floor(Math.random() * cities.length)];
      this.addLog(`New visitor from ${city}`, 'traffic');
      this.activeUsers.update(v => v + 1);
      // Decay users randomly
      if (Math.random() > 0.5) setTimeout(() => this.activeUsers.update(v => v - 1), 3000);
   }

   generateCartLog() {
      const items = ['Summer Hoodie', 'Classic Cap', 'Oversized Tee', 'Canvas Bag'];
      const item = items[Math.floor(Math.random() * items.length)];
      this.addLog(`User added "${item}" to cart`, 'cart');
   }

   generateSale() {
      const amount = Math.floor(Math.random() * 200) + 50;
      this.revenue.update(v => v + amount);
      this.ordersCount.update(v => v + 1);
      this.addLog(`💰 NEW ORDER! $${amount}`, 'sale');

      // Visual Feedback
      this.highlightRevenue.set(true);
      setTimeout(() => this.highlightRevenue.set(false), 500);

      // Celebration for big orders
      if (amount > 150) {
         this.confettiService.launch(30);
      }
   }

   addLog(text: string, type: LogItem['type']) {
      const item: LogItem = {
         id: Math.random().toString(36),
         time: new Date(),
         text,
         type
      };
      this.logs.update(prev => {
         const newLogs = [...prev, item];
         if (newLogs.length > 6) newLogs.shift();
         return newLogs;
      });
   }
}
