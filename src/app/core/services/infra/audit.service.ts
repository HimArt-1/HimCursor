import { Injectable, signal } from '@angular/core';
import { AuditLogEntry, AuditAction } from '../../types';

@Injectable({ providedIn: 'root' })
export class AuditService {
    readonly auditLogs = signal<AuditLogEntry[]>([]);

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
        this.auditLogs.update(logs => [entry, ...logs].slice(0, 50)); // Keep logs capped
    }
}
