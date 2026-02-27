import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
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
      <div class="mb-8 flex items-center gap-3">
        <button (click)="goBack()" class="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
          <span [innerHTML]="getIcon('ArrowRight')" class="w-5 h-5 text-gray-600 dark:text-gray-300"></span>
        </button>
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">الملف الشخصي</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">إدارة معلومات حسابك وصورة العرض</p>
        </div>
      </div>

      <!-- Profile Card -->
      <div class="glass-card rounded-2xl overflow-hidden">
        <!-- Banner -->
        <div class="h-32 bg-gradient-to-br from-wushai-cocoa via-wushai-cocoa to-wushai-olive relative">
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>

        <!-- Avatar Section -->
        <div class="px-6 pb-6 -mt-16 relative">
          <div class="flex flex-col md:flex-row items-center md:items-end gap-4">
            <!-- Avatar -->
            <div class="relative group">
              <div class="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-[#1C1612] shadow-xl bg-gradient-to-br from-wushai-sand to-wushai-cocoa">
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
              <span class="inline-block mt-1 px-3 py-0.5 bg-wushai-sand/20 dark:bg-wushai-cocoa/20 text-wushai-cocoa dark:text-wushai-sand text-xs font-bold rounded-full">
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
          <span [innerHTML]="getIcon('Edit')" class="w-5 h-5 text-wushai-cocoa"></span>
          تعديل المعلومات
        </h3>

        <div class="space-y-4">
          <!-- Display Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم العرض</label>
            <input type="text" [(ngModel)]="editName" name="editName"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-cocoa focus:border-transparent outline-none transition-all"
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
  private location = inject(Location);

  editName = '';
  newPassword = '';
  isUploading = signal(false);
  isSaving = signal(false);

  userName = computed(() => this.authService.activeProfile()?.name || 'مستخدم');
  userEmail = computed(() => this.authService.activeProfile()?.email || this.userService.currentUser()?.email || '');
  userRole = computed(() => this.authService.activeProfile()?.role || 'user');
  avatarUrl = computed(() => this.authService.activeProfile()?.avatar_url || this.userService.currentUser()?.avatarUrl || '');
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

    try {
      // Compress and convert to base64 (max 200x200)
      const dataUrl = await this.compressImage(file, 200, 0.7);

      // Update profiles table directly (RLS allows user to update own row)
      const { error } = await client
        .from('profiles')
        .update({ avatar_url: dataUrl })
        .eq('id', userId);

      if (error) {
        console.error('Avatar update error:', error);
        this.toastService.show('خطأ في تحديث الصورة', 'error');
      } else {
        this.toastService.show('تم تحديث صورة العرض', 'success');
        // Refresh the auth profile to reflect the change
        this.authService.refreshProfile();
      }
    } catch (err) {
      console.error('Image processing error:', err);
      this.toastService.show('خطأ في معالجة الصورة', 'error');
    }
    this.isUploading.set(false);
  }

  private compressImage(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
          else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async saveProfile() {
    if (!this.editName.trim()) return;
    this.isSaving.set(true);

    const client = this.supabaseService.client;
    const userId = this.authService.activeProfile()?.id;
    if (!client || !userId) { this.isSaving.set(false); return; }

    const { error } = await client
      .from('profiles')
      .update({ name: this.editName.trim() })
      .eq('id', userId);

    if (error) {
      console.error('Profile update error:', error);
      this.toastService.show('خطأ في تحديث الملف الشخصي', 'error');
    } else {
      this.toastService.show('تم تحديث الملف الشخصي', 'success');
      this.authService.refreshProfile();
    }
    this.isSaving.set(false);
  }

  async changePassword() {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.toastService.show('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }
    this.isSaving.set(true);

    const client = this.supabaseService.client;
    if (!client) { this.isSaving.set(false); return; }

    const { error } = await client.auth.updateUser({ password: this.newPassword });
    if (error) {
      console.error('Password change error:', error);
      this.toastService.show('خطأ في تغيير كلمة المرور', 'error');
    } else {
      this.toastService.show('تم تغيير كلمة المرور بنجاح', 'success');
      this.newPassword = '';
    }
    this.isSaving.set(false);
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  goBack() {
    this.location.back();
  }
}
