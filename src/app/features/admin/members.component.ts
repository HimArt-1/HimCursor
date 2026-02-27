import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/domain/user.service';
import { AuthService } from '../../core/services/domain/auth.service';
import { SupabaseService } from '../../core/services/infra/supabase.service';
import { ToastService } from '../../core/services/state/toast.service';
import { PresenceService } from '../../core/services/state/presence.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

interface MemberInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  avatarColor: string;
  isOnline: boolean;
  lastSeen: string | null;
}

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="animate-fade-in-up">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
          <button (click)="goBack()" class="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <span [innerHTML]="getIcon('ArrowRight')" class="w-5 h-5 text-gray-600 dark:text-wushai-taupe"></span>
          </button>
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-wushai-cream">الأعضاء</h1>
            <p class="text-sm text-gray-500 dark:text-wushai-taupe mt-1">تواصل مع فريقك وتابع حالتهم</p>
          </div>
        </div>
      </div>

      <!-- Online Stats -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="stat-card rounded-xl p-4 text-center">
          <p class="text-xs text-gray-500 dark:text-wushai-taupe">الإجمالي</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-wushai-cream mt-1">{{ members().length }}</p>
        </div>
        <div class="stat-card rounded-xl p-4 text-center">
          <p class="text-xs text-gray-500 dark:text-wushai-taupe">متصل الآن</p>
          <p class="text-2xl font-bold text-wushai-success mt-1">{{ onlineCount() }}</p>
          @if(presenceService.isConnected()) {
            <p class="text-[10px] text-wushai-success mt-0.5 animate-pulse-soft">● مباشر</p>
          }
        </div>
        <div class="stat-card rounded-xl p-4 text-center">
          <p class="text-xs text-gray-500 dark:text-wushai-taupe">غير متصل</p>
          <p class="text-2xl font-bold text-wushai-taupe mt-1">{{ members().length - onlineCount() }}</p>
        </div>
      </div>

      <!-- Search -->
      <div class="mb-4">
        <input type="text" [(ngModel)]="searchQuery" name="search" placeholder="بحث عن عضو..."
          class="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-wushai-sand/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-sand/50 outline-none">
      </div>

      <!-- Members List -->
      <div class="space-y-3">
        @for(member of filteredMembers(); track member.id) {
          <div class="glass-card rounded-xl p-4 hover:shadow-lg transition-all">
            <div class="flex items-center gap-4">
              <!-- Avatar + Status -->
              <div class="relative flex-shrink-0">
                @if(member.avatarUrl) {
                  <img [src]="member.avatarUrl" [alt]="member.name" class="w-12 h-12 rounded-full object-cover border-2 border-wushai-sand/20">
                } @else {
                  <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg border-2 border-wushai-sand/20"
                    [style.background-color]="member.avatarColor">
                    {{ member.name.charAt(0) }}
                  </div>
                }
                <span class="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-wushai-espresso"
                  [ngClass]="member.isOnline ? 'bg-wushai-success animate-pulse-soft' : 'bg-gray-400 dark:bg-wushai-taupe/50'"></span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-sm text-gray-900 dark:text-wushai-cream truncate">{{ member.name }}</h3>
                  @if(member.isOnline) {
                    <span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-wushai-success/20 text-wushai-success animate-pulse-soft">+ متصل</span>
                  }
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    [ngClass]="{
                      'bg-wushai-sand/20 text-wushai-cocoa dark:bg-wushai-sand/10 dark:text-wushai-sand': member.role === 'admin',
                      'bg-wushai-olive/20 text-wushai-olive dark:bg-wushai-olive/10 dark:text-wushai-success': member.role === 'supervisor',
                      'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-wushai-taupe': member.role !== 'admin' && member.role !== 'supervisor'
                    }">{{ roleLabel(member.role) }}</span>
                </div>
                <p class="text-xs text-gray-400 dark:text-wushai-taupe/70 mt-0.5 truncate">{{ member.email }}</p>
                <div class="flex items-center gap-1 mt-1">
                  @if(member.isOnline) {
                    <span class="text-[11px] text-wushai-success font-bold">● متصل الآن</span>
                  } @else if(member.lastSeen) {
                    <span [innerHTML]="getIcon('Clock')" class="w-3 h-3 text-gray-400 dark:text-wushai-taupe/50"></span>
                    <span class="text-[11px] text-gray-400 dark:text-wushai-taupe/50">آخر اتصال: {{ formatLastSeen(member.lastSeen) }}</span>
                  } @else {
                    <span class="text-[11px] text-gray-400 dark:text-wushai-taupe/50">لم يتصل بعد</span>
                  }
                </div>
              </div>

              <!-- Actions -->
              @if(member.id !== currentUserId()) {
                <div class="flex gap-1.5 flex-shrink-0">
                  <button (click)="openSendRequest(member)" title="إرسال طلب"
                    class="p-2.5 rounded-xl bg-wushai-sand/10 hover:bg-wushai-sand/20 text-wushai-cocoa dark:text-wushai-sand transition-colors">
                    <span [innerHTML]="getIcon('Inbox')" class="w-4 h-4"></span>
                  </button>
                  <button (click)="openAssignTask(member)" title="تكليف مهمة"
                    class="p-2.5 rounded-xl bg-wushai-olive/10 hover:bg-wushai-olive/20 text-wushai-olive dark:text-wushai-success transition-colors">
                    <span [innerHTML]="getIcon('CheckCircle')" class="w-4 h-4"></span>
                  </button>
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="text-center py-16 text-gray-400 dark:text-wushai-taupe">
            @if(isLoading()) {
              <div class="w-8 h-8 border-3 border-wushai-sand/20 border-t-wushai-sand rounded-full animate-spin mx-auto mb-3"></div>
              <p>جاري تحميل الأعضاء...</p>
            } @else {
              <span [innerHTML]="getIcon('Users')" class="w-12 h-12 mx-auto opacity-30 mb-3 block"></span>
              <p>لا يوجد أعضاء</p>
            }
          </div>
        }
      </div>

      <!-- Send Request Modal -->
      @if(showRequestModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="closeModals()">
          <div class="bg-white dark:bg-wushai-deep-cocoa rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in" (click)="$event.stopPropagation()">
            <div class="p-5 border-b border-gray-100 dark:border-wushai-sand/10 flex justify-between items-center">
              <div class="flex items-center gap-3">
                <button (click)="closeModals()" class="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                  <span [innerHTML]="getIcon('ArrowRight')" class="w-4 h-4 text-gray-500 dark:text-wushai-taupe"></span>
                </button>
                <h3 class="font-bold text-lg text-gray-900 dark:text-wushai-cream">إرسال طلب إلى {{ selectedMember()?.name }}</h3>
              </div>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-wushai-taupe mb-1">عنوان الطلب</label>
                <input type="text" [(ngModel)]="requestForm.title" name="rTitle"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-wushai-sand/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-sand/30">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-wushai-taupe mb-1">التفاصيل</label>
                <textarea [(ngModel)]="requestForm.description" name="rDesc" rows="4"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-wushai-sand/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-sand/30 resize-none"
                  placeholder="اكتب تفاصيل الطلب..."></textarea>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-wushai-taupe mb-1">الأولوية</label>
                <select [(ngModel)]="requestForm.priority" name="rPriority"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-wushai-sand/10 rounded-xl text-sm outline-none">
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>
              <button (click)="sendRequest()" [disabled]="!requestForm.title"
                class="btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <span [innerHTML]="getIcon('Check')" class="w-4 h-4"></span>
                إرسال الطلب
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Assign Task Modal -->
      @if(showTaskModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="closeModals()">
          <div class="bg-white dark:bg-wushai-deep-cocoa rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in" (click)="$event.stopPropagation()">
            <div class="p-5 border-b border-gray-100 dark:border-wushai-sand/10 flex justify-between items-center">
              <div class="flex items-center gap-3">
                <button (click)="closeModals()" class="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                  <span [innerHTML]="getIcon('ArrowRight')" class="w-4 h-4 text-gray-500 dark:text-wushai-taupe"></span>
                </button>
                <h3 class="font-bold text-lg text-gray-900 dark:text-wushai-cream">تكليف مهمة إلى {{ selectedMember()?.name }}</h3>
              </div>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-wushai-taupe mb-1">عنوان المهمة</label>
                <input type="text" [(ngModel)]="taskForm.title" name="tTitle"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-wushai-sand/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-sand/30">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-wushai-taupe mb-1">الوصف</label>
                <textarea [(ngModel)]="taskForm.description" name="tDesc" rows="4"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-wushai-sand/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-sand/30 resize-none"
                  placeholder="اكتب تفاصيل المهمة..."></textarea>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-wushai-taupe mb-1">الأولوية</label>
                  <select [(ngModel)]="taskForm.priority" name="tPriority"
                    class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-wushai-sand/10 rounded-xl text-sm outline-none">
                    <option value="Low">منخفضة</option>
                    <option value="Medium">متوسطة</option>
                    <option value="High">عالية</option>
                    <option value="Critical">حرجة</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-wushai-taupe mb-1">تاريخ الاستحقاق</label>
                  <input type="date" [(ngModel)]="taskForm.dueDate" name="tDue"
                    class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-wushai-sand/10 rounded-xl text-sm outline-none">
                </div>
              </div>
              <button (click)="assignTask()" [disabled]="!taskForm.title"
                class="btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <span [innerHTML]="getIcon('Check')" class="w-4 h-4"></span>
                تكليف المهمة
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class MembersComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private location = inject(Location);
  presenceService = inject(PresenceService);

  members = signal<MemberInfo[]>([]);
  rawMembers = signal<MemberInfo[]>([]);
  isLoading = signal(true);
  searchQuery = '';
  showRequestModal = signal(false);
  showTaskModal = signal(false);
  selectedMember = signal<MemberInfo | null>(null);

  currentUserId = computed(() => this.authService.activeProfile()?.id || '');
  onlineCount = computed(() => this.members().filter(m => m.isOnline).length);

  filteredMembers = computed(() => {
    const q = this.searchQuery.toLowerCase();
    const list = this.members();
    if (!q) return list;
    return list.filter(m =>
      m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
    );
  });

  requestForm = { title: '', description: '', priority: 'medium' };
  taskForm = { title: '', description: '', priority: 'Medium', dueDate: '' };

  constructor() {
    // React to real-time presence changes
    effect(() => {
      const onlineIds = this.presenceService.onlineUserIds();
      const raw = this.rawMembers();
      if (raw.length === 0) return;

      const updated = raw.map(m => ({
        ...m,
        isOnline: onlineIds.has(m.id)
      }));

      updated.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return a.name.localeCompare(b.name);
      });

      this.members.set(updated);
    });
  }

  ngOnInit() {
    this.loadMembers();
  }

  async loadMembers() {
    const client = this.supabaseService.client;
    if (!client) { this.isLoading.set(false); return; }

    const { data, error } = await client
      .from('profiles')
      .select('id,name,email,role,is_active,avatar_url,avatar_color,last_seen')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Load members error:', error);
      this.isLoading.set(false);
      return;
    }

    if (data) {
      const onlineIds = this.presenceService.onlineUserIds();
      const mapped: MemberInfo[] = data.map((p: any) => ({
        id: p.id,
        name: p.name || 'مستخدم',
        email: p.email || '',
        role: p.role || 'user',
        avatarUrl: p.avatar_url || '',
        avatarColor: p.avatar_color || '#6B705C',
        isOnline: onlineIds.has(p.id),
        lastSeen: p.last_seen
      }));

      mapped.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        return a.name.localeCompare(b.name);
      });

      this.rawMembers.set(mapped);
      this.members.set(mapped);
    }
    this.isLoading.set(false);
  }

  openSendRequest(member: MemberInfo) {
    this.selectedMember.set(member);
    this.requestForm = { title: '', description: '', priority: 'medium' };
    this.showRequestModal.set(true);
  }

  openAssignTask(member: MemberInfo) {
    this.selectedMember.set(member);
    this.taskForm = { title: '', description: '', priority: 'Medium', dueDate: '' };
    this.showTaskModal.set(true);
  }

  closeModals() {
    this.showRequestModal.set(false);
    this.showTaskModal.set(false);
    this.selectedMember.set(null);
  }

  async sendRequest() {
    if (!this.requestForm.title) return;
    const client = this.supabaseService.client;
    const member = this.selectedMember();
    const sender = this.authService.activeProfile();
    if (!client || !member || !sender) return;

    const { error } = await client.from('shared_requests').insert({
      title: this.requestForm.title,
      description: this.requestForm.description,
      priority: this.requestForm.priority,
      status: 'pending',
      requester_id: sender.id,
      requester_name: sender.name,
      assigned_to: member.id,
      assigned_name: member.name,
      category: 'طلب خاص'
    });

    if (error) {
      console.error('Send request error:', error);
      this.toastService.show('خطأ في إرسال الطلب', 'error');
    } else {
      this.toastService.show(`تم إرسال الطلب إلى ${member.name}`, 'success');
      this.closeModals();
    }
  }

  async assignTask() {
    if (!this.taskForm.title) return;
    const client = this.supabaseService.client;
    const member = this.selectedMember();
    const sender = this.authService.activeProfile();
    if (!client || !member || !sender) return;

    const { error } = await client.from('tasks').insert({
      title: this.taskForm.title,
      description: this.taskForm.description,
      priority: this.taskForm.priority,
      status: 'To Do',
      owner: member.name,
      domain: 'تكليف من ' + sender.name,
      due_date: this.taskForm.dueDate || null,
      tags: ['تكليف مباشر']
    });

    if (error) {
      console.error('Assign task error:', error);
      this.toastService.show('خطأ في تكليف المهمة', 'error');
    } else {
      this.toastService.show(`تم تكليف ${member.name} بالمهمة`, 'success');
      this.closeModals();
    }
  }

  formatLastSeen(dt: string): string {
    if (!dt) return '';
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = { admin: 'مدير', supervisor: 'مشرف', user: 'عضو' };
    return map[role] || role;
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  goBack() {
    this.location.back();
  }
}
