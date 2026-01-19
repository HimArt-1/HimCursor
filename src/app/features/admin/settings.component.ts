

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DataService, User } from '../../core/services/state/data.service';
import { Icons } from '../../shared/ui/icons';

@Component({
   selector: 'app-settings',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-8 animate-fade-in pb-10">
      <header>
         <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand">الإعدادات (Settings)</h2>
         <p class="text-wushai-olive mt-2">تخصيص التطبيق، الملف الشخصي، وإدارة الفريق.</p>
      </header>

      <div class="bg-white dark:bg-wushai-surface dark:border-wushai-olive rounded-2xl border border-wushai-sand shadow-sm overflow-hidden min-h-[500px] transition-colors duration-300">
         <!-- Tabs Header -->
         <div class="flex border-b border-wushai-sand dark:border-wushai-olive bg-wushai-light/30 dark:bg-wushai-deep/30 overflow-x-auto">
            <button (click)="activeTab.set('Profile')" 
               class="px-8 py-4 text-sm font-bold transition-all relative overflow-hidden group whitespace-nowrap"
               [ngClass]="activeTab() === 'Profile' ? 'text-wushai-dark dark:text-wushai-sand bg-white dark:bg-wushai-surface' : 'text-gray-500 hover:text-wushai-dark hover:bg-white/50 dark:hover:bg-wushai-surface/50'">
               الملف الشخصي
               @if(activeTab() === 'Profile') { <div class="absolute bottom-0 left-0 w-full h-0.5 bg-wushai-dark dark:bg-wushai-sand"></div> }
            </button>
            <button (click)="activeTab.set('General')" 
               class="px-8 py-4 text-sm font-bold transition-all relative overflow-hidden group whitespace-nowrap"
               [ngClass]="activeTab() === 'General' ? 'text-wushai-dark dark:text-wushai-sand bg-white dark:bg-wushai-surface' : 'text-gray-500 hover:text-wushai-dark hover:bg-white/50 dark:hover:bg-wushai-surface/50'">
               عام
               @if(activeTab() === 'General') { <div class="absolute bottom-0 left-0 w-full h-0.5 bg-wushai-dark dark:bg-wushai-sand"></div> }
            </button>
            <button (click)="activeTab.set('Team')" 
               class="px-8 py-4 text-sm font-bold transition-all relative overflow-hidden group whitespace-nowrap"
               [ngClass]="activeTab() === 'Team' ? 'text-wushai-dark dark:text-wushai-sand bg-white dark:bg-wushai-surface' : 'text-gray-500 hover:text-wushai-dark hover:bg-white/50 dark:hover:bg-wushai-surface/50'">
               الفريق
               @if(activeTab() === 'Team') { <div class="absolute bottom-0 left-0 w-full h-0.5 bg-wushai-dark dark:bg-wushai-sand"></div> }
            </button>
            <button (click)="activeTab.set('Rules')" 
               class="px-8 py-4 text-sm font-bold transition-all relative overflow-hidden group whitespace-nowrap"
               [ngClass]="activeTab() === 'Rules' ? 'text-wushai-dark dark:text-wushai-sand bg-white dark:bg-wushai-surface' : 'text-gray-500 hover:text-wushai-dark hover:bg-white/50 dark:hover:bg-wushai-surface/50'">
               النزاهة والتتبع
               @if(activeTab() === 'Rules') { <div class="absolute bottom-0 left-0 w-full h-0.5 bg-wushai-dark dark:bg-wushai-sand"></div> }
            </button>
         </div>

         <div class="p-8">
            @switch (activeTab()) {
               @case ('Profile') {
                  <div class="space-y-8 animate-fade-in max-w-2xl">
                     <div class="flex items-center gap-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                        <div class="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-xl border-4 border-white dark:border-gray-800"
                             [style.background-color]="selectedColor()">
                           {{ currentUser()?.name?.charAt(0) }}
                        </div>
                        <div>
                           <h3 class="text-2xl font-bold text-wushai-dark dark:text-white">{{ currentUser()?.name }}</h3>
                           <p class="text-wushai-olive">{{ currentUser()?.role }}</p>
                        </div>
                     </div>

                     <!-- Avatar Color Picker -->
                     <div>
                        <label class="block text-sm font-bold text-wushai-dark dark:text-wushai-sand mb-3">لون الأفاتار (Avatar Color)</label>
                        <div class="flex gap-3 flex-wrap">
                           @for(color of colors; track color) {
                              <button (click)="selectedColor.set(color)"
                                      class="w-10 h-10 rounded-full border-2 transition-all hover:scale-110"
                                      [class.border-gray-800]="selectedColor() === color"
                                      [class.border-transparent]="selectedColor() !== color"
                                      [style.background-color]="color">
                              </button>
                           }
                        </div>
                     </div>

                     <!-- PIN Update -->
                     <div>
                        <label class="block text-sm font-bold text-wushai-dark dark:text-wushai-sand mb-2">رمز الدخول (PIN)</label>
                        <p class="text-xs text-gray-500 mb-2">استخدم هذا الرمز للدخول إلى النظام.</p>
                        <input #pinInput type="text" maxlength="6" [value]="currentUser()?.pin" 
                               class="w-full md:w-1/2 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-wushai-deep dark:text-white focus:border-wushai-olive focus:outline-none font-mono text-center tracking-[0.5em] text-xl">
                     </div>

                     <div class="pt-4">
                        <button (click)="saveProfile(pinInput.value)" 
                           class="bg-wushai-dark text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center gap-2">
                           <span [innerHTML]="getIcon('Check')"></span> حفظ التغييرات
                        </button>
                     </div>
                  </div>
               }

               @case ('General') {
                  <div class="space-y-8 animate-fade-in">
                     <!-- Appearance -->
                     <section>
                        <h3 class="text-lg font-bold text-wushai-deep dark:text-wushai-sand mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">المظهر</h3>
                        <div (click)="toggleDarkMode()" class="flex items-center justify-between p-5 bg-gray-50 dark:bg-wushai-deep rounded-xl border border-gray-100 dark:border-gray-700 hover:border-wushai-sand cursor-pointer transition-colors">
                           <div class="flex items-center gap-4">
                              <div class="p-3 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                              </div>
                              <div>
                                 <p class="font-bold text-gray-800 dark:text-white">الوضع الليلي (Dark Mode)</p>
                                 <p class="text-xs text-gray-500 dark:text-gray-400">تبديل واجهة التطبيق إلى الألوان الداكنة لراحة العين.</p>
                              </div>
                           </div>
                           <div class="w-12 h-6 rounded-full relative transition-colors" [ngClass]="isDarkMode() ? 'bg-wushai-olive' : 'bg-gray-300'">
                              <div class="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all" [ngClass]="isDarkMode() ? 'left-[26px]' : 'left-0.5'"></div>
                           </div>
                        </div>
                     </section>

                     <!-- Notifications -->
                     <section>
                        <h3 class="text-lg font-bold text-wushai-deep dark:text-wushai-sand mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">الإشعارات</h3>
                        <div class="space-y-3">
                           <label class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-wushai-deep/50 rounded-lg cursor-pointer transition-colors">
                              <input type="checkbox" checked class="w-5 h-5 accent-wushai-olive rounded cursor-pointer">
                              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">تنبيه عند إنشاء مهمة جديدة</span>
                           </label>
                           <label class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-wushai-deep/50 rounded-lg cursor-pointer transition-colors">
                              <input type="checkbox" checked class="w-5 h-5 accent-wushai-olive rounded cursor-pointer">
                              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">تنبيه عند فشل اختبار (Traceability Fail)</span>
                           </label>
                           <label class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-wushai-deep/50 rounded-lg cursor-pointer transition-colors">
                              <input type="checkbox" class="w-5 h-5 accent-wushai-olive rounded cursor-pointer">
                              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">تنبيهات البريد الإلكتروني الأسبوعية</span>
                           </label>
                        </div>
                     </section>

                     <!-- Data Management -->
                     <section>
                        <h3 class="text-lg font-bold text-wushai-deep dark:text-wushai-sand mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">المنطقة الخطرة</h3>
                        <div class="p-6 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                           <p class="text-sm text-red-800 dark:text-red-300 font-bold mb-4">نسخ واستعادة البيانات</p>
                           <div class="flex flex-wrap gap-4">
                              <button (click)="exportData()" class="px-5 py-2.5 bg-wushai-olive text-white rounded-lg text-sm font-bold hover:bg-wushai-dark transition-all shadow-sm flex items-center gap-2">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                 تحميل نسخة (Backup)
                              </button>
                              
                              <button (click)="fileInput.click()" class="px-5 py-2.5 bg-white text-wushai-dark border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                 استعادة بيانات (Restore)
                              </button>
                              <input #fileInput type="file" hidden (change)="importData($event)" accept=".json">

                              <div class="flex-1"></div>
                              
                              <button (click)="resetData()" class="px-5 py-2.5 bg-white dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition-colors shadow-sm">
                                 حذف كافة البيانات
                              </button>
                           </div>
                        </div>
                     </section>
                  </div>
               }

               @case ('Team') {
                  <div class="space-y-6 animate-fade-in">
                     <div class="flex justify-between items-center">
                        <h3 class="font-bold text-lg text-wushai-dark dark:text-wushai-sand">أعضاء الفريق</h3>
                        
                        @if(isSystemAdmin()) {
                           <button (click)="openUserModal(null)" class="bg-wushai-dark hover:bg-wushai-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                              <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span>
                              إضافة عضو
                           </button>
                        } @else {
                           <button disabled class="text-xs bg-gray-200 text-gray-500 px-4 py-2 rounded-lg font-bold cursor-not-allowed">
                              إضافة عضو (للإدارة فقط)
                           </button>
                        }
                     </div>
                     
                     <div class="space-y-3">
                        @for (member of availableUsers(); track member.id) {
                           <div class="flex items-center justify-between p-4 bg-white dark:bg-wushai-deep border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                              <div class="flex items-center gap-4">
                                 <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
                                      [style.background-color]="member.avatarColor">
                                    {{ member.name.charAt(0) }}
                                 </div>
                                 <div>
                                    <p class="font-bold text-wushai-dark dark:text-white">{{ member.name }}</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ member.role }}</p>
                                 </div>
                              </div>
                              <div class="flex items-center gap-4">
                                 @if(member.id === currentUser()?.id) {
                                    <span class="text-xs font-bold px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">You</span>
                                 }
                                 
                                 @if(isSystemAdmin()) {
                                    <button (click)="openUserModal(member)" class="text-gray-400 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100">
                                       <span [innerHTML]="getIcon('Edit')" class="w-4 h-4"></span>
                                    </button>
                                    <button (click)="deleteUser(member.id)" class="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100" [disabled]="member.id === currentUser()?.id">
                                       <span [innerHTML]="getIcon('Trash')" class="w-4 h-4"></span>
                                    </button>
                                 }
                              </div>
                           </div>
                        }
                     </div>
                  </div>
               }

               @case ('Rules') {
                  <div class="space-y-6 animate-fade-in">
                     <div class="p-6 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl">
                        <h4 class="font-bold text-yellow-800 dark:text-yellow-500 flex items-center gap-2 mb-2">
                           <span [innerHTML]="getIcon('Shield')"></span>
                           إعدادات مصفوفة التتبع
                        </h4>
                        <p class="text-sm text-yellow-700 dark:text-yellow-600">تغيير هذه الإعدادات سيؤثر على كيفية حساب تقرير الصحة (Preflight Report).</p>
                     </div>

                     <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl">
                           <div>
                              <p class="font-bold text-wushai-dark dark:text-white">فرض وجود Test Case لكل متطلب</p>
                              <p class="text-xs text-gray-500 dark:text-gray-400">إذا تم تفعيله، سيعتبر المتطلب بدون اختبار "Blocked" بدلاً من "Gap".</p>
                           </div>
                           <div class="w-12 h-6 bg-wushai-olive rounded-full relative cursor-pointer">
                              <div class="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 right-0.5"></div>
                           </div>
                        </div>

                        <div class="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl">
                           <div>
                              <p class="font-bold text-wushai-dark dark:text-white">إلزامية رابط التصميم (Design Link)</p>
                              <p class="text-xs text-gray-500 dark:text-gray-400">هل المتطلب يحتاج تصميم إجباري للمرور؟</p>
                           </div>
                           <div class="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative cursor-pointer">
                              <div class="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 left-0.5"></div>
                           </div>
                        </div>
                     </div>
                  </div>
               }
            }
         </div>
      </div>

      <!-- Add/Edit User Modal -->
      @if (showUserModal()) {
         <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div class="bg-white dark:bg-wushai-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-wushai-sand dark:border-wushai-olive">
               <div class="p-5 border-b border-wushai-sand bg-wushai-light dark:bg-wushai-deep flex justify-between items-center">
                  <h3 class="font-bold text-xl text-wushai-dark dark:text-wushai-sand">
                     {{ editingUser() ? 'تعديل بيانات العضو' : 'إضافة عضو جديد' }}
                  </h3>
                  <button (click)="closeUserModal()" class="text-gray-400 hover:text-red-600 transition-colors">
                     <span [innerHTML]="getIcon('X')"></span>
                  </button>
               </div>
               <div class="p-6 space-y-4">
                  <div>
                     <label class="block text-sm font-bold text-wushai-olive mb-1">الاسم</label>
                     <input #uName type="text" [value]="editingUser()?.name || ''" class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive bg-gray-50 dark:bg-wushai-deep dark:text-white dark:border-gray-600" placeholder="اسم الموظف">
                  </div>
                  <div>
                     <label class="block text-sm font-bold text-wushai-olive mb-1">المسمى الوظيفي (Role)</label>
                     <input #uRole type="text" [value]="editingUser()?.role || ''" class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive bg-gray-50 dark:bg-wushai-deep dark:text-white dark:border-gray-600" placeholder="مثال: Developer">
                  </div>
                  <div>
                     <label class="block text-sm font-bold text-wushai-olive mb-1">PIN Code (6 digits)</label>
                     <input #uPin type="text" maxlength="6" [value]="editingUser()?.pin || ''" class="w-full border rounded-lg p-3 outline-none focus:border-wushai-olive bg-gray-50 dark:bg-wushai-deep dark:text-white dark:border-gray-600 font-mono text-center tracking-widest">
                  </div>
                  <div>
                     <label class="block text-sm font-bold text-wushai-olive mb-1">لون الأفاتار</label>
                     <div class="flex gap-2 flex-wrap">
                        @for(color of colors; track color) {
                           <button (click)="modalSelectedColor.set(color)"
                                   class="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                                   [class.border-gray-800]="modalSelectedColor() === color"
                                   [class.border-transparent]="modalSelectedColor() !== color"
                                   [style.background-color]="color">
                           </button>
                        }
                     </div>
                  </div>

                  <button (click)="saveUser(uName.value, uRole.value, uPin.value)" 
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
export class SettingsComponent {
   private sanitizer = inject(DomSanitizer);
   private dataService = inject(DataService);

   activeTab = signal<'Profile' | 'General' | 'Team' | 'Rules'>('Profile');
   isDarkMode = this.dataService.darkMode;
   currentUser = this.dataService.currentUser;
   availableUsers = this.dataService.availableUsers; // Now a signal

   // User Management State
   showUserModal = signal(false);
   editingUser = signal<User | null>(null);
   modalSelectedColor = signal('#4B5842');

   // Profile Edit
   colors = ['#4B5842', '#3B82F6', '#EC4899', '#F59E0B', '#DC2626', '#111827', '#7C3AED'];
   selectedColor = signal(this.currentUser()?.avatarColor || '#4B5842');

   isSystemAdmin = computed(() => this.currentUser()?.role === 'System Admin');

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   toggleDarkMode() {
      this.dataService.toggleDarkMode();
   }

   // FIX: Updated to pass a partial User object to the refactored dataService.updateUserProfile method.
   saveProfile(newPin: string) {
      if (!newPin || newPin.length !== 6) {
         alert('الرجاء إدخال رمز مكون من 6 أرقام');
         return;
      }
      if (this.currentUser()) {
         this.dataService.updateUserProfile(this.currentUser()!.id, { pin: newPin, avatarColor: this.selectedColor() });
      }
   }

   // --- User Management Logic (Admin) ---

   openUserModal(user: User | null) {
      this.editingUser.set(user);
      this.modalSelectedColor.set(user?.avatarColor || this.colors[0]);
      this.showUserModal.set(true);
   }

   closeUserModal() {
      this.showUserModal.set(false);
      this.editingUser.set(null);
   }

   // FIX: Updated to use the refactored updateUserProfile method for edits and added missing avatarUrl for new users.
   saveUser(name: string, role: string, pin: string) {
      if (!name || !role || pin.length !== 6) {
         alert('الرجاء تعبئة جميع البيانات والتأكد من أن الرمز 6 أرقام');
         return;
      }

      if (this.editingUser()) {
         this.dataService.updateUserProfile(this.editingUser()!.id, {
            name: name,
            role: role,
            pin: pin,
            avatarColor: this.modalSelectedColor(),
         });
      } else {
         const newUser: User = {
            id: `u${Date.now()}`,
            name,
            role,
            pin,
            email: `user_${Date.now()}@himcontrol.local`, // Dummy email
            avatarColor: this.modalSelectedColor(),
            avatarUrl: ''
         };
         this.dataService.addUser(newUser);
      }
      this.closeUserModal();
   }

   deleteUser(userId: string) {
      if (confirm('هل أنت متأكد من حذف هذا العضو؟')) {
         this.dataService.deleteUser(userId);
      }
   }

   // --- Import/Export ---

   exportData() {
      const data = this.dataService.exportDatabase();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `himcontrol_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
   }

   importData(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
         const file = input.files[0];
         const reader = new FileReader();
         reader.onload = (e) => {
            const content = e.target?.result as string;
            const success = this.dataService.importDatabase(content);
            if (success) {
               alert('تم استعادة قاعدة البيانات بنجاح!');
            } else {
               alert('فشل استيراد الملف. تأكد من أن الملف صالح.');
            }
         };
         reader.readAsText(file);
      }
   }

   resetData() {
      if (confirm('هل أنت متأكد من حذف كافة البيانات؟ سيتم إعادة تحميل الصفحة.')) {
         this.dataService.resetData();
      }
   }
}