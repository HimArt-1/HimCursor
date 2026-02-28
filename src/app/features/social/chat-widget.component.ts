import { Component, inject, signal, ElementRef, ViewChild, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/domain/chat.service';
import { UserService } from '../../core/services/domain/user.service';
import { OfflineService } from '../../core/services/infra/offline.service';
import { ChatMessage } from '../../core/types';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

@Component({
   selector: 'app-chat-widget',
   standalone: true,
   imports: [CommonModule, FormsModule],
   template: `
    <!-- Offline Banner -->
    @if (!offlineService.isOnline()) {
      <div class="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-center py-1.5 text-xs font-bold flex items-center justify-center gap-2 animate-slide-down">
        <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
        وضع عدم الاتصال — الرسائل ستُرسل عند العودة
      </div>
    }

    <!-- Floating Action Button (FAB) -->
    <button (click)="toggleChat()" id="chat-fab"
        class="fixed bottom-[5.5rem] md:bottom-6 right-4 md:left-6 md:right-auto w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-40 group"
        [ngClass]="isOpen() ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gradient-to-br from-wushai-cocoa to-wushai-cocoa hover:from-wushai-cocoa hover:to-wushai-cocoa'">
        @if (!isOpen()) {
            <span [innerHTML]="getIcon('MessageSquare')" class="w-6 h-6 text-white animate-fade-in"></span>
        } @else {
             <span [innerHTML]="getIcon('X')" class="w-6 h-6 text-white animate-fade-in"></span>
        }
        @if (chatService.totalUnreadCount() > 0 && !isOpen()) {
          <span class="absolute -top-1 -right-1 flex items-center justify-center h-5 min-w-[1.25rem] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-wushai-espresso shadow-lg animate-bounce">
            {{ chatService.totalUnreadCount() > 99 ? '99+' : chatService.totalUnreadCount() }}
          </span>
        }
    </button>

    <!-- Chat Window -->
    @if (isOpen()) {
      <div class="fixed bottom-[8.5rem] md:bottom-24 right-4 md:left-6 md:right-auto w-[calc(100vw-2rem)] md:w-[520px] h-[65vh] md:h-[550px] max-h-[600px] bg-white dark:bg-[#1C1612] rounded-2xl shadow-2xl shadow-black/20 flex overflow-hidden border border-gray-200 dark:border-white/10 z-40 animate-slide-up origin-bottom-right md:origin-bottom-left">

        <!-- Channels Sidebar -->
        @if (showChannels()) {
          <div class="w-full md:w-56 flex flex-col bg-gray-50 dark:bg-[#15110D] border-l border-gray-200 dark:border-white/10 shrink-0">
            <!-- Channels Header -->
            <div class="p-3 bg-gradient-to-r from-wushai-cocoa to-wushai-cocoa text-white flex justify-between items-center shrink-0">
              <div class="flex items-center gap-2">
                <span [innerHTML]="getIcon('MessageSquare')" class="w-5 h-5"></span>
                <h3 class="font-bold text-sm">المحادثات</h3>
              </div>
              <button (click)="showNewChannel.set(true)" class="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors" title="قناة جديدة">
                <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span>
              </button>
            </div>

            <!-- Channel List -->
            <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              <!-- Default Global Channel -->
              <button (click)="selectChannel('global')"
                class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right transition-all"
                [ngClass]="activeChannelId() === 'global' ? 'bg-wushai-cocoa/10 dark:bg-wushai-cocoa/20 border border-wushai-cocoa/30' : 'hover:bg-gray-100 dark:hover:bg-white/5'">
                <span class="text-lg">☕</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">مجتمع وشاي</p>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">القناة العامة</p>
                </div>
              </button>

              <!-- Other Channels -->
              @for (channel of channels(); track channel.id) {
                @if (!channel.isDefault) {
                  <button (click)="selectChannel(channel.id)"
                    class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right transition-all"
                    [ngClass]="activeChannelId() === channel.id ? 'bg-wushai-cocoa/10 dark:bg-wushai-cocoa/20 border border-wushai-cocoa/30' : 'hover:bg-gray-100 dark:hover:bg-white/5'">
                    <span class="text-lg">{{ channel.icon }}</span>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{{ channel.name }}</p>
                      @if (channel.lastMessagePreview) {
                        <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">{{ channel.lastMessagePreview }}</p>
                      }
                    </div>
                  </button>
                }
              }
            </div>

            <!-- Create Channel Panel -->
            @if (showNewChannel()) {
              <div class="p-3 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1612] space-y-2">
                <p class="text-xs font-bold text-gray-600 dark:text-gray-300">قناة جديدة</p>
                <input type="text" [(ngModel)]="newChannelName" name="chName" placeholder="اسم القناة"
                  class="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none">
                <div class="flex gap-1">
                  @for (ic of channelIcons; track ic) {
                    <button (click)="newChannelIcon = ic"
                      class="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all"
                      [ngClass]="newChannelIcon === ic ? 'bg-wushai-cocoa/20 ring-2 ring-wushai-cocoa' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10'">
                      {{ ic }}
                    </button>
                  }
                </div>
                <div class="flex gap-2">
                  <button (click)="createChannel()" [disabled]="!newChannelName.trim()"
                    class="flex-1 bg-wushai-cocoa text-white py-1.5 rounded-lg text-xs font-bold disabled:opacity-30">إنشاء</button>
                  <button (click)="showNewChannel.set(false)"
                    class="px-3 py-1.5 bg-gray-200 dark:bg-white/10 rounded-lg text-xs font-bold">إلغاء</button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Messages Area -->
        <div class="flex-1 flex flex-col min-w-0">
          <!-- Channel Header -->
          <div class="p-3 bg-gradient-to-r from-wushai-cocoa to-wushai-cocoa text-white flex justify-between items-center shrink-0">
             <div class="flex items-center gap-2.5">
                <!-- Back button on mobile -->
                @if (!showChannels()) {
                  <button (click)="showChannels.set(true)" class="md:hidden w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                    <span [innerHTML]="getIcon('ChevronLeft')" class="w-4 h-4"></span>
                  </button>
                }
                <div class="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-lg relative">
                   <span class="w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-wushai-cocoa absolute -bottom-0.5 -right-0.5"></span>
                   {{ activeChannelIcon() }}
                </div>
                <div>
                   <h3 class="font-bold text-sm">{{ activeChannelName() }}</h3>
                   <p class="text-[10px] text-white/70 flex items-center gap-1">
                     @if (chatService.typingUsers().length > 0) {
                       <span class="text-emerald-300 animate-pulse">{{ chatService.typingUsers()[0] }} يكتب...</span>
                     } @else {
                       <span class="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></span>
                       متصل الآن
                     }
                   </p>
                </div>
             </div>
             <div class="flex items-center gap-1">
                <!-- Search Toggle -->
                <button (click)="toggleSearch()" class="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                  <span [innerHTML]="getIcon('Search')" class="w-4 h-4"></span>
                </button>
                <!-- Pinned Messages -->
                <button (click)="togglePinned()" class="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors relative">
                  <span [innerHTML]="getIcon('Pin')" class="w-4 h-4"></span>
                  @if (chatService.pinnedMessages().length > 0) {
                    <span class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 text-[8px] font-bold rounded-full flex items-center justify-center text-black">{{ chatService.pinnedMessages().length }}</span>
                  }
                </button>
                <!-- Channel list toggle on mobile -->
                <button (click)="toggleChannelsMobile()" class="md:hidden w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                  <span [innerHTML]="getIcon('Hash')" class="w-4 h-4"></span>
                </button>
             </div>
          </div>

          <!-- Search Bar -->
          @if (showSearch()) {
            <div class="p-2 bg-gray-50 dark:bg-[#15110D] border-b border-gray-200 dark:border-white/10 animate-slide-down">
              <input type="text" [ngModel]="chatService.searchQuery()" (ngModelChange)="chatService.searchQuery.set($event)" name="search"
                placeholder="ابحث في الرسائل..."
                class="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none">
              @if (chatService.searchResults().length > 0) {
                <p class="text-[10px] text-gray-500 mt-1 px-1">{{ chatService.searchResults().length }} نتيجة</p>
              }
            </div>
          }

          <!-- Pinned Messages Panel -->
          @if (showPinned()) {
            <div class="p-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/30 max-h-32 overflow-y-auto animate-slide-down">
              <p class="text-[10px] font-bold text-amber-700 dark:text-amber-300 mb-1.5 flex items-center gap-1">
                <span [innerHTML]="getIcon('Pin')" class="w-3 h-3"></span> الرسائل المثبتة
              </p>
              @for (pin of chatService.pinnedMessages(); track pin.id) {
                <div class="text-xs text-amber-900 dark:text-amber-200 py-1 border-b border-amber-100 dark:border-amber-800/20 last:border-0">
                  <span class="font-bold">{{ pin.senderName }}:</span> {{ pin.content | slice:0:60 }}
                </div>
              } @empty {
                <p class="text-xs text-amber-600/60">لا توجد رسائل مثبتة</p>
              }
            </div>
          }

          <!-- Messages -->
          <div #scrollContainer class="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50 dark:bg-[#15112a] custom-scrollbar">
             @if (chatService.isLoading()) {
               <div class="flex justify-center py-8">
                 <div class="w-6 h-6 border-2 border-wushai-cocoa/30 border-t-wushai-cocoa rounded-full animate-spin"></div>
               </div>
             } @else {
               <div class="text-center text-xs text-gray-400 my-3">
                  <span class="bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">بداية المحادثة</span>
               </div>

               @for (msg of displayMessages(); track msg.id) {
                 <div class="group relative">
                   <!-- Reply reference -->
                   @if (msg.replyToId) {
                     <div class="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 mb-1 pr-10"
                          [ngClass]="{'pl-10 pr-0': chatService.isMe(msg.senderId)}">
                       <span [innerHTML]="getIcon('Reply')" class="w-3 h-3 opacity-50"></span>
                       <span class="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded truncate max-w-[200px]">
                         {{ getReplyPreview(msg.replyToId) }}
                       </span>
                     </div>
                   }

                   <div class="flex gap-2" [ngClass]="{'flex-row-reverse': chatService.isMe(msg.senderId)}">
                      <!-- Avatar -->
                      <div class="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-2 ring-white/20 dark:ring-white/10">
                        @if (msg.senderAvatar) {
                          <img [src]="msg.senderAvatar" class="w-full h-full object-cover">
                        } @else {
                          <div class="w-full h-full flex items-center justify-center text-[10px] font-bold bg-gradient-to-br from-wushai-sand to-wushai-cocoa text-white">
                             {{ msg.senderName.charAt(0) }}
                          </div>
                        }
                      </div>

                      <!-- Bubble -->
                      <div class="max-w-[75%]">
                         <div class="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 px-1" [ngClass]="{'text-left': chatService.isMe(msg.senderId), 'text-right': !chatService.isMe(msg.senderId)}">
                            {{ msg.senderName }}
                         </div>
                         <div class="px-3 py-2 rounded-2xl text-sm shadow-sm break-words relative"
                              [ngClass]="{
                                'bg-gradient-to-br from-wushai-cocoa to-wushai-cocoa text-white rounded-tr-none': chatService.isMe(msg.senderId),
                                'bg-white dark:bg-white/10 border border-gray-100 dark:border-white/5 rounded-tl-none text-gray-800 dark:text-gray-200': !chatService.isMe(msg.senderId)
                              }">
                            <!-- Pin indicator -->
                            @if (msg.isPinned) {
                              <div class="absolute -top-1.5 -right-1.5">
                                <span class="text-amber-400 text-[10px]">📌</span>
                              </div>
                            }

                            <!-- Content by type -->
                            @if (msg.messageType === 'image' && msg.fileUrl) {
                              <img [src]="msg.fileUrl" class="rounded-lg max-w-full max-h-48 object-cover mb-1 cursor-pointer" (click)="openImage(msg.fileUrl!)">
                              @if (msg.content) { <p>{{ msg.content }}</p> }
                            } @else if (msg.messageType === 'file' && msg.fileUrl) {
                              <a [href]="msg.fileUrl" target="_blank" class="flex items-center gap-2 p-2 bg-black/10 rounded-lg hover:bg-black/20 transition-colors">
                                <span [innerHTML]="getIcon('File')" class="w-5 h-5 shrink-0"></span>
                                <div class="min-w-0">
                                  <p class="text-xs font-bold truncate">{{ msg.fileName || 'ملف' }}</p>
                                  @if (msg.fileSize) {
                                    <p class="text-[10px] opacity-70">{{ formatFileSize(msg.fileSize) }}</p>
                                  }
                                </div>
                              </a>
                            } @else if (msg.messageType === 'system') {
                              <p class="text-center text-xs italic opacity-70">{{ msg.content }}</p>
                            } @else {
                              {{ msg.content }}
                            }
                         </div>

                         <!-- Reactions -->
                         @if (msg.reactions && hasReactions(msg)) {
                           <div class="flex flex-wrap gap-1 mt-1 px-1">
                             @for (emoji of getReactionEmojis(msg); track emoji) {
                               <button (click)="chatService.toggleReaction(msg.id, emoji)"
                                 class="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] transition-all"
                                 [ngClass]="hasMyReaction(msg, emoji) ? 'bg-wushai-cocoa/20 border border-wushai-cocoa/40' : 'bg-gray-100 dark:bg-white/5 border border-transparent hover:border-gray-300 dark:hover:border-white/20'">
                                 <span>{{ emoji }}</span>
                                 <span class="text-[9px] font-bold text-gray-600 dark:text-gray-300">{{ msg.reactions![emoji].length }}</span>
                               </button>
                             }
                           </div>
                         }

                         <!-- Time + Status -->
                         <div class="text-[9px] text-gray-400 mt-0.5 px-1 flex items-center gap-1" [ngClass]="{'justify-start': chatService.isMe(msg.senderId), 'justify-end': !chatService.isMe(msg.senderId)}">
                            {{ msg.timestamp | date:'shortTime' }}
                            @if (msg.status === 'sending') {
                              <span class="w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                            }
                         </div>
                      </div>

                      <!-- Action buttons (on hover) -->
                      <div class="hidden group-hover:flex items-center gap-0.5 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button (click)="chatService.setReplyTo(msg)" class="w-6 h-6 rounded bg-gray-200/80 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 flex items-center justify-center" title="رد">
                          <span [innerHTML]="getIcon('Reply')" class="w-3 h-3 text-gray-600 dark:text-gray-300"></span>
                        </button>
                        <button (click)="quickReact(msg.id)" class="w-6 h-6 rounded bg-gray-200/80 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 flex items-center justify-center" title="إعجاب">
                          <span class="text-[11px]">❤️</span>
                        </button>
                        <button (click)="chatService.togglePin(msg.id)" class="w-6 h-6 rounded bg-gray-200/80 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 flex items-center justify-center" title="تثبيت">
                          <span [innerHTML]="getIcon('Pin')" class="w-3 h-3 text-gray-600 dark:text-gray-300"></span>
                        </button>
                        @if (chatService.isMe(msg.senderId)) {
                          <button (click)="chatService.deleteMessage(msg.id)" class="w-6 h-6 rounded bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center" title="حذف">
                            <span [innerHTML]="getIcon('Trash')" class="w-3 h-3 text-red-500"></span>
                          </button>
                        }
                      </div>
                   </div>
                 </div>
               }
             }
          </div>

          <!-- Reply Preview -->
          @if (chatService.replyingTo()) {
            <div class="px-3 py-2 bg-wushai-cocoa/10 dark:bg-wushai-cocoa/20 border-t border-wushai-cocoa/20 flex items-center gap-2 animate-slide-down">
              <div class="w-1 h-8 bg-wushai-cocoa rounded-full"></div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-wushai-cocoa">رد على {{ chatService.replyingTo()!.senderName }}</p>
                <p class="text-xs text-gray-600 dark:text-gray-300 truncate">{{ chatService.replyingTo()!.content }}</p>
              </div>
              <button (click)="chatService.setReplyTo(null)" class="text-gray-400 hover:text-gray-600">
                <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
              </button>
            </div>
          }

          <!-- Input Area -->
          <div class="p-3 bg-white dark:bg-[#1C1612] border-t border-gray-100 dark:border-white/10 shrink-0">
             @if (currentUser()) {
                 <form (submit)="sendMessage()" class="flex gap-2 items-end">
                    <!-- Emoji Quick Picker -->
                    <div class="relative">
                      <button type="button" (click)="toggleEmojiPicker()"
                        class="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        <span [innerHTML]="getIcon('Smile')" class="w-4 h-4 text-gray-500"></span>
                      </button>
                      @if (showEmojiPicker()) {
                        <div class="absolute bottom-12 right-0 bg-white dark:bg-[#2a2520] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-2 grid grid-cols-6 gap-1 z-50 animate-slide-up">
                          @for (e of quickEmojis; track e) {
                            <button type="button" (click)="insertEmoji(e)" class="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-lg transition-colors">
                              {{ e }}
                            </button>
                          }
                        </div>
                      }
                    </div>

                    <input type="text" [(ngModel)]="newMessage" name="msg"
                       placeholder="اكتب رسالتك..."
                       (input)="onTyping()"
                       class="flex-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-wushai-cocoa focus:border-transparent outline-none text-sm"
                       autocomplete="off">
                    <button type="submit" [disabled]="!newMessage.trim()"
                       class="w-10 h-10 bg-gradient-to-br from-wushai-cocoa to-wushai-cocoa hover:from-wushai-cocoa hover:to-wushai-cocoa text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90">
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
      </div>
    }
  `,
   styles: [`
    .animate-slide-up {
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-slide-down {
      animation: slideDown 0.2s ease-out;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(157, 139, 177, 0.3); border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(157, 139, 177, 0.6); }
  `]
})
export class ChatWidgetComponent {
   chatService = inject(ChatService);
   private userService = inject(UserService);
   offlineService = inject(OfflineService);
   private sanitizer = inject(DomSanitizer);

   isOpen = signal(false);
   showChannels = signal(true);
   showSearch = signal(false);
   showPinned = signal(false);
   showNewChannel = signal(false);
   showEmojiPicker = signal(false);
   newMessage = '';
   newChannelName = '';
   newChannelIcon = '💬';

   channels = this.chatService.channels;
   activeChannelId = this.chatService.activeChannelId;
   currentUser = this.userService.currentUser;

   channelIcons = ['💬', '🎯', '🎨', '💻', '📋', '🚀', '💡', '📌'];
   quickEmojis = ['❤️', '👍', '😂', '🔥', '👏', '😍', '💯', '✅', '🎉', '⭐', '😊', '🤔'];

   @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

   activeChannelName = computed(() => {
      if (this.activeChannelId() === 'global') return 'مجتمع وشاي';
      return this.chatService.activeChannel()?.name || 'محادثة';
   });

   activeChannelIcon = computed(() => {
      if (this.activeChannelId() === 'global') return '☕';
      return this.chatService.activeChannel()?.icon || '💬';
   });

   displayMessages = computed(() => {
      const q = this.chatService.searchQuery();
      if (q) return this.chatService.searchResults();
      return this.chatService.messages();
   });

   constructor() {
      effect(() => {
         const msgs = this.displayMessages();
         setTimeout(() => this.scrollToBottom(), 100);
      });
   }

   toggleChat() {
      this.isOpen.update(v => !v);
      if (this.isOpen()) {
         this.chatService.markAsRead();
         this.showChannels.set(true);
         setTimeout(() => this.scrollToBottom(), 150);
      }
      this.showEmojiPicker.set(false);
   }

   selectChannel(channelId: string) {
      this.chatService.switchChannel(channelId);
      // On mobile, hide channels sidebar after selection
      if (window.innerWidth < 768) {
         this.showChannels.set(false);
      }
      this.chatService.markAsRead();
      setTimeout(() => this.scrollToBottom(), 150);
   }

   sendMessage() {
      if (!this.newMessage.trim()) return;
      this.chatService.sendMessage(this.newMessage);
      this.newMessage = '';
      this.showEmojiPicker.set(false);
      this.scrollToBottom();
   }

   createChannel() {
      if (!this.newChannelName.trim()) return;
      this.chatService.createChannel(this.newChannelName, 'group', this.newChannelIcon);
      this.newChannelName = '';
      this.newChannelIcon = '💬';
      this.showNewChannel.set(false);
   }

   onTyping() {
      this.chatService.notifyTyping();
   }

   insertEmoji(emoji: string) {
      this.newMessage += emoji;
      this.showEmojiPicker.set(false);
   }

   toggleSearch() { this.showSearch.update(v => !v); }
   togglePinned() { this.showPinned.update(v => !v); }
   toggleChannelsMobile() { this.showChannels.update(v => !v); }
   toggleEmojiPicker() { this.showEmojiPicker.update(v => !v); }

   quickReact(messageId: string) {
      this.chatService.toggleReaction(messageId, '❤️');
   }

   getReplyPreview(replyToId: string): string {
      const msg = this.chatService.messages().find(m => m.id === replyToId);
      if (!msg) return '...';
      return `${msg.senderName}: ${msg.content.slice(0, 40)}`;
   }

   hasReactions(msg: ChatMessage): boolean {
      return !!msg.reactions && Object.keys(msg.reactions).length > 0;
   }

   getReactionEmojis(msg: ChatMessage): string[] {
      return Object.keys(msg.reactions || {});
   }

   hasMyReaction(msg: ChatMessage, emoji: string): boolean {
      const user = this.currentUser();
      if (!user || !msg.reactions) return false;
      return (msg.reactions[emoji] || []).includes(user.id);
   }

   formatFileSize(bytes: number): string {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
   }

   openImage(url: string) {
      window.open(url, '_blank');
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
