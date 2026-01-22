import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

// Role definitions
export type UserRole = 'system_admin' | 'admin' | 'member' | 'viewer';

export interface RoleConfig {
  key: UserRole;
  label: string;
  labelAr: string;
  description: string;
  level: number; // Higher = more permissions
}

export const ROLES: RoleConfig[] = [
  {
    key: 'system_admin',
    label: 'System Admin',
    labelAr: 'مدير النظام',
    description: 'صلاحيات كاملة - تحكم كامل في كل شيء',
    level: 100
  },
  {
    key: 'admin',
    label: 'Admin',
    labelAr: 'مشرف',
    description: 'إدارة المهام والفريق',
    level: 50
  },
  {
    key: 'member',
    label: 'Member',
    labelAr: 'عضو',
    description: 'عضو عادي - إضافة وتعديل المهام',
    level: 20
  },
  {
    key: 'viewer',
    label: 'Viewer',
    labelAr: 'مشاهد',
    description: 'مشاهدة فقط - لا يمكن التعديل',
    level: 10
  }
];

// Permission types
export type Permission = 
  // User Management
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.manage_roles'
  // Task Management
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'tasks.assign'
  // Content Management
  | 'content.view'
  | 'content.create'
  | 'content.edit'
  | 'content.delete'
  // Strategy & Reports
  | 'strategy.view'
  | 'strategy.edit'
  | 'reports.view'
  | 'reports.export'
  // System
  | 'system.settings'
  | 'system.audit'
  | 'system.backup';

// Role -> Permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  system_admin: [
    // All permissions
    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
    'content.view', 'content.create', 'content.edit', 'content.delete',
    'strategy.view', 'strategy.edit',
    'reports.view', 'reports.export',
    'system.settings', 'system.audit', 'system.backup'
  ],
  admin: [
    // Task and team management
    'users.view',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
    'content.view', 'content.create', 'content.edit',
    'strategy.view', 'strategy.edit',
    'reports.view', 'reports.export'
  ],
  member: [
    // Regular member
    'users.view',
    'tasks.view', 'tasks.create', 'tasks.edit',
    'content.view', 'content.create',
    'strategy.view',
    'reports.view'
  ],
  viewer: [
    // View only
    'users.view',
    'tasks.view',
    'content.view',
    'strategy.view',
    'reports.view'
  ]
};

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private authService = inject(AuthService);

  // Get current user's role
  readonly currentRole = computed<UserRole>(() => {
    const profile = this.authService.activeProfile();
    if (!profile) return 'viewer';
    return this.normalizeRole(profile.role);
  });

  // Get role config
  readonly currentRoleConfig = computed<RoleConfig | undefined>(() => {
    return ROLES.find(r => r.key === this.currentRole());
  });

  // Check if user is System Admin
  readonly isSystemAdmin = computed(() => this.currentRole() === 'system_admin');

  // Check if user is Admin or higher
  readonly isAdmin = computed(() => {
    const level = this.getRoleLevel(this.currentRole());
    return level >= 50; // admin level
  });

  // Check if user can manage users
  readonly canManageUsers = computed(() => this.hasPermission('users.manage_roles'));

  // Check if user can edit content
  readonly canEdit = computed(() => this.hasPermission('tasks.edit'));

  // Check if user is viewer only
  readonly isViewerOnly = computed(() => this.currentRole() === 'viewer');

  // Get all available roles (for admin to assign)
  getAvailableRoles(): RoleConfig[] {
    return ROLES;
  }

  // Get roles that current user can assign
  getAssignableRoles(): RoleConfig[] {
    const currentLevel = this.getRoleLevel(this.currentRole());
    // Can only assign roles lower than your own
    return ROLES.filter(r => r.level < currentLevel);
  }

  // Check if user has a specific permission
  hasPermission(permission: Permission): boolean {
    const role = this.currentRole();
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  // Check if user has any of the given permissions
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  // Check if user has all of the given permissions
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(p));
  }

  // Get role level
  getRoleLevel(role: UserRole): number {
    const config = ROLES.find(r => r.key === role);
    return config?.level || 0;
  }

  // Normalize role string to UserRole type
  normalizeRole(role: string | undefined): UserRole {
    if (!role) return 'viewer';
    
    const normalized = role.toLowerCase().replace(/[^a-z_]/g, '_');
    
    // Map various role names to our standard roles
    if (normalized.includes('system') && normalized.includes('admin')) return 'system_admin';
    if (normalized === 'admin' || normalized === 'administrator') return 'admin';
    if (normalized === 'member' || normalized === 'user') return 'member';
    if (normalized === 'viewer' || normalized === 'guest') return 'viewer';
    
    // Check if it's already a valid role
    if (ROLES.some(r => r.key === normalized)) return normalized as UserRole;
    
    // Default to member for unknown roles
    return 'member';
  }

  // Get role label in Arabic
  getRoleLabel(role: string): string {
    const normalized = this.normalizeRole(role);
    const config = ROLES.find(r => r.key === normalized);
    return config?.labelAr || role;
  }
}
