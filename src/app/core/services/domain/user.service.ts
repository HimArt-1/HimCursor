import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../../types';
import { UiService } from '../state/ui.service';
import { AuditService } from '../infra/audit.service';
import { SupabaseService } from '../infra/supabase.service';

@Injectable({ providedIn: 'root' })
export class UserService {
    private router = inject(Router);
    private uiService = inject(UiService);
    private auditService = inject(AuditService);
    private supabase = inject(SupabaseService);

    // Auth State
    readonly currentUser = signal<User | null>(null);
    readonly loading = signal<boolean>(false);
    readonly initialized = signal<boolean>(false);

    // Users Data (Fetched from 'profiles' table)
    readonly availableUsers = signal<User[]>([]);

    constructor() {
        // Restore session on load
        if (this.supabase.isConfigured) {
            this.supabase.client.auth.getUser().then(({ data }) => {
                if (data.user) {
                    this.fetchProfile(data.user.id).then(() => {
                        this.initialized.set(true);
                    });
                } else {
                    this.initialized.set(true);
                }
            }).catch(() => {
                this.initialized.set(true);
            });
            this.loadUsers();
        } else {
            this.initialized.set(true);
            this.loadUsers(); // Load mock users
        }
    }

    async loadUsers() {
        if (!this.supabase.isConfigured) {
            // Mock Data for Dev Mode
            this.availableUsers.set([
                { id: 'dev-admin', name: 'Admin User', email: 'admin@himcontrol.local', role: 'System Admin', avatarColor: '#4B5842', pin: '000000' },
                { id: 'dev-user', name: 'Demo User', email: 'demo@himcontrol.local', role: 'Manager', avatarColor: '#5A3E2B', pin: '123456' }
            ]);
            return;
        }

        const { data, error } = await this.supabase.client
            .from('profiles')
            .select('*');

        if (data) {
            // Map DB profiles to User type
            const users: User[] = data.map((p: any) => ({
                id: p.id,
                name: p.name,
                email: p.email || '', // Handle null email
                role: p.role,
                avatarUrl: p.avatar_url,
                avatarColor: p.avatar_color,
                pin: p.pin
            }));
            this.availableUsers.set(users);
        }
    }

    // Updated for 6-digit PIN
    async login(email: string, pin: string): Promise<boolean> {
        this.loading.set(true);

        // Mock Login
        if (!this.supabase.isConfigured) {
            await new Promise(r => setTimeout(r, 800)); // Simulate delay
            const mockUser = this.availableUsers().find(u => u.email === email && u.pin === pin);
            if (mockUser) {
                this.currentUser.set(mockUser);
                this.initialized.set(true);
                this.auditService.logChange(mockUser.name, 'Login', 'Auth', 'Session', `User logged in (Mock).`);
                this.uiService.addNotification('تسجيل دخول تجريبي', `مرحباً ${mockUser.name}`, 'Success');
                this.router.navigate(['/']);
                return true;
            } else {
                this.uiService.addNotification('خطأ في الدخول', 'Pin Code Invalid', 'Warning');
                this.loading.set(false);
                return false;
            }
        }

        // Direct use of PIN as password (must be 6 chars min)
        const password = pin;

        const { data, error } = await this.supabase.client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            this.uiService.addNotification('خطأ في الدخول', error.message, 'Warning');
            this.loading.set(false);
            return false;
        }

