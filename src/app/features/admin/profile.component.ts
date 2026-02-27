import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/domain/user.service';
import { AuthService } from '../../core/services/domain/auth.service';
import { SupabaseService } from '../../core/services/infra/supabase.service';
import { ToastService } from '../../core/services/state/toast.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="max-w-2xl mx-auto animate-fade-in-up">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">الملف الشخصي</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">إدارة معلومات حسابك وصورة العرض</p>
      </div>

      <!-- Profile Card -->
      <div class="glass-card rounded-2xl overflow-hidden">
        <!-- Banner -->
        <div class="h-32 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative">
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>

        <!-- Avatar Section -->
        <div class="px-6 pb-6 -mt-16 relative">
          <div class="flex flex-col md:flex-row items-center md:items-end gap-4">
            <!-- Avatar -->
            <div class="relative group">
              <div class="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-[#1e1a2e] shadow-xl bg-gradient-to-br from-violet-400 to-purple-500">
                @if(avatarUrl()) {
                  <img [src]="avatarUrl()" class="w-full h-full object-cover" alt="الصورة الشخصية">
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-4xl font-bold text-white">
                    {{ userName().charAt(0) }}
                  </div>
                }
              </div>
              <!-- Upload Overlay -->
              <label class="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100">
                <span [innerHTML]="getIcon('Upload')" class="w-6 h-6 text-white"></span>
                <input type="file" accept="image/*" class="hidden" (change)="onAvatarSelected($event)">
              </label>
              @if(isUploading()) {
                <div class="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                  <div class="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              }
            </div>

            <!-- User Info -->
            <div class="flex-1 text-center md:text-right pb-2">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ userName() }}</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ userEmail() }}</p>
              <span class="inline-block mt-1 px-3 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-full">
                {{ userRole() }}
              </span>
            </div>

            @if(lastSeen()) {
              <div class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 pb-3">
                <span [innerHTML]="getIcon('Clock')" class="w-3.5 h-3.5"></span>
                آخر اتصال: {{ lastSeen() | date:'short' }}
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Edit Form -->
      <div class="glass-card rounded-2xl p-6 mt-6">
        <h3 class="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span [innerHTML]="getIcon('Edit')" class="w-5 h-5 text-violet-500"></span>
          تعديل المعلومات
        </h3>

        <div class="space-y-4">
          <!-- Display Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم العرض</label>
            <input type="text" [(ngModel)]="editName" name="editName"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
              placeholder="أدخل اسم العرض">
          </div>

          <!-- Email (read-only) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
            <input type="text" [value]="userEmail()" disabled
              class="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-400 cursor-not-allowed">
          </div>

          <button (click)="saveProfile()" [disabled]="isSaving()"
            class="btn-primary w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            @if(isSaving()) {
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              جاري الحفظ...
            } @else {
              <span [innerHTML]="getIcon('Check')" class="w-4 h-4"></span>
              حفظ التغييرات
            }
          </button>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="glass-card rounded-2xl p-6 mt-6 border border-red-200 dark:border-red-500/20">
        <h3 class="font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
          <span [innerHTML]="getIcon('Alert')" class="w-5 h-5"></span>
          تغيير كلمة المرور
        </h3>
        <div class="flex gap-3">
          <input type="password" [(ngModel)]="newPassword" name="newPassword"
            class="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            placeholder="كلمة المرور الجديدة">
          <button (click)="changePassword()" [disabled]="!newPassword || isSaving()"
            class="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
            تغيير
          </button>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent {
    private userService = inject(UserService);
    private authService = inject(AuthService);
    private supabaseService = inject(SupabaseService);
    private toastService = inject(ToastService);
    private sanitizer = inject(DomSanitizer);

    editName = '';
    newPassword = '';
    isUploading = signal(false);
    isSaving = signal(false);

    userName = computed(() => this.userService.currentUser()?.name || 'مستخدم');
    userEmail = computed(() => this.userService.currentUser()?.email || '');
    userRole = computed(() => this.userService.currentUser()?.role || 'user');
    avatarUrl = computed(() => this.userService.currentUser()?.avatarUrl || '');
    lastSeen = signal<string | null>(null);

    constructor() {
        // Pre-fill the edit name
        const user = this.userService.currentUser();
        if (user) this.editName = user.name;
        this.loadLastSeen();
    }

    async loadLastSeen() {
        const client = this.supabaseService.client;
        if (!client) return;
        const profile = this.authService.activeProfile();
        if (!profile) return;

        // Update last_seen
        await client.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profile.id);

        const { data } = await client.from('profiles').select('last_seen').eq('id', profile.id).single();
        if (data?.last_seen) this.lastSeen.set(data.last_seen);
    }

    async onAvatarSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.isUploading.set(true);
        const client = this.supabaseService.client;
        if (!client) { this.isUploading.set(false); return; }

        const userId = this.authService.activeProfile()?.id;
        if (!userId) { this.isUploading.set(false); return; }

        const ext = file.name.split('.').pop();
        const path = `${userId}/avatar.${ext}`;

        const { error: uploadErr } = await client.storage.from('avatars').upload(path, file, { upsert: true });
        if (uploadErr) {
            console.error('Avatar upload error:', uploadErr);
            this.toastService.show('خطأ في رفع الصورة', 'error');
            this.isUploading.set(false);
            return;
        }

        const { data: urlData } = client.storage.from('avatars').getPublicUrl(path);
        const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

        await this.userService.updateUserProfile(userId, { avatarUrl });
        this.toastService.show('تم تحديث صورة العرض', 'success');
        this.isUploading.set(false);
    }

    async saveProfile() {
        if (!this.editName.trim()) return;
        this.isSaving.set(true);

        const userId = this.authService.activeProfile()?.id;
        if (!userId) { this.isSaving.set(false); return; }

        await this.userService.updateUserProfile(userId, { name: this.editName.trim() });
        this.toastService.show('تم تحديث الملف الشخصي', 'success');
        this.isSaving.set(false);
    }

    async changePassword() {
        if (!this.newPassword) return;
        this.isSaving.set(true);

        const userId = this.authService.activeProfile()?.id;
        if (!userId) { this.isSaving.set(false); return; }

        await this.userService.resetPassword(userId, this.newPassword);
        this.newPassword = '';
        this.isSaving.set(false);
    }

    getIcon(name: keyof typeof Icons): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
    }
}
