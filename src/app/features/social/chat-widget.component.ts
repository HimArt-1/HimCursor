import { Component, inject, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/domain/chat.service';
import { UserService } from '../../core/services/domain/user.service';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

@Component({
   selector: 'app-chat-widget',
   standalone: true,
   imports: [CommonModule, FormsModule],
   template: `
    <!-- Floating Action Button (FAB) -->
    <button (click)="toggleChat()" 
        class="fixed bottom-[5.5rem] md:bottom-6 right-4 md:left-6 md:right-auto w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-40 group"
        [ngClass]="isOpen() ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600'">
        @if (!isOpen()) {
            <span [innerHTML]="getIcon('MessageSquare')" class="w-6 h-6 text-white animate-fade-in"></span>
        } @else {
             <span [innerHTML]="getIcon('X')" class="w-6 h-6 text-white animate-fade-in"></span>
        }
        <!-- Unread Badge -->
        @if (unreadCount() > 0 && !isOpen()) {
          <span class="absolute -top-1 -right-1 flex items-center justify-center h-5 min-w-[1.25rem] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-wushai-espresso shadow-lg animate-bounce">
            {{ unreadCount() > 99 ? '99+' : unreadCount() }}
          </span>
        }
    </button>

    <!-- Chat Window -->
    <div *ngIf="isOpen()" 
         class="fixed bottom-[8.5rem] md:bottom-24 right-4 md:left-6 md:right-auto w-[calc(100vw-2rem)] md:w-96 h-[60vh] md:h-[500px] max-h-[500px] bg-white dark:bg-[#1e1a2e] rounded-2xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden border border-gray-200 dark:border-white/10 z-40 animate-slide-up origin-bottom-right md:origin-bottom-left">
      
      <!-- Header -->
      <div class="p-4 bg-gradient-to-r from-violet-600 to-purple-700 text-white flex justify-between items-center shrink-0">
         <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center relative">
               <span class="w-3 h-3 bg-emerald-400 rounded-full border-2 border-purple-600 absolute -bottom-0.5 -right-0.5"></span>
               <span [innerHTML]="getIcon('MessageSquare')" class="w-5 h-5"></span>
            </div>
            <div>
               <h3 class="font-bold text-sm">مجتمع وشاي</h3>
               <p class="text-[10px] text-white/70 flex items-center gap-1">
                 <span class="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></span>
                 متصل الآن
               </p>
            </div>
         </div>
      </div>

      <!-- Messages Area -->
      <div #scrollContainer class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-[#15112a]">
         <div class="text-center text-xs text-gray-400 my-4">
            <span class="bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">بداية المحادثة</span>
         </div>
         
         @for (msg of messages(); track msg.id) {
           <div class="flex gap-2.5" [ngClass]="{'flex-row-reverse': isMe(msg.senderId)}">
              <!-- Avatar -->
              <div class="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-white/20 dark:ring-white/10">
                <img *ngIf="msg.senderAvatar" [src]="msg.senderAvatar" class="w-full h-full object-cover">
                <div *ngIf="!msg.senderAvatar" class="w-full h-full flex items-center justify-center text-[10px] font-bold bg-gradient-to-br from-violet-400 to-purple-500 text-white">
                   {{ msg.senderName.charAt(0) }}
                </div>
              </div>

              <!-- Bubble -->
              <div class="max-w-[75%]">
                 <div class="text-[10px] text-gray-500 dark:text-gray-400 mb-1 px-1" [ngClass]="{'text-left': isMe(msg.senderId), 'text-right': !isMe(msg.senderId)}">
                    {{ msg.senderName }}
                 </div>
                 <div class="px-3 py-2 rounded-2xl text-sm shadow-sm break-words"
                      [ngClass]="{
                        'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-none': isMe(msg.senderId),
                        'bg-white dark:bg-white/10 border border-gray-100 dark:border-white/5 rounded-tl-none text-gray-800 dark:text-gray-200': !isMe(msg.senderId)
                      }">
                    {{ msg.content }}
                 </div>
                 <div class="text-[9px] text-gray-400 mt-1 px-1" [ngClass]="{'text-left': isMe(msg.senderId), 'text-right': !isMe(msg.senderId)}">
                    {{ msg.timestamp | date:'shortTime' }}
                 </div>
              </div>
           </div>
         }
      </div>

      <!-- Input Area -->
      <div class="p-3 bg-white dark:bg-[#1e1a2e] border-t border-gray-100 dark:border-white/10 shrink-0">
         @if (currentUser()) {
             <form (submit)="sendMessage()" class="flex gap-2 items-end">
                <input type="text" [(ngModel)]="newMessage" name="msg" 
                   placeholder="اكتب رسالتك..." 
                   class="flex-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm"
                   autocomplete="off">
                <button type="submit" [disabled]="!newMessage.trim()"
                   class="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90">
                   <span [innerHTML]="getIcon('Send')" class="w-5 h-5 -rotate-90"></span>
                </button>
             </form>
         } @else {
             <div class="text-center p-2">
                <span class="text-xs text-red-400">يجب تسجيل الدخول للمشاركة</span>
             </div>
         }
      </div>
    </div>
  `,
   styles: [`
    .animate-slide-up {
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class ChatWidgetComponent {
   private chatService = inject(ChatService);
   private userService = inject(UserService);
   private sanitizer = inject(DomSanitizer);

   isOpen = signal(false);
   newMessage = '';

   messages = this.chatService.messages;
   unreadCount = this.chatService.unreadCount;
   currentUser = this.userService.currentUser;

   @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

   constructor() {
      effect(() => {
         const msgs = this.messages();
         setTimeout(() => this.scrollToBottom(), 100);
      });
   }

   toggleChat() {
      this.isOpen.update(v => !v);
      if (this.isOpen()) {
         this.chatService.markAsRead();
         setTimeout(() => this.scrollToBottom(), 100);
      }
   }

   sendMessage() {
      if (!this.newMessage.trim()) return;
      this.chatService.sendMessage(this.newMessage);
      this.newMessage = '';
      this.scrollToBottom();
   }

   isMe(senderId: string): boolean {
      return this.currentUser()?.id === senderId;
   }

   scrollToBottom(): void {
      if (this.scrollContainer) {
         const el = this.scrollContainer.nativeElement;
         el.scrollTop = el.scrollHeight;
      }
   }

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }
}
