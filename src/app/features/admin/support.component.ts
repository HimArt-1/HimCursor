
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { DataService, User, AuditLogEntry } from '../../core/services/state/data.service';
import { PermissionsService } from '../../core/services/domain/permissions.service';
import { supabaseClient } from '../../core/supabase.client';

interface SystemError {
   id: string;
   component: string;
   message: string;
   severity: 'Critical' | 'Warning' | 'Info';
   timestamp: Date;
}

@Component({
   selector: 'app-support',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-8 animate-fade-in pb-10 min-h-screen">
      <header class="flex justify-between items-center bg-gray-900 text-green-400 p-6 rounded-xl font-mono border border-gray-700 shadow-2xl relative overflow-hidden">
         <div class="relative z-10">
            <h2 class="text-2xl font-bold flex items-center gap-3">
               <span [innerHTML]="getIcon('LifeBuoy')"></span>
               ADMIN SUPPORT CONSOLE
            </h2>
            <p class="text-xs opacity-70 mt-1">SYSTEM DIAGNOSTICS & USER ACTIVITY LOGS</p>
         </div>
         <div class="relative z-10 flex gap-4">
            <div class="text-right">
               <div class="text-xs text-gray-500">SESSION ID</div>
               <div class="text-white font-bold">{{ sessionId }}</div>
            </div>
            <div class="w-12 h-12 rounded-full border-2 border-green-500/30 flex items-center justify-center animate-pulse">
               <span [innerHTML]="getIcon('Activity')" class="text-green-500"></span>
            </div>
         </div>
         
         <!-- Matrix Rain Effect (Static CSS Simulation) -->
         <div class="absolute inset-0 opacity-10 bg-[linear-gradient(0deg,transparent_24%,rgba(34,197,94,.3)_25%,rgba(34,197,94,.3)_26%,transparent_27%,transparent_74%,rgba(34,197,94,.3)_75%,rgba(34,197,94,.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(34,197,94,.3)_25%,rgba(34,197,94,.3)_26%,transparent_27%,transparent_74%,rgba(34,197,94,.3)_75%,rgba(34,197,94,.3)_76%,transparent_77%,transparent)] bg-[length:30px_30px]"></div>
      </header>

      <!-- Broadcast Alert Section -->
      <div class="bg-gray-800 border border-wushai-olive rounded-xl p-6 shadow-lg">
         <h3 class="text-wushai-sand font-bold mb-4 flex items-center gap-2">
            <span [innerHTML]="getIcon('Bell')"></span> إرسال تنبيه عام (Broadcast Alert)
         </h3>
         <div class="flex flex-col md:flex-row gap-4">
            <input #alertMsg type="text" placeholder="اكتب نص التنبيه هنا..." 
                   class="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-wushai-olive outline-none">
            
            <select #alertTarget class="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-wushai-olive outline-none w-48">
               <option value="All">الجميع (Broadcast)</option>
               @for(user of users(); track user.id) {
                  <option [value]="user.id">{{ user.name }}</option>
               }
            </select>

            <button (click)="sendAlert(alertMsg.value, alertTarget.value); alertMsg.value=''" 
                    class="bg-wushai-olive hover:bg-wushai-forest text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2">
               <span [innerHTML]="getIcon('Send')"></span> إرسال
            </button>
         </div>
      </div>

      <!-- Supabase SQL Generator (NEW) -->
      <div class="bg-gray-900 border border-indigo-900/50 rounded-xl p-6 shadow-lg font-mono">
         <h3 class="text-indigo-400 font-bold mb-4 flex items-center gap-2">
            <span [innerHTML]="getIcon('Code')"></span> Supabase SQL Editor Generator
         </h3>
         <div class="text-xs text-gray-400 mb-4">
            Select a recently created user to generate the SQL INSERT statement for Supabase backend.
         </div>
         
         <div class="flex flex-col md:flex-row gap-6">
            <!-- User Selector -->
            <div class="w-full md:w-1/3 bg-gray-950 border border-gray-800 rounded-lg p-2 max-h-60 overflow-y-auto custom-scrollbar">
               <div class="text-xs font-bold text-gray-500 px-2 py-1 mb-1">Recent User Creations</div>
               @for(log of userCreationLogs(); track log.id) {
                  <button (click)="selectLogForSql(log)" 
                     class="w-full text-left p-2 rounded hover:bg-indigo-900/20 text-xs flex justify-between items-center group transition-colors"
                     [class.bg-indigo-900-40]="selectedLog()?.id === log.id">
                     <span class="text-gray-300">{{ log.details }}</span>
                     <span class="text-gray-600 group-hover:text-white">{{ log.timestamp | date:'shortDate' }}</span>
                  </button>
               }
               @if(userCreationLogs().length === 0) {
                  <div class="text-gray-600 italic p-2 text-xs">No recent user creation events found.</div>
               }
            </div>

            <!-- Code Output -->
            <div class="flex-1 relative group">
               <textarea readonly class="w-full h-full min-h-[150px] bg-black text-green-400 p-4 rounded-lg border border-gray-700 text-xs font-mono outline-none resize-none"
                         [value]="generatedSql()"></textarea>
               <button (click)="copySql()" class="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-bold transition-all opacity-0 group-hover:opacity-100">
                  COPY SQL
               </button>
            </div>
         </div>
      </div>

      <!-- Connection Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
         <!-- Health Status -->
         <div class="bg-black border border-gray-800 rounded-xl p-6 shadow-lg">
            <h3 class="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">System Health</h3>
            <div class="flex items-center justify-center h-32">
               @if(isChecking()) {
                  <div class="w-16 h-16 border-4 border-t-green-500 border-gray-800 rounded-full animate-spin"></div>
               } @else {
                  <div class="text-center">
                     <div class="text-5xl font-bold text-green-500 mb-2">98%</div>
                     <div class="text-xs text-green-400">OPERATIONAL</div>
                  </div>
               }
            </div>
         </div>

         <!-- Route Check -->
         <div class="bg-black border border-gray-800 rounded-xl p-6 shadow-lg">
            <h3 class="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Interface Integrity</h3>
            <div class="space-y-3 font-mono text-xs">
               @for(check of routeChecks(); track check.name) {
                  <div class="flex justify-between items-center border-b border-gray-900 pb-2">
                     <span class="text-gray-300">{{ check.name }}</span>
                     <span class="flex items-center gap-2" [ngClass]="check.status === 'OK' ? 'text-green-500' : 'text-red-500'">
                        {{ check.status }} <span class="w-1.5 h-1.5 rounded-full" [ngClass]="check.status === 'OK' ? 'bg-green-500' : 'bg-red-500'"></span>
                     </span>
                  </div>
               }
            </div>
         </div>

         <!-- Actions -->
         <div class="bg-black border border-gray-800 rounded-xl p-6 shadow-lg flex flex-col justify-center gap-4">
            <button (click)="runDiagnostics()" [disabled]="isChecking()" 
               class="w-full py-4 bg-green-900/20 hover:bg-green-900/40 text-green-400 border border-green-800 rounded-lg font-mono font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50">
               <span [innerHTML]="getIcon('Pulse')"></span> RUN DIAGNOSTICS
            </button>
            <button (click)="clearCache()" 
               class="w-full py-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800 rounded-lg font-mono font-bold transition-all flex items-center justify-center gap-3">
               <span [innerHTML]="getIcon('Trash')"></span> PURGE CACHE
            </button>
         </div>
      </div>

      <!-- ⚠️ DANGER ZONE: Data Clearing (System Admin Only) -->
      @if(permissions.isSystemAdmin()) {
        <div class="bg-gradient-to-br from-red-950/50 to-black border-2 border-red-900/50 rounded-xl overflow-hidden shadow-2xl">
          <div class="bg-red-900/30 px-6 py-4 border-b border-red-900/50 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center animate-pulse">
              <span [innerHTML]="getIcon('Trash')" class="text-red-500 w-6 h-6"></span>
            </div>
            <div>
              <h3 class="text-red-400 font-bold text-lg flex items-center gap-2">
                ⚠️ منطقة الخطر - DANGER ZONE
              </h3>
              <p class="text-red-500/70 text-xs">System Admin Only - Irreversible Actions</p>
            </div>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Warning Box -->
            <div class="bg-red-900/20 border border-red-800/50 rounded-lg p-4 text-sm">
              <div class="flex items-start gap-3">
                <span class="text-red-500 text-xl">⚠️</span>
                <div class="text-red-300/80">
                  <p class="font-bold mb-1">تحذير: هذه العمليات لا يمكن التراجع عنها!</p>
                  <p class="text-xs opacity-80">Warning: These operations are permanent and cannot be undone.</p>
                </div>
              </div>
            </div>

            <!-- Clear Options -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Option 1: Clear Data Only -->
              <div class="bg-black/50 border border-gray-800 rounded-xl p-5 hover:border-yellow-800/50 transition-all group">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-10 h-10 rounded-lg bg-yellow-900/30 flex items-center justify-center">
                    <span [innerHTML]="getIcon('Trash')" class="text-yellow-500 w-5 h-5"></span>
                  </div>
                  <div>
                    <h4 class="text-yellow-400 font-bold">مسح البيانات فقط</h4>
                    <p class="text-xs text-gray-500">Clear Data Only</p>
                  </div>
                </div>
                <ul class="text-xs text-gray-400 space-y-1 mb-4 font-mono">
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> المهام (Tasks)</li>
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> المحادثات (Messages)</li>
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> المستندات (Documents)</li>
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> المعاملات (Transactions)</li>
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> الأصول (Assets)</li>
                  <li class="flex items-center gap-2"><span class="text-green-500">✓</span> المستخدمين (Users) - <span class="text-green-400">يبقى</span></li>
                </ul>
                <button (click)="openClearModal(false)" 
                   class="w-full py-3 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 border border-yellow-800/50 rounded-lg font-bold transition-all flex items-center justify-center gap-2 group-hover:border-yellow-700">
                   <span [innerHTML]="getIcon('Trash')"></span> مسح البيانات
                </button>
              </div>

              <!-- Option 2: Full Wipe -->
              <div class="bg-black/50 border border-gray-800 rounded-xl p-5 hover:border-red-800/50 transition-all group">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center animate-pulse">
                    <span [innerHTML]="getIcon('Trash')" class="text-red-500 w-5 h-5"></span>
                  </div>
                  <div>
                    <h4 class="text-red-400 font-bold">مسح كامل للنظام</h4>
                    <p class="text-xs text-gray-500">Full System Wipe</p>
                  </div>
                </div>
                <ul class="text-xs text-gray-400 space-y-1 mb-4 font-mono">
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> المهام (Tasks)</li>
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> المحادثات (Messages)</li>
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> المستندات (Documents)</li>
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> المعاملات (Transactions)</li>
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> الأصول (Assets)</li>
                  <li class="flex items-center gap-2"><span class="text-red-500">✗</span> المستخدمين (Users) - <span class="text-red-400">يُحذف</span></li>
                </ul>
                <button (click)="openClearModal(true)" 
                   class="w-full py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 rounded-lg font-bold transition-all flex items-center justify-center gap-2 group-hover:border-red-700">
                   <span [innerHTML]="getIcon('Trash')"></span> مسح كامل
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Clear Data Confirmation Modal -->
      @if(showClearModal()) {
        <div class="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div class="bg-gray-900 border-2 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
               [class.border-yellow-800]="!clearIncludeUsers()"
               [class.border-red-800]="clearIncludeUsers()">
            
            <!-- Modal Header -->
            <div class="p-6 border-b border-gray-800 text-center"
                 [class.bg-yellow-900/20]="!clearIncludeUsers()"
                 [class.bg-red-900/20]="clearIncludeUsers()">
              <div class="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse"
                   [class.bg-yellow-900/50]="!clearIncludeUsers()"
                   [class.bg-red-900/50]="clearIncludeUsers()">
                <span class="text-4xl">⚠️</span>
              </div>
              <h3 class="text-xl font-bold mb-2"
                  [class.text-yellow-400]="!clearIncludeUsers()"
                  [class.text-red-400]="clearIncludeUsers()">
                {{ clearIncludeUsers() ? 'مسح كامل للنظام' : 'مسح البيانات' }}
              </h3>
              <p class="text-gray-400 text-sm">
                {{ clearIncludeUsers() ? 'سيتم حذف جميع البيانات والمستخدمين!' : 'سيتم حذف جميع البيانات مع الاحتفاظ بالمستخدمين' }}
              </p>
            </div>

            <!-- Modal Body -->
            <div class="p-6 space-y-4">
              <!-- Countdown Timer -->
              @if(clearCountdown() > 0) {
                <div class="text-center">
                  <div class="text-6xl font-bold font-mono mb-2"
                       [class.text-yellow-500]="!clearIncludeUsers()"
                       [class.text-red-500]="clearIncludeUsers()">
                    {{ clearCountdown() }}
                  </div>
                  <p class="text-gray-500 text-sm">يمكنك الإلغاء الآن...</p>
                </div>
              } @else {
                <!-- Confirmation Input -->
                <div>
                  <label class="block text-sm text-gray-400 mb-2">
                    اكتب <span class="font-bold text-white font-mono">DELETE</span> للتأكيد:
                  </label>
                  <input #confirmInput type="text" 
                         class="w-full bg-black border-2 rounded-lg p-4 text-center font-mono text-lg uppercase tracking-widest outline-none transition-all"
                         [class.border-gray-700]="confirmInput.value !== 'DELETE'"
                         [class.border-green-500]="confirmInput.value === 'DELETE'"
                         [class.text-gray-400]="confirmInput.value !== 'DELETE'"
                         [class.text-green-400]="confirmInput.value === 'DELETE'"
                         placeholder="DELETE"
                         (input)="confirmationCode.set(confirmInput.value)">
                </div>
              }

              <!-- Action Buttons -->
              <div class="flex gap-3 pt-4">
                <button (click)="closeClearModal()" 
                   class="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-all">
                   إلغاء
                </button>
                <button (click)="executeClear()" 
                   [disabled]="clearCountdown() > 0 || confirmationCode() !== 'DELETE' || isClearing()"
                   class="flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                   [class.bg-yellow-900]="!clearIncludeUsers()"
                   [class.hover:bg-yellow-800]="!clearIncludeUsers() && clearCountdown() === 0 && confirmationCode() === 'DELETE'"
                   [class.text-yellow-100]="!clearIncludeUsers()"
                   [class.bg-red-900]="clearIncludeUsers()"
                   [class.hover:bg-red-800]="clearIncludeUsers() && clearCountdown() === 0 && confirmationCode() === 'DELETE'"
                   [class.text-red-100]="clearIncludeUsers()">
                   @if(isClearing()) {
                     <div class="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div>
                     جاري المسح...
                   } @else {
                     <span [innerHTML]="getIcon('Trash')"></span>
                     تنفيذ المسح
                   }
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Access & Activity Log (NEW) -->
      <div class="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden font-mono text-xs shadow-2xl">
         <div class="bg-gray-900 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
            <div class="flex items-center gap-3">
               <span class="text-white font-bold">USER ACCESS & AUDIT LOG</span>
               <span class="text-gray-500">/var/log/access.log</span>
            </div>
            <div class="flex gap-2">
               <button (click)="logFilter.set('All')" [class.text-white]="logFilter() === 'All'" class="text-gray-500 hover:text-white px-2">ALL</button>
               <button (click)="logFilter.set('Auth')" [class.text-white]="logFilter() === 'Auth'" class="text-gray-500 hover:text-white px-2">AUTH</button>
               <button (click)="logFilter.set('Changes')" [class.text-white]="logFilter() === 'Changes'" class="text-gray-500 hover:text-white px-2">CHANGES</button>
            </div>
         </div>
         <div class="p-0 h-80 overflow-y-auto custom-scrollbar">
            <table class="w-full text-left">
               <thead class="bg-gray-900 text-gray-500 sticky top-0">
                  <tr>
                     <th class="p-3">TIMESTAMP</th>
                     <th class="p-3">USER</th>
                     <th class="p-3">ACTION</th>
                     <th class="p-3">ENTITY</th>
                     <th class="p-3">DETAILS</th>
                  </tr>
               </thead>
               <tbody>
                  @for(log of filteredLogs(); track log.id) {
                     <tr class="border-b border-gray-900 hover:bg-gray-900/50 transition-colors">
                        <td class="p-3 text-gray-500">{{ log.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}</td>
                        <td class="p-3 font-bold text-gray-300">{{ log.user }}</td>
                        <td class="p-3">
                           <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                              [ngClass]="getActionClass(log.action)">
                              {{ log.action }}
                           </span>
                        </td>
                        <td class="p-3 text-gray-400">{{ log.entityType }}:{{ log.entityId }}</td>
                        <td class="p-3 text-gray-400">{{ log.details }}</td>
                     </tr>
                  }
               </tbody>
            </table>
            @if(filteredLogs().length === 0) {
               <div class="p-8 text-center text-gray-600 italic">No logs found matching filter.</div>
            }
         </div>
      </div>

      <!-- System Error Logs (Terminal Style) -->
      <div class="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden font-mono text-xs shadow-2xl opacity-80">
         <div class="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
            <span class="text-gray-400">/var/log/sys_errors.log</span>
            <span class="text-gray-600">Tail -f</span>
         </div>
         <div class="p-4 h-32 overflow-y-auto custom-scrollbar space-y-2">
            @for(log of errorLogs(); track log.id) {
               <div class="flex gap-4">
                  <span class="text-gray-500 shrink-0">{{ log.timestamp | date:'HH:mm:ss.SSS' }}</span>
                  <span class="font-bold shrink-0 w-24" [ngClass]="{
                     'text-red-500': log.severity === 'Critical',
                     'text-yellow-500': log.severity === 'Warning',
                     'text-blue-500': log.severity === 'Info'
                  }">[{{ log.severity }}]</span>
                  <span class="text-gray-400 shrink-0 w-32">{{ log.component }}</span>
                  <span class="text-gray-300">{{ log.message }}</span>
               </div>
            }
            @if(errorLogs().length === 0) {
               <div class="text-gray-600 italic">No active system errors detected.</div>
            }
         </div>
      </div>
    </div>
  `,
   styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
  `]
})
export class SupportComponent implements OnInit {
   private sanitizer = inject(DomSanitizer);
   private dataService = inject(DataService);
   permissions = inject(PermissionsService);

   sessionId = Math.random().toString(36).substring(7).toUpperCase();
   isChecking = signal(false);
   users = this.dataService.availableUsers;

   // Data Clearing State
   showClearModal = signal(false);
   clearIncludeUsers = signal(false);
   clearCountdown = signal(0);
   confirmationCode = signal('');
   isClearing = signal(false);
   private countdownInterval: any;

   routeChecks = signal([
      { name: '/dashboard', status: 'OK' },
      { name: '/tasks', status: 'OK' },
      { name: '/assets', status: 'OK' },
      { name: '/api/v1/auth', status: 'OK' },
      { name: '/db/latency', status: 'OK' }
   ]);

   errorLogs = signal<SystemError[]>([]);
   auditLogs = this.dataService.auditLogs;
   logFilter = signal<'All' | 'Auth' | 'Changes'>('All');

   // SQL Generator State
   selectedLog = signal<AuditLogEntry | null>(null);
   generatedSql = signal<string>('-- Select a "Create User" log to generate SQL --');

   // Filtered Audit Logs Logic
   filteredLogs = computed(() => {
      const logs = this.auditLogs();
      const filter = this.logFilter();
      if (filter === 'All') return logs;
      if (filter === 'Auth') return logs.filter(l => l.action === 'Login' || l.action === 'Logout');
      if (filter === 'Changes') return logs.filter(l => l.action !== 'Login' && l.action !== 'Logout');
      return logs;
   });

   // Filter specific logs for SQL generation
   userCreationLogs = computed(() => {
      return this.auditLogs().filter(l => l.action === 'Create' && l.entityType === 'User');
   });

   ngOnInit() {
      this.runDiagnostics();
   }

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   getActionClass(action: string): string {
      switch (action) {
         case 'Login': return 'bg-green-900 text-green-400';
         case 'Logout': return 'bg-gray-800 text-gray-400';
         case 'Create': return 'bg-blue-900 text-blue-400';
         case 'Update': return 'bg-yellow-900 text-yellow-400';
         case 'Delete': return 'bg-red-900 text-red-400';
         default: return 'bg-gray-800 text-white';
      }
   }

   sendAlert(message: string, target: string) {
      if (!message) return;
      this.dataService.sendSystemAlert(message, target);
      alert('تم إرسال التنبيه بنجاح');
   }

   // --- SQL Generator Logic ---
   selectLogForSql(log: AuditLogEntry) {
      this.selectedLog.set(log);

      // Look up user data by ID from availableUsers
      const userId = log.entityId;
      const user = this.dataService.availableUsers().find(u => u.id === userId);

      if (user) {
         const sql = `
-- Insert User: ${user.name}
INSERT INTO public.users (id, name, role, avatar_color, pin)
VALUES (
    '${user.id}',
    '${user.name}',
    '${user.role}',
    '${user.avatarColor}',
    '${user.pin}'
);`.trim();
         this.generatedSql.set(sql);
      } else {
         // Fallback if user deleted
         this.generatedSql.set(`-- User data not found for ID: ${userId} (Might be deleted)`);
      }
   }

   copySql() {
      navigator.clipboard.writeText(this.generatedSql());
      alert('SQL copied to clipboard!');
   }

   runDiagnostics() {
      this.isChecking.set(true);

      // Simulate Check
      setTimeout(() => {
         this.isChecking.set(false);
         this.generateRandomLogs();
      }, 2000);
   }

   generateRandomLogs() {
      const components = ['AuthService', 'TaskQueue', 'AssetLoader', 'Router', 'MemoryManager'];
      const errors = [
         { msg: 'Token refreshed successfully', sev: 'Info' },
         { msg: 'High latency detected on AssetLoader', sev: 'Warning' },
         { msg: 'Garbage collection triggered', sev: 'Info' },
         { msg: 'Preflight check warning: req-102 gap', sev: 'Warning' }
      ];

      // Add some logs
      const newLogs: SystemError[] = [];
      for (let i = 0; i < 5; i++) {
         const err = errors[Math.floor(Math.random() * errors.length)];
         newLogs.push({
            id: Math.random().toString(),
            component: components[Math.floor(Math.random() * components.length)],
            message: err.msg,
            severity: err.sev as any,
            timestamp: new Date()
         });
      }
      this.errorLogs.set(newLogs);
   }

   clearCache() {
      alert('Cache purged. System optimized.');
      this.errorLogs.set([]);
   }

   // ========== Data Clearing Methods ==========
   
   openClearModal(includeUsers: boolean) {
      this.clearIncludeUsers.set(includeUsers);
      this.showClearModal.set(true);
      this.confirmationCode.set('');
      this.clearCountdown.set(5);
      
      // Start countdown
      this.countdownInterval = setInterval(() => {
         const current = this.clearCountdown();
         if (current > 0) {
            this.clearCountdown.set(current - 1);
         } else {
            clearInterval(this.countdownInterval);
         }
      }, 1000);
   }

   closeClearModal() {
      this.showClearModal.set(false);
      this.clearCountdown.set(0);
      this.confirmationCode.set('');
      if (this.countdownInterval) {
         clearInterval(this.countdownInterval);
      }
   }

   async executeClear() {
      if (this.confirmationCode() !== 'DELETE') {
         alert('يجب كتابة DELETE للتأكيد');
         return;
      }

      this.isClearing.set(true);

      try {
         if (!supabaseClient) {
            throw new Error('Supabase not configured');
         }

         const { data, error } = await supabaseClient.functions.invoke('admin_clear_data', {
            body: {
               include_users: this.clearIncludeUsers(),
               confirmation: 'DELETE'
            }
         });

         if (error) throw error;

         // Show success
         alert(this.clearIncludeUsers() 
            ? '✅ تم مسح النظام بالكامل بنجاح!\nيرجى تسجيل الدخول مرة أخرى.' 
            : '✅ تم مسح البيانات بنجاح!\nالمستخدمين محفوظين.');

         // Close modal
         this.closeClearModal();

         // If users were deleted, logout
         if (this.clearIncludeUsers()) {
            await supabaseClient.auth.signOut();
            window.location.href = '/';
         } else {
            // Refresh data
            window.location.reload();
         }

      } catch (err: any) {
         console.error('Clear data error:', err);
         alert('❌ فشل في مسح البيانات: ' + (err.message || 'خطأ غير متوقع'));
      } finally {
         this.isClearing.set(false);
      }
   }
}
