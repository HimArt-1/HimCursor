
import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiService, QuickAction } from '../../core/services/domain/ai.service';
import { DataService } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../ui/icons';

interface Message {
   id: string;
   text: string;
   sender: 'user' | 'bot';
   time: Date;
}

@Component({
   selector: 'app-ai-assistant',
   standalone: true,
   imports: [CommonModule],
   template: `
    @if (isOpen()) {
       <!-- Backdrop for Mobile -->
       <div class="fixed inset-0 bg-black/30 z-[80] md:hidden backdrop-blur-sm" (click)="close()"></div>

       <div class="fixed top-16 left-4 right-4 md:top-4 md:left-72 md:right-auto z-[90] md:w-[440px] bg-white dark:bg-[#1C1612] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up h-[540px]">
         
         <!-- Header -->
         <div class="p-4 bg-gradient-to-r from-wushai-dark to-wushai-dark text-white flex items-center justify-between shadow-md shrink-0">
            <div class="flex items-center gap-3">
               <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <span [innerHTML]="getIcon('Bot')" class="w-5 h-5 text-white"></span>
               </div>
               <div>
                  <h3 class="font-bold text-sm">وشّاي Co-Pilot</h3>
                  <p class="text-[10px] text-gray-300 flex items-center gap-1">
                     <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                     @if (aiService.isProcessing()) {
                       يفكّر...
                     } @else {
                       جاهز للمساعدة
                     }
                  </p>
               </div>
            </div>
            <div class="flex items-center gap-1">
               <button (click)="resetChat()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="محادثة جديدة">
                  <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span>
               </button>
               <button (click)="close()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
               </button>
            </div>
         </div>

         <!-- Messages Area -->
         <div #scrollContainer class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-[#15110D] custom-scrollbar">
            @for (msg of messages(); track msg.id) {
               <div class="flex gap-2.5" [class.flex-row-reverse]="msg.sender === 'user'">
                  @if(msg.sender === 'bot') {
                     <div class="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0 flex items-center justify-center shadow-sm">
                        <span [innerHTML]="getIcon('Bot')" class="w-4 h-4 text-white"></span>
                     </div>
                  }
                  <div class="max-w-[80%] relative group">
                     <div class="p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap"
                          [ngClass]="msg.sender === 'user'
                            ? 'bg-gradient-to-br from-wushai-dark to-wushai-dark text-white rounded-tr-none'
                            : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-tl-none text-gray-800 dark:text-gray-200'">
                        {{ msg.text }}
                     </div>
                     <!-- Copy button for bot messages -->
                     @if (msg.sender === 'bot') {
                       <button (click)="copyText(msg.text)" class="absolute -bottom-1 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 dark:bg-white/10 rounded-lg px-2 py-0.5 text-[9px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                         نسخ
                       </button>
                     }
                     <p class="text-[9px] text-gray-400 mt-1 px-1" [ngClass]="{'text-left': msg.sender === 'user', 'text-right': msg.sender !== 'user'}">
                        {{ msg.time | date:'shortTime' }}
                     </p>
                  </div>
               </div>
            }

            <!-- Thinking Indicator -->
            @if (isThinking()) {
               <div class="flex gap-2.5">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0 flex items-center justify-center shadow-sm">
                     <span [innerHTML]="getIcon('Bot')" class="w-4 h-4 text-white"></span>
                  </div>
                  <div class="bg-white dark:bg-white/5 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-10 border border-gray-100 dark:border-white/5">
                     <span class="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></span>
                     <span class="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></span>
                     <span class="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></span>
                  </div>
               </div>
            }

            <!-- Suggested Prompts (shown when no user messages yet) -->
            @if (messages().length <= 1 && !isThinking()) {
              <div class="mt-4 space-y-2">
                <p class="text-[10px] text-gray-500 dark:text-gray-400 font-bold px-1">جرّب تسأل:</p>
                @for (prompt of aiService.suggestedPrompts; track prompt) {
                  <button (click)="sendMessage(prompt)"
                    class="w-full text-right px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-wushai-cocoa/30 transition-all">
                    💬 {{ prompt }}
                  </button>
                }
              </div>
            }
         </div>

         <!-- Quick Actions Bar -->
         <div class="px-3 py-2 bg-white dark:bg-[#1C1612] border-t border-gray-100 dark:border-white/10 flex gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
           @for (action of aiService.quickActions; track action.label) {
             <button (click)="sendMessage(action.prompt)" [disabled]="isThinking()"
               class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-40 shrink-0">
               <span class="text-sm">{{ action.icon }}</span>
               {{ action.label }}
             </button>
           }
         </div>

         <!-- Input Area -->
         <div class="p-3 bg-white dark:bg-[#1C1612] border-t border-gray-100 dark:border-white/10 shrink-0">
            <div class="relative flex items-center gap-2">
               <input #chatInput type="text" 
                      (keyup.enter)="sendMessage(chatInput.value); chatInput.value = ''"
                      placeholder="اسأل وشّاي عن أي شيء..." 
                      [disabled]="isThinking()"
                      class="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all disabled:opacity-60">
               
               <button (click)="sendMessage(chatInput.value); chatInput.value = ''" 
                       [disabled]="isThinking()"
                       class="absolute right-2 p-2 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-lg hover:from-amber-500 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
                  <span [innerHTML]="getIcon('Send')" class="w-4 h-4" [class.animate-pulse]="isThinking()"></span>
               </button>
            </div>
         </div>
      </div>
    }
  `,
   styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(200,180,160,0.3); border-radius: 4px; }
    @keyframes slide-up {
       from { opacity: 0; transform: translateY(20px) scale(0.95); }
       to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  `]
})
export class AiAssistantComponent implements AfterViewChecked {
   aiService = inject(AiService);
   private dataService = inject(DataService);
   private sanitizer = inject(DomSanitizer);

   isOpen = this.dataService.isAiAssistantOpen;
   isThinking = signal(false);
   messages = signal<Message[]>([
      { id: 'welcome', text: 'مرحباً! 👋 أنا وشّاي، مساعدك الذكي.\n\nيمكنني مساعدتك في:\n• تحليل المهام والأهداف\n• تقارير مالية سريعة\n• اقتراحات لتحسين الأداء\n\nاسأل أو اختر من الأزرار أدناه!', sender: 'bot', time: new Date() }
   ]);

   @ViewChild('scrollContainer') scrollContainer!: ElementRef;

   close() {
      this.dataService.toggleAiAssistant();
   }

   resetChat() {
      this.messages.set([
         { id: 'welcome-' + Date.now(), text: 'تم بدء محادثة جديدة! 🔄\nكيف يمكنني مساعدتك؟', sender: 'bot', time: new Date() }
      ]);
      this.aiService.clearHistory();
   }

   ngAfterViewChecked() {
      this.scrollToBottom();
   }

   scrollToBottom() {
      if (this.scrollContainer) {
         this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
   }

   async sendMessage(text: string) {
      if (!text.trim() || this.isThinking()) return;

      this.messages.update(m => [...m, {
         id: Date.now().toString(),
         text: text,
         sender: 'user',
         time: new Date()
      }]);

      this.isThinking.set(true);

      try {
         const response = await this.aiService.sendMessage(text);
         this.messages.update(m => [...m, {
            id: (Date.now() + 1).toString(),
            text: response,
            sender: 'bot',
            time: new Date()
         }]);
      } finally {
         this.isThinking.set(false);
      }
   }

   copyText(text: string) {
      navigator.clipboard.writeText(text).catch(() => { });
   }

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }
}
