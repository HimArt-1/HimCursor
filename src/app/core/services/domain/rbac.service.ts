import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';
import { AuthService } from './auth.service';
import { Role, Permission } from '../../types';

// All available permission keys
export const ALL_PERMISSIONS = [
    'dashboard.view', 'tasks.view', 'tasks.manage',
    'requests.view', 'requests.manage',
    'inventory.view', 'inventory.manage',
    'finance.view', 'finance.manage',
    'members.view', 'members.manage',
    'content.view', 'content.manage',
    'strategy.view', 'strategy.manage',
    'settings.manage', 'support.manage',
    'audit.view', 'admin.users', 'admin.roles', 'admin.full'
] as const;

export type PermissionKey = typeof ALL_PERMISSIONS[number];

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = [
    { key: 'عام', permissions: ['dashboard.view'] },
    { key: 'المهام', permissions: ['tasks.view', 'tasks.manage'] },
    { key: 'الطلبات', permissions: ['requests.view', 'requests.manage'] },
    { key: 'المخزون', permissions: ['inventory.view', 'inventory.manage'] },
    { key: 'المالية', permissions: ['finance.view', 'finance.manage'] },
    { key: 'الأعضاء', permissions: ['members.view', 'members.manage'] },
    { key: 'المحتوى', permissions: ['content.view', 'content.manage'] },
    { key: 'الاستراتيجية', permissions: ['strategy.view', 'strategy.manage'] },
    { key: 'النظام', permissions: ['settings.manage', 'support.manage', 'audit.view', 'admin.users', 'admin.roles', 'admin.full'] }
];

@Injectable({ providedIn: 'root' })
export class RbacService {
    private supabase = supabaseClient;
    private authService = inject(AuthService);

    readonly roles = signal<Role[]>([]);
    readonly permissions = signal<Permission[]>([]);
    readonly userRole = signal<Role | null>(null);

    // Current user's effective permissions
    readonly currentPermissions = computed(() => {
        const role = this.userRole();
        if (!role) return [];
        // admin.full grants everything
        if (role.permissions.includes('admin.full')) {
            return [...ALL_PERMISSIONS];
        }
        return role.permissions;
    });

    readonly isAdmin = computed(() =>
        this.currentPermissions().includes('admin.full')
    );

    constructor() {
        effect(() => {
            if (!this.authService.sessionReady()) return;
            if (!this.authService.activeProfile()) return;
            this.loadUserRole();
            this.loadRoles();
        });
    }

    // ===== PERMISSION CHECKS =====

    hasPermission(key: string): boolean {
        return this.currentPermissions().includes(key as any);
    }

    hasAnyPermission(keys: string[]): boolean {
        const perms = this.currentPermissions();
        return keys.some(k => perms.includes(k as any));
    }

    // ===== LOAD USER ROLE =====

    private async loadUserRole() {
        if (!isSupabaseConfigured || !this.supabase) return;
        const profile = this.authService.activeProfile();
        if (!profile) return;

        // Try to load role by role_id from profile
        const { data: profileData } = await this.supabase
            .from('profiles')
            .select('role_id, role')
            .eq('id', profile.id)
            .single();

        if (profileData?.role_id) {
            const { data: roleData } = await this.supabase
                .from('roles')
                .select('*')
                .eq('id', profileData.role_id)
                .single();

            if (roleData) {
                this.userRole.set(this.mapDbToRole(roleData));
                return;
            }
        }

        // Fallback: match by role name
        if (profileData?.role) {
            const { data: roleData } = await this.supabase
                .from('roles')
                .select('*')
                .eq('name', profileData.role.toLowerCase())
                .single();

            if (roleData) {
                this.userRole.set(this.mapDbToRole(roleData));
                return;
            }
        }

        // Default: member
        const { data: defaultRole } = await this.supabase
            .from('roles')
            .select('*')
            .eq('name', 'member')
            .single();

        if (defaultRole) {
            this.userRole.set(this.mapDbToRole(defaultRole));
        }
    }

    // ===== ROLES CRUD =====

    async loadRoles() {
        if (!isSupabaseConfigured || !this.supabase) return;
        const { data, error } = await this.supabase
            .from('roles')
            .select('*')
            .order('created_at', { ascending: true });

        if (data) {
            this.roles.set(data.map(this.mapDbToRole));
        }
    }

    async createRole(name: string, description: string, permissions: string[]): Promise<boolean> {
        if (!isSupabaseConfigured || !this.supabase) return false;
        const { data, error } = await this.supabase
            .from('roles')
            .insert([{ name, description, permissions: JSON.stringify(permissions), is_system: false }])
            .select()
            .single();

        if (error) {
            console.error('Create role error:', error);
            return false;
        }
        if (data) {
            this.roles.update(r => [...r, this.mapDbToRole(data)]);
        }
        return true;
    }

    async updateRole(id: string, updates: { name?: string; description?: string; permissions?: string[] }): Promise<boolean> {
        if (!isSupabaseConfigured || !this.supabase) return false;
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.permissions) dbUpdates.permissions = JSON.stringify(updates.permissions);
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await this.supabase.from('roles').update(dbUpdates).eq('id', id);
        if (error) {
            console.error('Update role error:', error);
            return false;
        }
        this.roles.update(roles =>
            roles.map(r => r.id === id ? { ...r, ...updates } : r)
        );
        return true;
    }

    async deleteRole(id: string): Promise<boolean> {
        if (!isSupabaseConfigured || !this.supabase) return false;
        const { error } = await this.supabase.from('roles').delete().eq('id', id);
        if (error) {
            console.error('Delete role error:', error);
            return false;
        }
        this.roles.update(r => r.filter(role => role.id !== id));
        return true;
    }

    async assignRole(userId: string, roleId: string): Promise<boolean> {
        if (!isSupabaseConfigured || !this.supabase) return false;
        const { error } = await this.supabase
            .from('profiles')
            .update({ role_id: roleId })
            .eq('id', userId);

        if (error) {
            console.error('Assign role error:', error);
            return false;
        }
        return true;
    }

    // ===== MAPPERS =====

    private mapDbToRole(db: any): Role {
        let perms: string[] = [];
        try {
            perms = typeof db.permissions === 'string' ? JSON.parse(db.permissions) : (db.permissions || []);
        } catch { perms = []; }

        return {
            id: db.id,
            name: db.name,
            description: db.description,
            permissions: perms,
            isSystem: db.is_system || false,
            createdAt: db.created_at
        };
    }
}
