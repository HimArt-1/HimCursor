import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { User } from '../../types';
import { UiService } from '../state/ui.service';
import { AuthService } from './auth.service';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';

@Injectable({ providedIn: 'root' })
export class UserService {
    private uiService = inject(UiService);
    private authService = inject(AuthService);
    private supabase = supabaseClient;

    readonly currentUser = computed(() => {
        const profile = this.authService.activeProfile();
        if (!profile) return null;
        return this.mapProfileToUser(profile);
    });
    readonly availableUsers = signal<User[]>([]);
    readonly isAdminSession = computed(() => {
        const profile = this.authService.activeProfile();
        return profile?.role === 'admin' || profile?.role === 'System Admin';
    });

    constructor() {
        effect(() => {
            const profile = this.currentUser();
            this.availableUsers.set(profile ? [profile] : []);
        });
        // Note: Admin users list is loaded on-demand via loadUsers() from UsersComponent
    }

    async loadUsers() {
        if (!isSupabaseConfigured || !this.supabase) return;

        if (!this.isAdminSession()) {
            const profile = this.currentUser();
            this.availableUsers.set(profile ? [profile] : []);
            return;
        }

        const { data, error } = await this.supabase.functions.invoke('admin_list_users');
        if (error) {
            console.error('admin_list_users error:', this.formatError(error));
            return;
        }
        if (data?.users) {
            const users: User[] = data.users.map((p: any) => ({
                id: p.id,
                name: p.name,
                email: p.email || '',
                role: p.role,
                avatarColor: p.avatar_color || '#4B5842',
                avatarUrl: p.avatar_url || '',
                isActive: p.is_active
            }));
            this.availableUsers.set(users);
        }
    }

    async updateUserProfile(userId: string, updates: Partial<User>) {
        if (!isSupabaseConfigured || !this.supabase) return;
        const payload: any = {
            profile_id: userId,
            name: updates.name,
            role: updates.role,
            avatar_color: updates.avatarColor,
            avatar_url: updates.avatarUrl
        };

        const { error } = await this.supabase.functions.invoke('admin_update_profile', { body: payload });

        if (error) {
            console.error('admin_update_profile error:', this.formatError(error));
            this.uiService.addNotification('خطأ', 'فشل تحديث الملف الشخصي', 'Warning');
            return;
        }

        await this.loadUsers();
        this.uiService.addNotification('تحديث', 'تم تحديث الملف الشخصي بنجاح', 'Success');
    }

    async addUser(user: User): Promise<boolean> {
        if (!isSupabaseConfigured || !this.supabase) return false;
        if (!this.isAdminSession()) {
            this.uiService.addNotification('غير مصرح', 'الإضافة متاحة للإدارة فقط', 'Warning');
            return false;
        }
        if (!user.email || !user.password) {
            this.uiService.addNotification('خطأ', 'البريد وكلمة المرور مطلوبة', 'Warning');
            return false;
        }

        const payload = {
            name: user.name,
            role: user.role,
            email: user.email,
            password: user.password,
            avatar_color: user.avatarColor
        };
        const { data, error } = await this.supabase.functions.invoke('admin_create_user', { body: payload });
        if (error) {
            console.error('admin_create_user error:', this.formatError(error));
            this.uiService.addNotification('فشل الإضافة', this.formatError(error), 'Warning');
            return false;
        }
        await this.loadUsers();
        this.uiService.addNotification('تم بنجاح', `تم إضافة العضو ${user.name}`, 'Success');
        return !!data?.id;
    }

    async deleteUser(userId: string) {
        if (!isSupabaseConfigured || !this.supabase) return;
        if (!this.isAdminSession()) {
            this.uiService.addNotification('غير مصرح', 'الحذف متاح للإدارة فقط', 'Warning');
            return;
        }

        await this.setUserActive(userId, false);
    }

    async setUserActive(userId: string, isActive: boolean) {
        if (!isSupabaseConfigured || !this.supabase) return;
        if (!this.isAdminSession()) {
            this.uiService.addNotification('غير مصرح', 'الإدارة فقط', 'Warning');
            return;
        }

        const { error } = await this.supabase.functions.invoke('admin_disable_user', {
            body: { user_id: userId, is_active: isActive }
        });
        if (error) {
            console.error('admin_disable_user error:', this.formatError(error));
            this.uiService.addNotification('خطأ', 'فشل تحديث حالة العضو', 'Warning');
            return;
        }
        await this.loadUsers();
        this.uiService.addNotification('تم بنجاح', isActive ? 'تم تفعيل العضو' : 'تم تعطيل العضو', 'Success');
    }

    async resetPassword(userId: string, newPassword: string) {
        if (!isSupabaseConfigured || !this.supabase) return;
        if (!this.isAdminSession()) return;
        if (!newPassword) return;
        const { error } = await this.supabase.functions.invoke('admin_reset_password', {
            body: { user_id: userId, new_password: newPassword }
        });
        if (error) {
            console.error('admin_reset_password error:', this.formatError(error));
            this.uiService.addNotification('خطأ', 'فشل إعادة تعيين كلمة المرور', 'Warning');
            return;
        }
        this.uiService.addNotification('تم بنجاح', 'تم تحديث كلمة المرور', 'Success');
    }

    private mapProfileToUser(profile: any): User {
        return {
            id: profile.id,
            name: profile.name,
            email: profile.email || '',
            role: profile.role,
            avatarColor: profile.avatarColor || profile.avatar_color || '#4B5842',
            avatarUrl: profile.avatarUrl || profile.avatar_url || '',
            isActive: profile.isActive ?? profile.is_active
        };
    }

    private formatError(error: any): string {
        if (!error) return 'Unknown error';
        const parts = [
            error.message,
            error.details,
            error.hint,
            error.code,
            error.status
        ].filter(Boolean);
        return parts.join(' | ');
    }
}
