import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DataService, User } from '../../core/services/state/data.service';
import { AuthService } from '../../core/services/domain/auth.service';
import { Icons } from '../../shared/ui/icons';

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
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-wushai-surface rounded-2xl border border-wushai-sand shadow-sm p-4">
          <p class="text-xs text-gray-500">إجمالي المستخدمين</p>
          <p class="text-2xl font-bold text-wushai-dark dark:text-wushai-sand">{{ totalUsers() }}</p>
        </div>
        <div class="bg-white dark:bg-wushai-surface rounded-2xl border border-green-200 shadow-sm p-4">
          <p class="text-xs text-gray-500">نشط</p>
          <p class="text-2xl font-bold text-green-600">{{ activeUsers() }}</p>
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
              <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الحالة</th>
              <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            @for (member of filteredUsers(); track member.id) {
              <tr class="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-wushai-black/30 transition-colors">
                <td class="p-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
                         [style.background-color]="member.avatarColor || '#4B5842'">
                      {{ member.name.charAt(0) }}
                    </div>
                    <div>
                      <p class="font-bold text-wushai-dark dark:text-white">{{ member.name }}</p>
                      <p class="text-xs text-gray-500">{{ member.id }}</p>
                    </div>
                  </div>
                </td>
                <td class="p-4 text-sm text-gray-600 dark:text-gray-400">{{ member.email }}</td>
                <td class="p-4 text-sm text-gray-600 dark:text-gray-400">{{ member.role }}</td>
                <td class="p-4">
                  <span class="text-xs font-bold px-2 py-1 rounded-full"
                        [ngClass]="member.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
                    {{ member.isActive ? 'نشط' : 'معطل' }}
                  </span>
                </td>
                <td class="p-4">
                  <div class="flex items-center gap-2">
                    <button (click)="openUserModal(member)" class="text-gray-400 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-all">
                      <span [innerHTML]="getIcon('Edit')" class="w-4 h-4"></span>
                    </button>
                    <button (click)="toggleActive(member)" class="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all">
                      <span [innerHTML]="getIcon('Shield')" class="w-4 h-4"></span>
                    </button>
                  </div>
                </td>
              </tr>
            }
            @if (filteredUsers().length === 0) {
              <tr>
                <td colspan="5" class="p-6 text-center text-gray-400 text-sm">لا يوجد مستخدمون</td>
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
                <input #uEmail type="email" [value]="editingUser()?.email || ''"
                  class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive bg-gray-50 dark:bg-wushai-deep dark:text-white dark:border-gray-600" placeholder="name@company.com">
              </div>
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">الدور</label>
                <input #uRole type="text" [value]="editingUser()?.role || ''"
                  class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive bg-gray-50 dark:bg-wushai-deep dark:text-white dark:border-gray-600" placeholder="admin / supervisor / user">
              </div>
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">كلمة المرور</label>
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
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private dataService = inject(DataService);
  private authService = inject(AuthService);

  searchText = signal('');
  statusFilter = signal<'All' | 'Active' | 'Disabled'>('All');
  loading = signal(true);

  ngOnInit() {
    this.loadUsersData();
  }

  async loadUsersData() {
    this.loading.set(true);
    await this.dataService.loadAdminUsers();
    this.loading.set(false);
  }

  availableUsers = this.dataService.availableUsers;

  showUserModal = signal(false);
  editingUser = signal<User | null>(null);

  totalUsers = computed(() => this.availableUsers().length);
  activeUsers = computed(() => this.availableUsers().filter(u => u.isActive !== false).length);
  disabledUsers = computed(() => this.availableUsers().filter(u => u.isActive === false).length);
  adminUsers = computed(() => this.availableUsers().filter(u => (u.role || '').toLowerCase() === 'admin').length);

  filteredUsers = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const status = this.statusFilter();
    return this.availableUsers()
      .filter(u => {
        const matchesSearch = !search || u.name.toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search);
        const matchesStatus = status === 'All' || (status === 'Active' ? u.isActive !== false : u.isActive === false);
        return matchesSearch && matchesStatus;
      });
  });

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

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
      alert('الرجاء تعبئة جميع البيانات');
      return;
    }

    if (this.editingUser()) {
      await this.dataService.updateUserProfile(this.editingUser()!.id, { name, role });
      if (password) {
        await this.dataService.user.resetPassword(this.editingUser()!.id, password);
      }
    } else {
      const newUser: User = {
        id: `u${Date.now()}`,
        name,
        email,
        role,
        password
      };
      await this.dataService.addUser(newUser);
    }
    this.closeUserModal();
  }

  async toggleActive(user: User) {
    await this.dataService.user.setUserActive(user.id, !user.isActive);
  }
}
