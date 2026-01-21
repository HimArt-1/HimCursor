
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { environment } from '../../../environments/environment';
import { isSupabaseConfigured } from '../../core/supabase.client';

@Component({
   selector: 'app-system',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-8 animate-fade-in pb-10">
      <header>
         <h2 class="text-3xl font-bold text-wushai-dark">النظام (System)</h2>
         <p class="text-wushai-olive mt-2">معلومات البيئة التقنية وحالة السيرفرات.</p>
      </header>

      <div class="bg-wushai-black text-gray-300 rounded-2xl p-8 shadow-xl font-mono">
         <div class="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
            <h3 class="text-xl font-bold text-white flex items-center gap-3">
               <span class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
               HimControl System Status
            </h3>
            <span class="bg-gray-800 text-xs px-2 py-1 rounded">v1.0.0-beta</span>
         </div>

         <!-- Storage Monitor (NEW) -->
         <div class="mb-8 bg-gray-900/50 p-6 rounded-xl border border-gray-700">
            <div class="flex justify-between items-end mb-2">
               <span class="text-xs uppercase font-bold text-wushai-sand">LocalStorage Usage</span>
               <span class="text-sm font-bold text-white">{{ usageInMB() }} MB / 5.00 MB</span>
            </div>
            <div class="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
               <div class="h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-1000"
                    [style.width.%]="usagePercentage()"></div>
            </div>
            <p class="text-[10px] text-gray-500 mt-2">Includes base64 assets, tasks, and traceability data.</p>
         </div>

         <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-4">
               <h4 class="text-wushai-sand uppercase tracking-widest text-xs font-bold mb-2">Environment</h4>
               <div class="flex justify-between border-b border-gray-800 pb-2">
                  <span>App Mode</span>
                  <span class="text-white">{{ appMode }}</span>
               </div>
               <div class="flex justify-between border-b border-gray-800 pb-2">
                  <span>Angular Version</span>
                  <span class="text-white">v20.3.0</span>
               </div>
               <div class="flex justify-between border-b border-gray-800 pb-2">
                  <span>Database</span>
                  <span class="text-white">{{ databaseLabel() }}</span>
               </div>
               <div class="flex justify-between border-b border-gray-800 pb-2">
                  <span>AI Engine</span>
                  <span class="text-white">{{ isAiConfigured() ? 'Gemini (Configured)' : 'Offline (Mock)' }}</span>
               </div>
            </div>

            <div class="space-y-4">
               <h4 class="text-wushai-sand uppercase tracking-widest text-xs font-bold mb-2">Services</h4>
               <div class="flex justify-between items-center border-b border-gray-800 pb-2">
                  <span>Authentication</span>
                  <span class="font-bold text-xs" [class.text-green-500]="isSupabaseConfigured()" [class.text-yellow-400]="!isSupabaseConfigured()">
                    {{ isSupabaseConfigured() ? 'OPERATIONAL' : 'LOCAL ONLY' }}
                  </span>
               </div>
               <div class="flex justify-between items-center border-b border-gray-800 pb-2">
                  <span>Realtime</span>
                  <span class="font-bold text-xs" [class.text-green-500]="isSupabaseConfigured()" [class.text-red-500]="!isSupabaseConfigured()">
                    {{ isSupabaseConfigured() ? 'CONNECTED' : 'DISABLED' }}
                  </span>
               </div>
               <div class="flex justify-between items-center border-b border-gray-800 pb-2">
                  <span>Storage (Assets)</span>
                  <span class="font-bold text-xs" [class.text-green-500]="isSupabaseConfigured()" [class.text-yellow-400]="!isSupabaseConfigured()">
                    {{ isSupabaseConfigured() ? 'OPERATIONAL' : 'LOCAL' }}
                  </span>
               </div>
               <div class="flex justify-between items-center border-b border-gray-800 pb-2">
                  <span>AI Assistant</span>
                  <span class="font-bold text-xs" [class.text-green-500]="isAiConfigured()" [class.text-yellow-400]="!isAiConfigured()">
                    {{ isAiConfigured() ? 'ACTIVE' : 'MOCK MODE' }}
                  </span>
               </div>
            </div>
         </div>
      </div>
    </div>
  `
})
export class SystemComponent implements OnInit {
   private sanitizer = inject(DomSanitizer);

   usageInBytes = signal(0);
   isSupabaseConfigured = computed(() => isSupabaseConfigured);
   isAiConfigured = computed(() => !!environment.apiKey);
   appMode = environment.production ? 'Production' : 'Development';
  databaseLabel = computed(() => isSupabaseConfigured ? 'Supabase (Realtime)' : 'LocalStorage (Fallback)');

   usageInMB = computed(() => {
      return (this.usageInBytes() / (1024 * 1024)).toFixed(2);
   });

   usagePercentage = computed(() => {
      const maxBytes = 5 * 1024 * 1024; // 5MB standard limit
      const pct = (this.usageInBytes() / maxBytes) * 100;
      return Math.min(pct, 100);
   });

   ngOnInit() {
      this.calculateStorage();
   }

   calculateStorage() {
      let total = 0;
      for (const key in localStorage) {
         if (localStorage.hasOwnProperty(key)) {
            total += ((localStorage[key].length + key.length) * 2);
         }
      }
      this.usageInBytes.set(total);
   }

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }
}
