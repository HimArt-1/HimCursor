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
        class="fixed bottom-6 left-6 w-14 h-14 bg-wushai-dark hover:bg-wushai-deep text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50 group">
        @if (!isOpen()) {
            <span [innerHTML]="getIcon('MessageCircle')" class="w-6 h-6 animate-fade-in"></span>
        } @else {
             <span [innerHTML]="getIcon('X')" class="w-6 h-6 animate-fade-in"></span>
        }
        <!-- Unread Badge Demo -->
        <span class="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
    </button>

    <!-- Chat Window -->
    <div *ngIf="isOpen()" 
         class="fixed bottom-24 left-6 w-80 md:w-96 h-[500px] bg-white dark:bg-wushai-black rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-wushai-sand z-50 animate-slide-up origin-bottom-left">
      
      <!-- Header -->
      <div class="p-4 bg-wushai-dark text-white flex justify-between items-center shrink-0">
         <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative">
               <span class="w-3 h-3 bg-green-500 rounded-full border-2 border-wushai-dark absolute bottom-0 right-0"></span>
               <span [innerHTML]="getIcon('Users')" class="w-5 h-5"></span>
            </div>
            <div>
               <h3 class="font-bold text-sm">مجتمع وشاي (Wushai)</h3>
               <p class="text-[10px] text-gray-300 flex items-center gap-1">
                 <span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                 متصل الآن
               </p>
            </div>
         </div>
      </div>

      <!-- Messages Area -->
      <div #scrollContainer class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/20">
         <div class="text-center text-xs text-gray-400 my-4">
            <span class="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">بداية المحادثة</span>
         </div>
         
         @for (msg of messages(); track msg.id) {
           <div class="flex gap-3" [ngClass]="{'flex-row-reverse': isMe(msg.senderId)}">
              <!-- Avatar -->
              <div class="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-300">
                <img *ngIf="msg.senderAvatar" [src]="msg.senderAvatar" class="w-full h-full object-cover">
                <div *ngIf="!msg.senderAvatar" class="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-600">
                   {{ msg.senderName.charAt(0) }}
                </div>
              </div>

              <!-- Bubble -->
              <div class="max-w-[75%]">
                 <div class="text-[10px] text-gray-500 mb-1 px-1" [ngClass]="{'text-left': isMe(msg.senderId), 'text-right': !isMe(msg.senderId)}">
                    {{ msg.senderName }}
                 </div>
                 <div class="px-3 py-2 rounded-2xl text-sm shadow-sm break-words relative group"
                      [ngClass]="{
                        'bg-wushai-dark text-white rounded-tr-none': isMe(msg.senderId),
                        'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-tl-none': !isMe(msg.senderId)
                      }">
                    {{ msg.content }}
                    <span class="text-[9px] opacity-60 absolute bottom-1 right-2" *ngIf="isMe(msg.senderId)">
                       <span [innerHTML]="getIcon('Check')" class="w-3 h-3"></span>
                    </span>
                 </div>
                 <div class="text-[9px] text-gray-400 mt-1 px-1" [ngClass]="{'text-left': isMe(msg.senderId), 'text-right': !isMe(msg.senderId)}">
                    {{ msg.timestamp | date:'shortTime' }}
                 </div>
              </div>
           </div>
         }
      </div>

      <!-- Input Area -->
      <div class="p-3 bg-white dark:bg-wushai-black border-t border-wushai-sand shrink-0">
         @if (currentUser()) {
             <form (submit)="sendMessage()" class="flex gap-2 items-end">
                <input type="text" [(ngModel)]="newMessage" name="msg" 
                   placeholder="اكتب رسالتك..." 
                   class="flex-1 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-wushai-olive outline-none text-sm max-h-24"
                   autocomplete="off">
                <button type="submit" [disabled]="!newMessage.trim()"
                   class="w-10 h-10 bg-wushai-olive hover:bg-wushai-dark text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                   <span [innerHTML]="getIcon('Send')" class="w-5 h-5 -rotate-90"></span>
                </button>
             </form>
         } @else {
             <div class="text-center p-2">
                <span class="text-xs text-red-500">يجب تسجيل الدخول للمشاركة</span>
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
   currentUser = this.userService.currentUser;

   @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

   constructor() {
      effect(() => {
         // Auto-scroll when messages change
         const msgs = this.messages();
         setTimeout(() => this.scrollToBottom(), 100);
      });
   }

   toggleChat() {
      this.isOpen.update(v => !v);
      if (this.isOpen()) setTimeout(() => this.scrollToBottom(), 100);
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
