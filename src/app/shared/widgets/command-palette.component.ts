
import { Component, inject, signal, computed, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/state/data.service';
import { ToastService } from '../../core/services/state/toast.service';
import { InvoiceService } from '../../core/services/domain/invoice.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../ui/icons';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: keyof typeof Icons;
  action: () => void;
  group: 'Navigation' | 'Action' | 'System';
  /** Arabic / alternate tokens so search finds localized intents */
  keywords?: string[];
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule],
  host: {
    '(window:keydown)': 'handleKeydown($event)'
  },
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm animate-fade-in"
           (click)="close()">
        <div class="w-full max-w-2xl bg-white dark:bg-wushai-black dark:border-wushai-olive border border-wushai-sand rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] animate-scale-in"
             (click)="$event.stopPropagation()">
           
           <!-- Search Input -->
           <div class="flex items-center gap-3 p-4 border-b border-wushai-sand dark:border-wushai-olive">
              <span class="text-gray-400 w-5 h-5" [innerHTML]="getIcon('Search')"></span>
              <input #cmdInput type="text" 
                     [value]="query()"
                     (input)="query.set(cmdInput.value); selectedIndex.set(0)"
                     placeholder="اكتب أمراً أو ابحث… / Type a command…"
                     class="flex-1 bg-transparent border-none outline-none text-lg text-wushai-dark dark:text-white placeholder-gray-400"
                     autofocus>
              <div class="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">ESC</div>
           </div>

           <!-- Results List -->
           <div class="overflow-y-auto custom-scrollbar p-2">
              @if (filteredCommands().length > 0) {
                 @for (group of groupedCommands(); track group.name) {
                    <div class="mb-2">
                       <h4 class="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider">{{ group.name }}</h4>
                       @for (cmd of group.commands; track cmd.id) {
                          <button (click)="execute(cmd)"
                                  (mouseenter)="setHoverIndex(cmd)"
                                  class="w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors relative"
                                  [ngClass]="{
                                    'bg-wushai-light dark:bg-wushai-deep': isSelected(cmd),
                                    'text-wushai-dark dark:text-white': true
                                  }">
                             @if(isSelected(cmd)) {
                               <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-wushai-olive rounded-r"></div>
                             }
                             <span class="text-gray-500" [innerHTML]="getIcon(cmd.icon)"></span>
                             <div class="flex-1">
                                <p class="font-bold text-sm">{{ cmd.title }}</p>
                                @if(cmd.description) { <p class="text-xs text-gray-500">{{ cmd.description }}</p> }
                             </div>
                             @if(isSelected(cmd)) {
                               <span class="text-xs font-bold text-gray-400">↵ Enter</span>
                             }
                          </button>
                       }
                    </div>
                 }
              } @else {
                 <div class="p-8 text-center text-gray-400">
                    <p>لا توجد نتائج لـ "{{ query() }}"</p>
                 </div>
              }
           </div>

           <!-- Footer -->
           <div class="p-2 border-t border-wushai-sand dark:border-wushai-olive bg-gray-50 dark:bg-wushai-deep/30 flex justify-between items-center text-xs text-gray-500">
              <div class="flex gap-4 flex-wrap">
                 <span><span class="font-bold">⌘K</span> فتح / إغلاق</span>
                 <span><span class="font-bold">↑↓</span> تنقل</span>
                 <span><span class="font-bold">↵</span> تنفيذ</span>
              </div>
              <span class="font-mono">Washa Control v1.0</span>
           </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
    .animate-scale-in { animation: scaleIn 0.1s ease-out; }
    @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `]
})
export class CommandPaletteComponent {
  // FIX: Explicitly type injected Router to fix type inference issue.
  private router: Router = inject(Router);
  private dataService = inject(DataService);
  private toastService = inject(ToastService);
  private invoiceService = inject(InvoiceService);
  private sanitizer = inject(DomSanitizer);

  isOpen = signal(false);
  query = signal('');
  selectedIndex = signal(0);

  // All Commands Definition
  allCommands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-home',
      title: 'لوحة القيادة',
      description: 'Dashboard',
      icon: 'Home',
      group: 'Navigation',
      keywords: ['dashboard', 'go to dashboard', 'home', 'رئيسية', 'لوحة', 'ذكاء', 'تحكم'],
      action: () => this.router.navigate(['/'])
    },
    { id: 'nav-tasks', title: 'المهام', description: 'Tasks', icon: 'List', group: 'Navigation', keywords: ['tasks', 'go to tasks'], action: () => this.router.navigate(['/tasks']) },
    { id: 'nav-assets', title: 'الأصول', description: 'Assets', icon: 'Image', group: 'Navigation', keywords: ['assets'], action: () => this.router.navigate(['/assets']) },
    { id: 'nav-trace', title: 'مصفوفة التتبع', description: 'Traceability', icon: 'Shield', group: 'Navigation', keywords: ['trace'], action: () => this.router.navigate(['/traceability']) },
    { id: 'nav-reports', title: 'التقارير', description: 'Reports', icon: 'BarChart', group: 'Navigation', keywords: ['reports'], action: () => this.router.navigate(['/reports']) },
    { id: 'nav-strategy', title: 'الاستراتيجية', description: 'Strategy', icon: 'Map', group: 'Navigation', keywords: ['strategy'], action: () => this.router.navigate(['/strategy']) },
    {
      id: 'nav-finance',
      title: 'الإدارة المالية',
      description: 'Finance workspace',
      icon: 'Briefcase',
      group: 'Navigation',
      keywords: ['finance', 'مالية', 'مالي', 'go to finance'],
      action: () => this.router.navigate(['/finance'])
    },
    {
      id: 'nav-invoices',
      title: 'الفواتير الإلكترونية',
      description: 'Invoices & ZATCA',
      icon: 'CreditCard',
      group: 'Navigation',
      keywords: ['invoices', 'فاتورة', 'فواتير', 'zatca'],
      action: () => this.router.navigate(['/invoices'])
    },
    { id: 'nav-admin-users', title: 'مستخدمي النظام', description: 'Admin users', icon: 'Users', group: 'Navigation', keywords: ['admin'], action: () => this.router.navigate(['/admin-users']) },

    // Actions
    { id: 'act-dark', title: 'تبديل الوضع الليلي', description: 'Toggle theme', icon: 'Settings', group: 'Action', keywords: ['dark', 'theme'], action: () => { this.dataService.toggleDarkMode(); this.toastService.show('تم تبديل المظهر', 'success'); } },
    { id: 'act-new-task', title: 'مهمة جديدة', description: 'Open task editor', icon: 'Plus', group: 'Action', keywords: ['create new task', 'task'], action: () => this.router.navigate(['/tasks'], { queryParams: { new: 1 } }) },
    { id: 'act-new-invoice', title: 'إنشاء فاتورة جديدة', description: 'الانتقال للفواتير وفتح محرر جديد', icon: 'CreditCard', group: 'Action', keywords: ['invoice', 'فاتورة', 'زاتكا', 'zatca'], action: () => { this.router.navigate(['/invoices'], { queryParams: { new: 1 } }); this.toastService.show('افتح محرر الفاتورة وأكمل البيانات', 'success'); } },
    {
      id: 'act-export-invoices-json',
      title: 'تصدير الفواتير JSON',
      description: 'نسخة احتياطية محلية لجميع الفواتير',
      icon: 'Cpu',
      group: 'Action',
      keywords: ['export', 'backup', 'json', 'تصدير', 'احتياطي', 'فواتير'],
      action: () => {
        const json = this.invoiceService.exportBackupJson();
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `washa-invoices-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.toastService.show('تم تصدير الفواتير', 'success');
      }
    },
    { id: 'act-invoices-delinquent', title: 'فواتير تحتاج متابعة', description: 'تصفية المتأخرة وتجاوز الاستحقاق', icon: 'Alert', group: 'Action', keywords: ['متأخرة', 'فاتورة', 'delinquent', 'تدفق'], action: () => this.router.navigate(['/invoices'], { queryParams: { view: 'delinquent' } }) },
    { id: 'act-sync-invoices-cloud', title: 'مزامنة الفواتير مع السحابة', description: 'Supabase — جدول app_invoices', icon: 'Globe', group: 'Action', keywords: ['sync', 'cloud', 'مزامنة', 'سحابة', 'supabase'], action: () => { void this.invoiceService.reconcileWithCloud().then(r => { this.toastService.show(r.ok ? 'تمت مزامنة الفواتير' : (r.message || 'فشلت المزامنة'), r.ok ? 'success' : 'error'); }); } },
    { id: 'act-overdue', title: 'مهام متأخرة', description: 'Filter overdue', icon: 'Alert', group: 'Action', keywords: ['overdue'], action: () => this.router.navigate(['/tasks'], { queryParams: { overdue: 1 } }) },
    { id: 'act-due-soon', title: 'مواعيد خلال 7 أيام', description: 'Due soon', icon: 'Clock', group: 'Action', keywords: ['due'], action: () => this.router.navigate(['/tasks'], { queryParams: { due: 7 } }) },
    {
      id: 'act-my-tasks',
      title: 'مهامي',
      description: 'Assigned to me',
      icon: 'User',
      group: 'Action',
      action: () => {
        const user = this.dataService.currentUser();
        if (!user) {
          this.toastService.show('لا يوجد مستخدم نشط', 'error');
          return;
        }
        this.router.navigate(['/tasks'], { queryParams: { owner: 'me' } });
      }
    },
    { id: 'act-ai', title: 'مساعد الذكاء', description: 'AI assistant', icon: 'Bot', group: 'Action', keywords: ['ذكاء', 'ai', 'bot', 'وشاي'], action: () => this.dataService.toggleAiAssistant() },
    { id: 'act-notif', title: 'الإشعارات', description: 'Notifications panel', icon: 'Bell', group: 'Action', keywords: ['notifications'], action: () => this.dataService.toggleNotifications() },
    {
      id: 'act-export', title: 'نسخ احتياطي للبيانات', description: 'Download JSON', icon: 'Cpu', group: 'Action', keywords: ['backup'], action: () => {
        const data = this.dataService.exportDatabase();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'backup.json'; a.click();
        this.toastService.show('تم تنزيل النسخة الاحتياطية', 'success');
      }
    },

    // System
    { id: 'sys-reload', title: 'إعادة تحميل التطبيق', description: 'Reload', icon: 'Cpu', group: 'System', keywords: ['reload'], action: () => window.location.reload() }
  ];

  filteredCommands = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.allCommands;
    return this.allCommands.filter(c => {
      const keywordHit = (c.keywords || []).some(k => k.toLowerCase().includes(q));
      return (
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        c.group.toLowerCase().includes(q) ||
        keywordHit
      );
    });
  });

  groupedCommands = computed(() => {
    const cmds = this.filteredCommands();
    const groups: { name: string, commands: CommandItem[] }[] = [];
    const groupLabels: Record<string, string> = { Navigation: 'انتقال', Action: 'إجراءات', System: 'نظام' };
    const groupNames = ['Navigation', 'Action', 'System'];

    groupNames.forEach(name => {
      const groupCmds = cmds.filter(c => c.group === name);
      if (groupCmds.length > 0) groups.push({ name: groupLabels[name] || name, commands: groupCmds });
    });
    return groups;
  });

  @ViewChild('cmdInput') cmdInput!: ElementRef;

  handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.isOpen.set(!this.isOpen());
      if (this.isOpen()) {
        setTimeout(() => this.cmdInput?.nativeElement.focus(), 50);
        this.query.set('');
        this.selectedIndex.set(0);
      }
    }

    if (!this.isOpen()) return;

    if (event.key === 'Escape') {
      this.close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const max = this.filteredCommands().length - 1;
      this.selectedIndex.update(i => i < max ? i + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const max = this.filteredCommands().length - 1;
      this.selectedIndex.update(i => i > 0 ? i - 1 : max);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const cmd = this.filteredCommands()[this.selectedIndex()];
      if (cmd) this.execute(cmd);
    }
  }

  execute(cmd: CommandItem) {
    cmd.action();
    this.close();
  }

  close() {
    this.isOpen.set(false);
  }

  isSelected(cmd: CommandItem): boolean {
    const index = this.filteredCommands().indexOf(cmd);
    return index === this.selectedIndex();
  }

  setHoverIndex(cmd: CommandItem) {
    const index = this.filteredCommands().indexOf(cmd);
    if (index !== -1) this.selectedIndex.set(index);
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }
}
