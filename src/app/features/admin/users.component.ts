import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DataService, User } from '../../core/services/state/data.service';
import { AuthService } from '../../core/services/domain/auth.service';
import { PermissionsService, ROLES, RoleConfig } from '../../core/services/domain/permissions.service';
import { Icons } from '../../shared/ui/icons';
import { ToastService } from '../../core/services/state/toast.service';

// Avatar colors
const AVATAR_COLORS = [
  '#4B5842', '#6B7049', '#8B9669', // Greens
  '#3E3230', '#5C4B48', '#7A6460', // Browns
  '#2563eb', '#7c3aed', '#db2777', // Blue, Purple, Pink
  '#059669', '#d97706', '#dc2626', // Green, Orange, Red
  '#0891b2', '#4f46e5', '#9333ea', // Cyan, Indigo, Violet
];

// Predefined avatars
const AVATARS = [
  { id: 'default', url: 'assets/avatars/default.svg' },
  { id: 'admin', url: 'assets/avatars/admin.svg' },
  { id: 'haitham', url: 'assets/avatars/haitham.svg' },
  { id: 'hisham', url: 'assets/avatars/hisham.svg' },
  { id: 'qasim', url: 'assets/avatars/qasim.svg' },
];

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-fade-in pb-10">
      <header class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand">إدارة المستخدمين</h2>
          <p class="text-wushai-olive mt-2">تحكم كامل بحسابات الفريق والأمان.</p>
        </div>
        <button (click)="openUserModal(null)" 
          class="bg-wushai-dark hover:bg-wushai-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
          <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span>
          إضافة مستخدم
        </button>
      </header>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-white dark:bg-wushai-surface rounded-2xl border border-wushai-sand shadow-sm p-4">
          <p class="text-xs text-gray-500">إجمالي المستخدمين</p>
          <p class="text-2xl font-bold text-wushai-dark dark:text-wushai-sand">{{ totalUsers() }}</p>
        </div>
        <div class="bg-white dark:bg-wushai-surface rounded-2xl border border-green-200 shadow-sm p-4">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <p class="text-xs text-gray-500">متصل الآن</p>
          </div>
          <p class="text-2xl font-bold text-green-600">{{ onlineUsers() }}</p>
        </div>
        <div class="bg-white dark:bg-wushai-surface rounded-2xl border border-blue-200 shadow-sm p-4">
          <p class="text-xs text-gray-500">نشط</p>
          <p class="text-2xl font-bold text-blue-600">{{ activeUsers() }}</p>
        </div>
        <div class="bg-white dark:bg-wushai-surface rounded-2xl border border-red-200 shadow-sm p-4">
          <p class="text-xs text-gray-500">مُعطل</p>
          <p class="text-2xl font-bold text-red-600">{{ disabledUsers() }}</p>
        </div>
        <div class="bg-white dark:bg-wushai-surface rounded-2xl border border-wushai-sand shadow-sm p-4">
          <p class="text-xs text-gray-500">Admins</p>
          <p class="text-2xl font-bold text-wushai-olive">{{ adminUsers() }}</p>
        </div>
      </div>

      <!-- Search + Filter -->
      <div class="flex flex-col md:flex-row gap-3">
        <div class="relative flex-1">
          <span class="absolute right-3 top-2.5 text-gray-400 w-4 h-4" [innerHTML]="getIcon('Search')"></span>
          <input type="text" 
            placeholder="بحث بالاسم أو الإيميل..." 
            (input)="searchText.set($any($event.target).value)"
            class="w-full pr-9 pl-4 py-2 rounded-xl border border-wushai-sand dark:border-wushai-lilac/20 focus:outline-none focus:border-wushai-olive dark:focus:border-wushai-lilac text-sm bg-white dark:bg-wushai-surface dark:text-white shadow-sm">
        </div>
        <select (change)="statusFilter.set($any($event.target).value)"
          class="bg-white dark:bg-wushai-surface dark:text-wushai-sand border border-wushai-sand dark:border-wushai-lilac/20 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium shadow-sm">
          <option value="All">كل الحالات</option>
          <option value="Online">متصل الآن</option>
          <option value="Active">نشط</option>
          <option value="Disabled">معطل</option>
        </select>
      </div>

      <!-- Users Table -->
      <div class="bg-white dark:bg-wushai-surface border border-wushai-sand dark:border-wushai-lilac/10 rounded-2xl shadow-sm overflow-hidden">
        <table class="w-full text-right">
          <thead class="bg-wushai-light dark:bg-wushai-black border-b border-wushai-sand dark:border-wushai-lilac/10">
            <tr>
              <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">المستخدم</th>
              <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الإيميل</th>
              <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الدور</th>
              <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الاتصال</th>
              <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الحالة</th>
              <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            @for (member of filteredUsers(); track member.id) {
              <tr class="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-wushai-black/30 transition-colors">
                <td class="p-4">
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      @if (member.avatarUrl) {
                        <img [src]="member.avatarUrl" class="w-10 h-10 rounded-full object-cover shadow-sm">
                      } @else {
                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
                             [style.background-color]="member.avatarColor || '#4B5842'">
                          {{ member.name.charAt(0) }}
                        </div>
                      }
                      <!-- Online indicator -->
                      @if (isUserOnline(member)) {
                        <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-wushai-surface rounded-full"></span>
                      }
                    </div>
                    <div>
                      <p class="font-bold text-wushai-dark dark:text-white">{{ member.name }}</p>
                      <p class="text-xs text-gray-500">{{ member.id.substring(0, 8) }}...</p>
                    </div>
                  </div>
                </td>
                <td class="p-4 text-sm text-gray-600 dark:text-gray-400">{{ member.email }}</td>
                <td class="p-4">
                  <span class="text-xs font-bold px-2 py-1 rounded-full"
                        [ngClass]="getRoleBadgeClass(member.role)">
                    {{ permissions.getRoleLabel(member.role) }}
                  </span>
                </td>
                <td class="p-4">
                  @if (isUserOnline(member)) {
                    <span class="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-600 flex items-center gap-1 w-fit">
                      <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      متصل
                    </span>
                  } @else {
                    <span class="text-xs text-gray-400">
                      {{ getLastSeen(member) }}
                    </span>
                  }
                </td>
                <td class="p-4">
                  <span class="text-xs font-bold px-2 py-1 rounded-full"
                        [ngClass]="member.isActive !== false ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'">
                    {{ member.isActive !== false ? 'نشط' : 'معطل' }}
                  </span>
                </td>
                <td class="p-4">
                  <div class="flex items-center gap-1">
                    <button (click)="openUserModal(member)" class="text-gray-400 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-all" title="تعديل">
                      <span [innerHTML]="getIcon('Edit')" class="w-4 h-4"></span>
                    </button>
                    <button (click)="openAvatarModal(member)" class="text-gray-400 hover:text-purple-500 p-2 rounded-full hover:bg-purple-50 transition-all" title="تخصيص الأفاتار">
                      <span [innerHTML]="getIcon('User')" class="w-4 h-4"></span>
                    </button>
                    <button (click)="toggleActive(member)" class="text-gray-400 hover:text-orange-500 p-2 rounded-full hover:bg-orange-50 transition-all" [title]="member.isActive !== false ? 'تعطيل' : 'تفعيل'">
                      <span [innerHTML]="getIcon('Shield')" class="w-4 h-4"></span>
                    </button>
                    <button (click)="confirmDelete(member)" class="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all" title="حذف نهائي">
                      <span [innerHTML]="getIcon('Trash')" class="w-4 h-4"></span>
                    </button>
                  </div>
                </td>
              </tr>
            }
            @if (filteredUsers().length === 0) {
              <tr>
                <td colspan="6" class="p-6 text-center text-gray-400 text-sm">لا يوجد مستخدمون</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Add/Edit User Modal -->
      @if (showUserModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div class="bg-white dark:bg-wushai-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-wushai-sand dark:border-wushai-olive">
            <div class="p-5 border-b border-wushai-sand bg-wushai-light dark:bg-wushai-deep flex justify-between items-center">
              <h3 class="font-bold text-xl text-wushai-dark dark:text-wushai-sand">
                {{ editingUser() ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد' }}
              </h3>
              <button (click)="closeUserModal()" class="text-gray-400 hover:text-red-600 transition-colors">
                <span [innerHTML]="getIcon('X')"></span>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">الاسم</label>
                <input #uName type="text" [value]="editingUser()?.name || ''"
                  class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive bg-gray-50 dark:bg-wushai-deep dark:text-white dark:border-gray-600" placeholder="اسم المستخدم">
              </div>
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">الإيميل</label>
                <input #uEmail type="email" [value]="editingUser()?.email || ''" [disabled]="!!editingUser()"
                  class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive bg-gray-50 dark:bg-wushai-deep dark:text-white dark:border-gray-600 disabled:opacity-50" placeholder="name@company.com">
              </div>
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">الدور</label>
                <select #uRole class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive bg-gray-50 dark:bg-wushai-deep dark:text-white dark:border-gray-600">
                  @for (role of roles; track role.key) {
                    @if (isSystemAdmin() || role.key !== 'system_admin') {
                      <option [value]="role.key" [selected]="normalizeUserRole(editingUser()?.role) === role.key">
                        {{ role.labelAr }} ({{ role.label }})
                      </option>
                    }
                  }
                </select>
                <p class="text-xs text-gray-400 mt-1">{{ getRoleDescription(uRole.value) }}</p>
              </div>
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">{{ editingUser() ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور' }}</label>
                <input #uPassword type="password"
                  class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive bg-gray-50 dark:bg-wushai-deep dark:text-white dark:border-gray-600" placeholder="••••••••">
              </div>

              <button (click)="saveUser(uName.value, uEmail.value, uRole.value, uPassword.value)"
                class="w-full bg-wushai-dark text-white py-3 rounded-xl font-bold hover:bg-wushai-black transition-all mt-2 shadow-lg">
                حفظ البيانات
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div class="bg-white dark:bg-wushai-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-red-200 dark:border-red-900">
            <div class="p-5 border-b border-red-100 bg-red-50 dark:bg-red-900/20 flex justify-between items-center">
              <h3 class="font-bold text-xl text-red-700 dark:text-red-400 flex items-center gap-2">
                <span [innerHTML]="getIcon('Trash')" class="w-5 h-5"></span>
                تأكيد الحذف
              </h3>
              <button (click)="closeDeleteModal()" class="text-gray-400 hover:text-red-600 transition-colors">
                <span [innerHTML]="getIcon('X')"></span>
              </button>
            </div>
            <div class="p-6 text-center">
              <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span [innerHTML]="getIcon('Trash')" class="w-10 h-10 text-red-500"></span>
              </div>
              <p class="text-lg font-bold text-wushai-dark dark:text-white mb-2">
                هل تريد حذف هذا المستخدم نهائياً؟
              </p>
              <p class="text-gray-500 mb-2">
                <span class="font-bold text-red-600">{{ deletingUser()?.name }}</span>
              </p>
              <p class="text-sm text-gray-400">
                {{ deletingUser()?.email }}
              </p>
              <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-4 text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه! سيتم حذف الحساب نهائياً من النظام.
              </div>
            </div>
            <div class="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button (click)="closeDeleteModal()"
                class="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                إلغاء
              </button>
              <button (click)="deleteUser()"
                class="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                <span [innerHTML]="getIcon('Trash')" class="w-4 h-4"></span>
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Avatar Customization Modal -->
      @if (showAvatarModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div class="bg-white dark:bg-wushai-surface rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-wushai-sand dark:border-wushai-olive">
            <div class="p-5 border-b border-wushai-sand bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 flex justify-between items-center">
              <h3 class="font-bold text-xl text-wushai-dark dark:text-wushai-sand flex items-center gap-2">
                <span [innerHTML]="getIcon('User')" class="w-5 h-5"></span>
                تخصيص الأفاتار
              </h3>
              <button (click)="closeAvatarModal()" class="text-gray-400 hover:text-red-600 transition-colors">
                <span [innerHTML]="getIcon('X')"></span>
              </button>
            </div>
            <div class="p-6 space-y-6">
              <!-- Preview -->
              <div class="flex justify-center">
                <div class="relative">
                  @if (selectedAvatarUrl()) {
                    <img [src]="selectedAvatarUrl()" class="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white">
                  } @else {
                    <div class="w-24 h-24 rounded-full flex items-center justify-center font-bold text-white text-4xl shadow-lg border-4 border-white"
                         [style.background-color]="selectedColor()">
                      {{ avatarEditingUser()?.name?.charAt(0) || 'U' }}
                    </div>
                  }
                </div>
              </div>

              <!-- Avatar Selection -->
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-3">اختر أفاتار</label>
                <div class="flex flex-wrap gap-3 justify-center">
                  <button (click)="selectAvatar('')" 
                    class="w-14 h-14 rounded-full border-2 transition-all flex items-center justify-center font-bold text-white text-xl"
                    [style.background-color]="selectedColor()"
                    [class.border-wushai-olive]="!selectedAvatarUrl()"
                    [class.border-transparent]="selectedAvatarUrl()"
                    [class.ring-2]="!selectedAvatarUrl()"
                    [class.ring-wushai-olive]="!selectedAvatarUrl()">
                    {{ avatarEditingUser()?.name?.charAt(0) || 'U' }}
                  </button>
                  @for (avatar of avatars; track avatar.id) {
                    <button (click)="selectAvatar(avatar.url)" 
                      class="w-14 h-14 rounded-full border-2 transition-all overflow-hidden"
                      [class.border-wushai-olive]="selectedAvatarUrl() === avatar.url"
                      [class.border-transparent]="selectedAvatarUrl() !== avatar.url"
                      [class.ring-2]="selectedAvatarUrl() === avatar.url"
                      [class.ring-wushai-olive]="selectedAvatarUrl() === avatar.url">
                      <img [src]="avatar.url" class="w-full h-full object-cover">
                    </button>
                  }
                </div>
              </div>

              <!-- Color Selection -->
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-3">اختر لون الخلفية</label>
                <div class="flex flex-wrap gap-2 justify-center">
                  @for (color of avatarColors; track color) {
                    <button (click)="selectColor(color)" 
                      class="w-8 h-8 rounded-full border-2 transition-all"
                      [style.background-color]="color"
                      [class.border-white]="selectedColor() === color"
                      [class.ring-2]="selectedColor() === color"
                      [class.ring-offset-2]="selectedColor() === color"
                      [class.ring-wushai-dark]="selectedColor() === color"
                      [class.border-transparent]="selectedColor() !== color">
                    </button>
                  }
                </div>
              </div>

              <button (click)="saveAvatar()"
                class="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center justify-center gap-2">
                <span [innerHTML]="getIcon('Check')" class="w-5 h-5"></span>
                حفظ التخصيص
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  private sanitizer = inject(DomSanitizer);
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  public permissions = inject(PermissionsService);
  private toastService = inject(ToastService);

  // Roles
  roles = ROLES;
  isSystemAdmin = this.permissions.isSystemAdmin;
  canManageUsers = this.permissions.canManageUsers;

  searchText = signal('');
  statusFilter = signal<'All' | 'Online' | 'Active' | 'Disabled'>('All');
  loading = signal(true);

  // Avatar customization
  avatarColors = AVATAR_COLORS;
  avatars = AVATARS;
  showAvatarModal = signal(false);
  avatarEditingUser = signal<User | null>(null);
  selectedColor = signal('#4B5842');
  selectedAvatarUrl = signal('');

  // Online status refresh
  private refreshInterval: any;

  ngOnInit() {
    this.loadUsersData();
    // Refresh online status every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadUsersData();
    }, 30000);

    // Update current user's last_seen
    this.updateLastSeen();
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadUsersData() {
    this.loading.set(true);
    await this.dataService.loadAdminUsers();
    this.loading.set(false);
  }

  async updateLastSeen() {
    const currentUser = this.authService.activeProfile();
    if (currentUser) {
      await this.dataService.user.updateLastSeen(currentUser.id);
    }
  }

  availableUsers = this.dataService.availableUsers;
  showUserModal = signal(false);
  editingUser = signal<User | null>(null);

  totalUsers = computed(() => this.availableUsers().length);
  onlineUsers = computed(() => this.availableUsers().filter(u => this.isUserOnline(u)).length);
  activeUsers = computed(() => this.availableUsers().filter(u => u.isActive !== false).length);
  disabledUsers = computed(() => this.availableUsers().filter(u => u.isActive === false).length);
  adminUsers = computed(() => this.availableUsers().filter(u => this.isAdmin(u)).length);

  filteredUsers = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const status = this.statusFilter();
    return this.availableUsers()
      .filter(u => {
        const matchesSearch = !search || u.name.toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search);
        let matchesStatus = true;
        if (status === 'Online') matchesStatus = this.isUserOnline(u);
        else if (status === 'Active') matchesStatus = u.isActive !== false;
        else if (status === 'Disabled') matchesStatus = u.isActive === false;
        return matchesSearch && matchesStatus;
      });
  });

  isUserOnline(user: User | null): boolean {
    if (!user) return false;
    const lastSeen = (user as any).lastSeen || (user as any).last_seen;
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffMinutes < 5; // Online if seen within 5 minutes
  }

  getLastSeen(user: User): string {
    const lastSeen = (user as any).lastSeen || (user as any).last_seen;
    if (!lastSeen) return 'غير معروف';
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    return `منذ ${diffDays} يوم`;
  }

  isAdmin(user: User | null): boolean {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'admin' || role === 'system_admin' || role === 'system admin';
  }

  normalizeUserRole(role: string | undefined): string {
    return this.permissions.normalizeRole(role);
  }

  getRoleDescription(roleKey: string): string {
    const role = this.roles.find(r => r.key === roleKey);
    return role?.description || '';
  }

  getRoleBadgeClass(role: string): string {
    const normalized = this.permissions.normalizeRole(role);
    switch (normalized) {
      case 'system_admin': return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
      case 'admin': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
      case 'member': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
      case 'viewer': return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-50 text-gray-600';
    }
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  // User Modal
  openUserModal(user: User | null) {
    this.editingUser.set(user);
    this.showUserModal.set(true);
  }

  closeUserModal() {
    this.showUserModal.set(false);
    this.editingUser.set(null);
  }

  async saveUser(name: string, email: string, role: string, password: string) {
    if (!name || !email || !role) {
      this.toastService.show('الرجاء تعبئة جميع البيانات', 'error');
      return;
    }

    if (this.editingUser()) {
      await this.dataService.updateUserProfile(this.editingUser()!.id, { name, role });
      if (password) {
        await this.dataService.user.resetPassword(this.editingUser()!.id, password);
      }
      this.toastService.show('تم تحديث المستخدم', 'success');
    } else {
      if (!password) {
        this.toastService.show('كلمة المرور مطلوبة للمستخدم الجديد', 'error');
        return;
      }
      const newUser: User = {
        id: `u${Date.now()}`,
        name,
        email,
        role,
        password
      };
      await this.dataService.addUser(newUser);
      this.toastService.show('تم إضافة المستخدم', 'success');
    }
    await this.loadUsersData();
    this.closeUserModal();
  }

  async toggleActive(user: User) {
    await this.dataService.user.setUserActive(user.id, user.isActive === false);
    this.toastService.show(user.isActive === false ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم', 'info');
    await this.loadUsersData();
  }

  // Delete Confirmation
  showDeleteModal = signal(false);
  deletingUser = signal<User | null>(null);

  confirmDelete(user: User) {
    this.deletingUser.set(user);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.deletingUser.set(null);
  }

  async deleteUser() {
    const user = this.deletingUser();
    if (!user) return;

    const success = await this.dataService.user.deleteUser(user.id);
    if (success) {
      this.toastService.show(`تم حذف ${user.name} نهائياً`, 'info');
    }
    this.closeDeleteModal();
  }

  // Avatar Modal
  openAvatarModal(user: User) {
    this.avatarEditingUser.set(user);
    this.selectedColor.set(user.avatarColor || '#4B5842');
    this.selectedAvatarUrl.set(user.avatarUrl || '');
    this.showAvatarModal.set(true);
  }

  closeAvatarModal() {
    this.showAvatarModal.set(false);
    this.avatarEditingUser.set(null);
  }

  selectColor(color: string) {
    this.selectedColor.set(color);
  }

  selectAvatar(url: string) {
    this.selectedAvatarUrl.set(url);
  }

  async saveAvatar() {
    const user = this.avatarEditingUser();
    if (!user) return;

    await this.dataService.updateUserProfile(user.id, {
      avatarColor: this.selectedColor(),
      avatarUrl: this.selectedAvatarUrl()
    });
    
    this.toastService.show('تم تحديث الأفاتار', 'success');
    await this.loadUsersData();
    this.closeAvatarModal();
  }
}
