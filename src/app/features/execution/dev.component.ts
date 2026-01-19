
import { Component, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Task } from '../../core/services/state/data.service';
import { ToastService } from '../../core/services/state/toast.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { ConfettiService } from '../../core/services/state/confetti.service';

interface TerminalLine {
   type: 'input' | 'output' | 'error' | 'success';
   text: string;
}

@Component({
   selector: 'app-dev',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-8 animate-fade-in pb-10">
      <header class="flex justify-between items-center">
        <div>
           <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-3">
             <span [innerHTML]="getIcon('Code')"></span> مركز العمليات (Dev Ops)
           </h2>
           <p class="text-wushai-olive mt-2">تحكم بالنظام عبر الطرفية (Terminal) وراقب خطوط الإنتاج.</p>
        </div>
        <div class="flex gap-3">
           <div class="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold border border-green-200 dark:border-green-800">
             <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             Systems Operational
           </div>
        </div>
      </header>

      <!-- CI/CD Pipeline Visualizer -->
      <section class="bg-white dark:bg-wushai-black dark:border-wushai-olive border border-wushai-sand rounded-2xl p-6 shadow-sm overflow-hidden relative">
         <h3 class="font-bold text-wushai-dark dark:text-wushai-sand mb-6 flex items-center gap-2">
            <span [innerHTML]="getIcon('Activity')"></span> Pipeline Visualization
         </h3>
         
         <div class="relative flex justify-between items-center px-4 py-8">
            <!-- Connecting Line -->
            <div class="absolute top-1/2 left-10 right-10 h-1 bg-gray-200 dark:bg-gray-700 -z-0"></div>
            
            <!-- Packet Animation -->
            @if(isDeploying()) {
               <div class="absolute top-1/2 left-10 w-3 h-3 bg-wushai-olive rounded-full -mt-1.5 z-10 animate-pipeline"></div>
            }

            <!-- Stages -->
            @for(stage of pipelineStages; track stage.name) {
               <div class="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-wushai-black p-2">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                       [ngClass]="getStageClass(stage.status)">
                       <span [innerHTML]="getIcon(stage.icon)" class="w-5 h-5"></span>
                  </div>
                  <span class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ stage.name }}</span>
               </div>
            }
         </div>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Interactive Terminal -->
        <div class="lg:col-span-2 bg-gray-900 text-green-400 rounded-xl shadow-2xl overflow-hidden font-mono text-sm border border-gray-700 flex flex-col h-[500px]">
           <div class="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
              <div class="flex gap-1.5">
                 <div class="w-3 h-3 rounded-full bg-red-500"></div>
                 <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                 <div class="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span class="text-gray-400 text-xs ml-2">admin@himcontrol:~</span>
           </div>
           
           <div class="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth" #terminalContainer (click)="inputField.focus()">
              <div class="opacity-50 mb-4">Welcome to HimControl CLI v1.0. Type 'help' to start.</div>
              
              @for(line of terminalHistory(); track $index) {
                 <div class="mb-1 break-words" [ngClass]="{
                    'text-white font-bold': line.type === 'input',
                    'text-green-400': line.type === 'output',
                    'text-red-400': line.type === 'error',
                    'text-blue-400': line.type === 'success'
                 }">
                    @if(line.type === 'input') { <span class="text-pink-500 mr-2">➜</span> }
                    {{ line.text }}
                 </div>
              }
              
              <div class="flex items-center mt-2">
                 <span class="text-pink-500 mr-2">➜</span>
                 <input #inputField type="text" 
                        class="bg-transparent border-none outline-none flex-1 text-white placeholder-gray-600"
                        (keydown.enter)="executeCommand(inputField.value); inputField.value = ''"
                        [disabled]="isDeploying()"
                        placeholder="Type command..."
                        autocomplete="off"
                        autofocus>
              </div>
           </div>
        </div>

        <!-- Sidebar Info -->
        <div class="space-y-6">
           <!-- Active Commits (Mini) -->
           <div class="bg-white dark:bg-wushai-black dark:border-wushai-olive border border-wushai-sand rounded-2xl p-6">
              <h3 class="font-bold text-wushai-dark dark:text-wushai-sand mb-4">Recent Commits</h3>
              <div class="space-y-4">
                 @for (commit of commits().slice(0, 4); track commit.id) {
                   <div class="flex flex-col border-l-2 border-gray-200 dark:border-gray-700 pl-3 py-1">
                      <div class="flex justify-between items-center text-xs text-gray-400 mb-1">
                         <span class="font-mono">{{ commit.id }}</span>
                         <span>{{ commit.date | date:'shortTime' }}</span>
                      </div>
                      <p class="text-sm font-medium text-wushai-dark dark:text-white line-clamp-1">{{ commit.message }}</p>
                      <span class="text-xs text-wushai-olive">{{ commit.author }}</span>
                   </div>
                 }
              </div>
           </div>
           
           <!-- Quick Reference -->
           <div class="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
              <h4 class="font-bold text-blue-900 dark:text-blue-300 mb-2">CLI Help</h4>
              <ul class="space-y-2 text-xs font-mono text-blue-800 dark:text-blue-400">
                 <li><span class="font-bold">help</span> - Show commands</li>
                 <li><span class="font-bold">tasks</span> - List tasks</li>
                 <li><span class="font-bold">add "Title"</span> - Create task</li>
                 <li><span class="font-bold">deploy</span> - Run pipeline</li>
                 <li><span class="font-bold">clear</span> - Clear screen</li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  `,
   styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
    @keyframes pipeline {
       0% { left: 10%; }
       100% { left: 90%; }
    }
    .animate-pipeline {
       animation: pipeline 3s linear infinite;
    }
  `]
})
export class DevComponent implements AfterViewChecked {
   private dataService = inject(DataService);
   private toastService = inject(ToastService);
   private sanitizer = inject(DomSanitizer);
   private confettiService = inject(ConfettiService);