        if (data.user) {
            await this.fetchProfile(data.user.id);
            this.auditService.logChange(this.currentUser()?.name || 'User', 'Login', 'Auth', 'Session', `User logged in.`);
            this.uiService.addNotification('تسجيل دخول', `مرحباً بعودتك`, 'Success');
            this.router.navigate(['/']);
            return true;
        }
        return false;
    }

    // Backdoor for Admin Access when Supabase is empty
    async loginAsBackdoorAdmin() {
        const admin: User = {
            id: 'dev-admin',
            name: 'System Admin',
            email: 'admin@himcontrol.local',
            role: 'System Admin',
            avatarColor: '#4B5842',
            pin: '000000'
        };
        this.currentUser.set(admin);
        this.initialized.set(true);
        this.auditService.logChange('System Admin', 'Login', 'Auth', 'Session', `Backdoor Admin Access.`);
        this.uiService.addNotification('وضع المسؤول', 'تم تفعيل وضع الطوارئ', 'Success');
        this.router.navigate(['/']);
        return true;
    }

    async logout() {
        if (this.supabase.isConfigured) {
            await this.supabase.client.auth.signOut();
        }
        const name = this.currentUser()?.name;
        if (name) {
            this.auditService.logChange(name, 'Logout', 'Auth', 'Session', `User logged out.`);
        }
        this.currentUser.set(null);
        this.router.navigate(['/login']);
        this.uiService.addNotification('تسجيل خروج', 'تم تسجيل الخروج بنجاح', 'Info');
    }

    private async fetchProfile(uid: string) {
        if (!this.supabase.isConfigured) return;

        const { data } = await this.supabase.client
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();

        if (data) {
            this.currentUser.set({
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role,
                avatarUrl: data.avatar_url,
                avatarColor: data.avatar_color,
                pin: data.pin
            });
        }
        this.loading.set(false);
    }

    async updateUserProfile(userId: string, updates: Partial<User>) {
        if (!this.supabase.isConfigured) return;

        // Map User interface to DB columns (camelCase -> snake_case if needed)
        // Our types match mostly, except avatarUrl -> avatar_url, avatarColor -> avatar_color
        const dbUpdates: any = { ...updates };
        if (updates.avatarUrl) {
            dbUpdates.avatar_url = updates.avatarUrl;
            delete dbUpdates.avatarUrl;
        }
        if (updates.avatarColor) {
            dbUpdates.avatar_color = updates.avatarColor;
            delete dbUpdates.avatarColor;
        }

        const { error } = await this.supabase.client
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId);

        if (!error) {
            // Update local state
            this.availableUsers.update(users => users.map(u => u.id === userId ? { ...u, ...updates } : u));

            if (this.currentUser()?.id === userId) {
                this.currentUser.update(u => u ? { ...u, ...updates } : null);
            }

            this.auditService.logChange(this.currentUser()?.name || 'System', 'Update', 'User', userId, 'Updated user profile details');
            this.uiService.addNotification('تحديث', 'تم تحديث الملف الشخصي بنجاح', 'Success');
        } else {
            this.uiService.addNotification('خطأ', 'فشل تحديث الملف الشخصي', 'Warning');
        }
    }

    async addUser(user: User): Promise<boolean> {
        if (!this.supabase.isConfigured) {
            this.availableUsers.update(u => [...u, user]);
            this.uiService.addNotification('إضافة عضو', `تم إضافة ${user.name} (محلياً)`, 'Success');
            return true;
        }

        const password = user.pin; // PIN is the password (min 6 chars)

        // 1. Create Auth User
        const { data, error } = await this.supabase.client.auth.signUp({
            email: user.email,
            password: password,
            options: {
                data: {
                    name: user.name,
                    role: user.role,
                    avatar_color: user.avatarColor
                }
            }
        });

        if (error) {
            console.error('Error creating user:', error);
            this.uiService.addNotification('فشل الإضافة', error.message, 'Warning');
            return false;
        }

        if (data.user) {
            // 2. Create Profile Entry
            const { error: profileError } = await this.supabase.client
                .from('profiles')
                .insert([{
                    id: data.user.id,
                    name: user.name,
                    role: user.role,
                    email: user.email,
                    pin: user.pin,
                    avatar_color: user.avatarColor,
                    avatar_url: ''
                }]);

            if (profileError) {
                console.error('Error creating profile:', profileError);
                this.uiService.addNotification('تحذير', 'تم إنشاء الحساب ولكن فشل حفظ الملف الشخصي', 'Warning');
            } else {
                this.uiService.addNotification('تم بنجاح', `تم إضافة العضو ${user.name}`, 'Success');
                // Refresh list
                await this.loadUsers();
            }
            return true;
        }

        return false;
    }

    async deleteUser(userId: string) {
        if (!this.supabase.isConfigured) {
            this.availableUsers.update(u => u.filter(user => user.id !== userId));
            this.uiService.addNotification('حذف عضو', 'تم حذف العضو (محلياً)', 'Success');
            return;
        }

        // Note: Supabase Auth users can only be deleted via Service Role key (backend)
        // or by themselves. For client-side admin, we can only delete the Profile.
        // To strictly delete Auth User, requires Edge Function.
        // For now, we will delete the profile which effectively disables access if RLS checks profile existence.

        const { error } = await this.supabase.client
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            this.uiService.addNotification('خطأ', 'فشل حذف العضو', 'Warning');
        } else {
            this.availableUsers.update(u => u.filter(user => user.id !== userId));
            this.uiService.addNotification('تم بنجاح', 'تم حذف ملف العضو', 'Success');
        }
    }
}
