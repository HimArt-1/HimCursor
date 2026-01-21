
import { Component, inject, signal, computed, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/state/data.service';
import { ToastService } from '../../core/services/state/toast.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../ui/icons';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: keyof typeof Icons;
  action: () => void;
  group: 'Navigation' | 'Action' | 'System';
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
                     placeholder="Type a command or search..."
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
                    <p>No results found for "{{ query() }}"</p>
                 </div>
              }
           </div>

           <!-- Footer -->
           <div class="p-2 border-t border-wushai-sand dark:border-wushai-olive bg-gray-50 dark:bg-wushai-deep/30 flex justify-between items-center text-xs text-gray-500">
              <div class="flex gap-4">
                 <span><span class="font-bold">↑↓</span> to navigate</span>
                 <span><span class="font-bold">↵</span> to select</span>
              </div>
              <span class="font-mono">HimControl v1.0</span>
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
  private sanitizer = inject(DomSanitizer);

  isOpen = signal(false);
  query = signal('');
  selectedIndex = signal(0);

  // All Commands Definition
  allCommands: CommandItem[] = [
    // Navigation
    { id: 'nav-home', title: 'Go to Dashboard', icon: 'Home', group: 'Navigation', action: () => this.router.navigate(['/']) },
    { id: 'nav-tasks', title: 'Go to Tasks', icon: 'List', group: 'Navigation', action: () => this.router.navigate(['/tasks']) },
    { id: 'nav-assets', title: 'Go to Assets', icon: 'Image', group: 'Navigation', action: () => this.router.navigate(['/assets']) },
    { id: 'nav-trace', title: 'Go to Traceability Matrix', icon: 'Shield', group: 'Navigation', action: () => this.router.navigate(['/traceability']) },
    { id: 'nav-reports', title: 'Go to Reports', icon: 'BarChart', group: 'Navigation', action: () => this.router.navigate(['/reports']) },
    { id: 'nav-strategy', title: 'Go to Strategy', icon: 'Map', group: 'Navigation', action: () => this.router.navigate(['/strategy']) },
    { id: 'nav-finance', title: 'Go to Finance', icon: 'Briefcase', group: 'Navigation', action: () => this.router.navigate(['/finance']) },

    // Actions
    { id: 'act-dark', title: 'Toggle Dark Mode', description: 'Switch visual theme', icon: 'Settings', group: 'Action', action: () => { this.dataService.toggleDarkMode(); this.toastService.show('Theme toggled', 'success'); } },
    { id: 'act-new-task', title: 'Create New Task', description: 'Open task editor', icon: 'Plus', group: 'Action', action: () => this.router.navigate(['/tasks'], { queryParams: { new: 1 } }) },
    { id: 'act-overdue', title: 'Show Overdue Tasks', description: 'Filter overdue tasks', icon: 'Alert', group: 'Action', action: () => this.router.navigate(['/tasks'], { queryParams: { overdue: 1 } }) },
    { id: 'act-due-soon', title: 'Show Due in 7 Days', description: 'Upcoming deadline window', icon: 'Clock', group: 'Action', action: () => this.router.navigate(['/tasks'], { queryParams: { due: 7 } }) },
    {
      id: 'act-my-tasks',
      title: 'Show My Tasks',
      description: 'Tasks assigned to me',
      icon: 'User',
      group: 'Action',
      action: () => {
        const user = this.dataService.currentUser();
        if (!user) {
          this.toastService.show('No active user', 'error');
          return;
        }
        this.router.navigate(['/tasks'], { queryParams: { owner: 'me' } });
      }
    },
    { id: 'act-ai', title: 'Toggle AI Assistant', description: 'Open Wushai assistant', icon: 'Bot', group: 'Action', action: () => this.dataService.toggleAiAssistant() },
    { id: 'act-notif', title: 'Toggle Notifications', description: 'Open notifications panel', icon: 'Bell', group: 'Action', action: () => this.dataService.toggleNotifications() },
    {
      id: 'act-export', title: 'Backup Database', description: 'Download JSON backup', icon: 'Cpu', group: 'Action', action: () => {
        const data = this.dataService.exportDatabase();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'backup.json'; a.click();
        this.toastService.show('Backup downloaded successfully', 'success');
      }
    },

    // System
    { id: 'sys-reload', title: 'Reload Application', icon: 'Cpu', group: 'System', action: () => window.location.reload() }
  ];

  filteredCommands = computed(() => {
    const q = this.query().toLowerCase();
    return this.allCommands.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      c.group.toLowerCase().includes(q)
    );
  });

  groupedCommands = computed(() => {
    const cmds = this.filteredCommands();
    const groups: { name: string, commands: CommandItem[] }[] = [];
    const groupNames = ['Navigation', 'Action', 'System'];

    groupNames.forEach(name => {
      const groupCmds = cmds.filter(c => c.group === name);
      if (groupCmds.length > 0) groups.push({ name, commands: groupCmds });
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