   commits = this.dataService.commits;
   terminalHistory = signal<TerminalLine[]>([]);
   isDeploying = signal(false);

   @ViewChild('terminalContainer') terminalContainer!: ElementRef;

   // Pipeline State
   pipelineStages = [
      { name: 'Source', icon: 'Code', status: 'idle' },
      { name: 'Build', icon: 'Cpu', status: 'idle' },
      { name: 'Test', icon: 'Shield', status: 'idle' },
      { name: 'Deploy', icon: 'Terminal', status: 'idle' }
   ];

   ngAfterViewChecked() {
      this.scrollToBottom();
   }

   scrollToBottom() {
      if (this.terminalContainer) {
         this.terminalContainer.nativeElement.scrollTop = this.terminalContainer.nativeElement.scrollHeight;
      }
   }

   getIcon(name: any): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name as keyof typeof Icons] || Icons.Code);
   }

   getStageClass(status: string) {
      switch (status) {
         case 'active': return 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-110 shadow-lg shadow-blue-500/30';
         case 'success': return 'border-green-500 text-green-500 bg-green-50 dark:bg-green-900/20';
         case 'error': return 'border-red-500 text-red-500 bg-red-50';
         default: return 'border-gray-200 dark:border-gray-700 text-gray-400 bg-gray-50 dark:bg-gray-800';
      }
   }

   // --- CLI Logic ---
   executeCommand(cmd: string) {
      if (!cmd.trim()) return;

      // Add Input
      this.terminalHistory.update(h => [...h, { type: 'input', text: cmd }]);

      const parts = cmd.trim().split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      switch (command) {
         case 'help':
            this.printOutput(`Available commands:
  help           Show this message
  tasks          List active tasks
  add "Title"    Create a new task (use quotes)
  deploy         Trigger deployment pipeline
  clear          Clear terminal
  whoami         Current user info`);
            break;

         case 'clear':
            this.terminalHistory.set([]);
            break;

         case 'whoami':
            this.printOutput('User: Admin (Access Level: Root)');
            break;

         case 'tasks':
            const tasks = this.dataService.tasks().slice(0, 5);
            if (tasks.length === 0) {
               this.printOutput('No tasks found.');
            } else {
               this.printOutput('--- Top 5 Active Tasks ---');
               tasks.forEach(t => {
                  this.printOutput(`[${t.status}] ${t.title} (${t.owner})`);
               });
            }
            break;

         case 'add':
            const titleMatch = cmd.match(/"([^"]+)"/);
            if (titleMatch) {
               const title = titleMatch[1];
               this.dataService.addTask({
                  id: `CLI-${Date.now()}`,
                  title: title,
                  description: 'Created via CLI',
                  domain: 'Development',
                  owner: 'Admin',
                  priority: 'Medium',
                  status: 'Todo',
                  dueDate: new Date().toISOString(),
                  tags: ['CLI']
               });
               this.printSuccess(`Task "${title}" created successfully.`);
            } else {
               this.printError('Usage: add "Task Title"');
            }
            break;

         case 'deploy':
            if (this.isDeploying()) {
               this.printError('Deployment already in progress.');
               return;
            }
            this.runPipeline();
            break;

         default:
            this.printError(`Command not found: ${command}. Type 'help' for options.`);
      }
   }

   printOutput(text: string) {
      this.terminalHistory.update(h => [...h, { type: 'output', text }]);
   }
   printError(text: string) {
      this.terminalHistory.update(h => [...h, { type: 'error', text }]);
   }
   printSuccess(text: string) {
      this.terminalHistory.update(h => [...h, { type: 'success', text }]);
   }

   // --- Pipeline Animation Logic ---
   async runPipeline() {
      this.isDeploying.set(true);
      this.printOutput('Starting deployment pipeline...');

      const stages = this.pipelineStages; // Reference

      // Reset
      stages.forEach(s => s.status = 'idle');

      // Source
      stages[0].status = 'active';
      await this.delay(1000);
      stages[0].status = 'success';
      this.printSuccess('[Source] Checked out successfully.');

      // Build
      stages[1].status = 'active';
      await this.delay(1500);
      stages[1].status = 'success';
      this.printSuccess('[Build] Compiled successfully.');

      // Test
      stages[2].status = 'active';
      await this.delay(1000);
      // Simulate random failure? No, let's keep it happy for now.
      stages[2].status = 'success';
      this.printSuccess('[Test] All unit tests passed.');

      // Deploy
      stages[3].status = 'active';
      await this.delay(1000);
      stages[3].status = 'success';
      this.printSuccess('[Deploy] Deployed to Production.');

      this.isDeploying.set(false);
      this.toastService.show('Deployment Completed Successfully!', 'success');
      this.confettiService.launch(200); // Big celebration!
   }

   delay(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
   }
}
