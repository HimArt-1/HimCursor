import { Injectable, signal, inject, effect } from '@angular/core';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';
import { AuthService } from '../domain/auth.service';
import { AuditLogEntry, AuditAction, AuditEntry } from '../../types';

@Injectable({ providedIn: 'root' })
export class AuditService {
    private supabase = supabaseClient;
    private authService = inject(AuthService);

    // Legacy compat
    readonly auditLogs = signal<AuditLogEntry[]>([]);
    // New DB-backed logs
    readonly auditEntries = signal<AuditEntry[]>([]);
    readonly isLoading = signal(false);

    constructor() {
        effect(() => {
            if (!this.authService.sessionReady()) return;
            if (!this.authService.activeProfile()) return;
            this.loadAuditLog();
        });
    }

    // Legacy method — kept for backward compatibility
    logChange(user: string, action: AuditAction, entityType: string, entityId: string, details: string) {
        const entry: AuditLogEntry = {
            id: `LOG-${Date.now()}${Math.random()}`,
            timestamp: new Date().toISOString(),
            user,
            action,
            entityType,
            entityId,
            details
        };
        this.auditLogs.update(logs => [entry, ...logs].slice(0, 50));

        // Also save to DB
        this.logAction(action, entityType, entityId, details);
    }

    // New DB-backed audit logging
    async logAction(action: string, entityType?: string, entityId?: string, details?: string) {
        if (!isSupabaseConfigured || !this.supabase) return;
        const profile = this.authService.activeProfile();
        if (!profile) return;

        await this.supabase.from('audit_log').insert([{
            user_id: profile.id,
            user_name: profile.name,
            action,
            entity_type: entityType || null,
            entity_id: entityId || null,
            details: details || null
        }]);
    }

    async loadAuditLog(limit = 100) {
        if (!isSupabaseConfigured || !this.supabase) return;
        this.isLoading.set(true);

        const { data, error } = await this.supabase
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        this.isLoading.set(false);

        if (data) {
            this.auditEntries.set(data.map(this.mapDbToEntry));
        }
    }

    private mapDbToEntry(db: any): AuditEntry {
        return {
            id: db.id,
            userId: db.user_id,
            userName: db.user_name || '',
            action: db.action,
            entityType: db.entity_type,
            entityId: db.entity_id,
            details: db.details,
            ipAddress: db.ip_address,
            createdAt: db.created_at
        };
    }
}
