
import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiService } from '../../core/services/domain/ai.service';
import { DataService } from '../../core/services/state/data.service'; // Import DataService
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
    <!-- Chat Window -->
    @if (isOpen()) {
       <!-- Backdrop for Mobile -->
       <div class="fixed inset-0 bg-black/30 z-[80] md:hidden" (click)="close()"></div>

       <div class="fixed top-20 left-4 right-4 md:top-4 md:left-72 md:right-auto z-[90] md:w-[400px] bg-white dark:bg-wushai-black border border-wushai-sand dark:border-wushai-olive rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up h-[500px]">
         
         <!-- Header -->
         <div class="p-4 bg-wushai-dark text-white flex items-center justify-between shadow-md">
            <div class="flex items-center gap-3">
               <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <span [innerHTML]="getIcon('Bot')" class="w-5 h-5 text-yellow-300"></span>
               </div>
               <div>
                  <h3 class="font-bold text-sm">مساعد وشّى الذكي</h3>
                  <p class="text-[10px] text-gray-300 flex items-center gap-1">
                     <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> متصل الآن
                  </p>
               </div>
            </div>
            <button (click)="close()" class="text-white/70 hover:text-white transition-colors">
               <span [innerHTML]="getIcon('X')" class="w-5 h-5"></span>
            </button>
         </div>

         <!-- Messages Area -->
         <div #scrollContainer class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/20 custom-scrollbar">
            @for (msg of messages(); track msg.id) {
               <div class="flex gap-2" [class.flex-row-reverse]="msg.sender === 'user'">
                  @if(msg.sender === 'bot') {
                     <div class="w-8 h-8 rounded-full bg-wushai-olive flex-shrink-0 flex items-center justify-center text-white text-[10px]">AI</div>
                  }
                  <div class="max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap"
                       [ngClass]="msg.sender === 'user' ? 'bg-wushai-dark text-white rounded-br-none' : 'bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none'">
                     {{ msg.text }}
                     <p class="text-[9px] opacity-50 mt-1 text-right">{{ msg.time | date:'shortTime' }}</p>
                  </div>
               </div>
            }
            @if (isThinking()) {
               <div class="flex gap-2">
                  <div class="w-8 h-8 rounded-full bg-wushai-olive flex-shrink-0 flex items-center justify-center text-white text-[10px]">AI</div>
                  <div class="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1 h-10">
                     <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                     <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                     <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                  </div>
               </div>
            }
         </div>

         <!-- Input Area -->
         <div class="p-3 bg-white dark:bg-wushai-black border-t border-wushai-sand dark:border-wushai-olive">
            <div class="relative flex items-center">
               <input #chatInput type="text" 
                      (keyup.enter)="sendMessage(chatInput.value); chatInput.value = ''"
                      placeholder="اسأل عن المهام، الحملات..." 
                      class="w-full bg-gray-100 dark:bg-gray-900 dark:text-white rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-wushai-olive transition-all">
               
               <button (click)="sendMessage(chatInput.value); chatInput.value = ''" 
                       [disabled]="isThinking()"
                       class="absolute right-2 p-2 bg-wushai-dark text-white rounded-lg hover:bg-wushai-olive disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <span [innerHTML]="getIcon('Send')" class="w-4 h-4" [class.animate-pulse]="isThinking()"></span>
               </button>
            </div>
         </div>
      </div>
    }
  `,
   styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
    @keyframes slide-up {
       from { opacity: 0; transform: translateY(20px) scale(0.95); }
       to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  `]
})
export class AiAssistantComponent implements AfterViewChecked {
   private aiService = inject(AiService);
   private dataService = inject(DataService); // Inject DataService
   private sanitizer = inject(DomSanitizer);

   // Use DataService signal
   isOpen = this.dataService.isAiAssistantOpen;

   isThinking = signal(false);
   messages = signal<Message[]>([
      { id: 'welcome', text: 'أهلاً بك يا مدير! 👨‍💼\nأنا عقلك الرقمي هنا. كيف يمكنني مساعدتك في مشروع وشّى اليوم؟', sender: 'bot', time: new Date() }
   ]);

   @ViewChild('scrollContainer') scrollContainer!: ElementRef;

   close() {
      this.dataService.toggleAiAssistant(); // Toggle off
   }

   // toggleOpen removed as it's handled by sidebar

   ngAfterViewChecked() {
      this.scrollToBottom();
   }

   scrollToBottom() {
      if (this.scrollContainer) {
         this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
   }

   async sendMessage(text: string) {
      if (!text.trim()) return;

      // User Message
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

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }
}
