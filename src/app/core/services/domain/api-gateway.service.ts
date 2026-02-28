import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { RbacService } from './rbac.service';
import { AuditService } from '../infra/audit.service';

// API Key interface
export interface ApiKey {
    id: string;
    name: string;
    key: string;
    permissions: string[];
    rateLimitPerMinute: number;
    isActive: boolean;
    lastUsed?: string;
    totalRequests: number;
    createdAt: string;
    expiresAt?: string;
}

// API Request Log
export interface ApiRequestLog {
    id: string;
    apiKeyId: string;
    method: string;
    path: string;
    statusCode: number;
    responseTime: number;
    timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ApiGatewayService {
    private authService = inject(AuthService);
    private rbacService = inject(RbacService);
    private auditService = inject(AuditService);

    readonly apiKeys = signal<ApiKey[]>(this.loadKeys());
    readonly requestLogs = signal<ApiRequestLog[]>(this.loadLogs());

    // Computeds
    readonly activeKeys = computed(() => this.apiKeys().filter(k => k.isActive));
    readonly totalRequests = computed(() => this.apiKeys().reduce((s, k) => s + k.totalRequests, 0));

    readonly requestStats = computed(() => {
        const logs = this.requestLogs();
        const last24h = logs.filter(l => Date.now() - new Date(l.timestamp).getTime() < 86400000);
        const avgResponseTime = last24h.length > 0
            ? Math.round(last24h.reduce((s, l) => s + l.responseTime, 0) / last24h.length)
            : 0;
        const successRate = last24h.length > 0
            ? Math.round(last24h.filter(l => l.statusCode < 400).length / last24h.length * 100)
            : 100;
        return {
            last24h: last24h.length,
            avgResponseTime,
            successRate,
            errorCount: last24h.filter(l => l.statusCode >= 400).length
        };
    });

    readonly endpointStats = computed(() => {
        const logs = this.requestLogs();
        const counts: Record<string, { count: number; avgTime: number; errors: number }> = {};
        logs.forEach(l => {
            if (!counts[l.path]) counts[l.path] = { count: 0, avgTime: 0, errors: 0 };
            counts[l.path].count++;
            counts[l.path].avgTime += l.responseTime;
            if (l.statusCode >= 400) counts[l.path].errors++;
        });
        return Object.entries(counts).map(([path, data]) => ({
            path, count: data.count,
            avgTime: Math.round(data.avgTime / data.count),
            errorRate: Math.round((data.errors / data.count) * 100)
        })).sort((a, b) => b.count - a.count);
    });

    // Available API endpoints
    readonly availableEndpoints = [
        { method: 'GET', path: '/api/tasks', description: 'قائمة المهام' },
        { method: 'POST', path: '/api/tasks', description: 'إنشاء مهمة' },
        { method: 'GET', path: '/api/projects', description: 'قائمة المشاريع' },
        { method: 'GET', path: '/api/inventory', description: 'قائمة المنتجات' },
        { method: 'GET', path: '/api/finance', description: 'التقارير المالية' },
        { method: 'GET', path: '/api/analytics', description: 'البيانات التحليلية' },
        { method: 'GET', path: '/api/team', description: 'بيانات الفريق' },
        { method: 'POST', path: '/api/notifications', description: 'إرسال إشعار' }
    ];

    // ===== API KEY CRUD =====

    generateKey(name: string, permissions: string[], rateLimitPerMinute = 60, expiresAt?: string): ApiKey {
        const key: ApiKey = {
            id: crypto.randomUUID(),
            name,
            key: `hc_${this.generateRandomKey(32)}`,
            permissions,
            rateLimitPerMinute,
            isActive: true,
            totalRequests: 0,
            createdAt: new Date().toISOString(),
            expiresAt
        };
        this.apiKeys.update(list => [key, ...list]);
        this.persistKeys();
        this.auditService.logAction('api_key_created', 'api_key', key.id, name);
        return key;
    }

    revokeKey(id: string) {
        this.apiKeys.update(list => list.map(k => k.id === id ? { ...k, isActive: false } : k));
        this.persistKeys();
        this.auditService.logAction('api_key_revoked', 'api_key', id);
    }

    deleteKey(id: string) {
        this.apiKeys.update(list => list.filter(k => k.id !== id));
        this.persistKeys();
    }

    // ===== RATE LIMITING =====

    checkRateLimit(apiKeyId: string): boolean {
        const key = this.apiKeys().find(k => k.id === apiKeyId);
        if (!key || !key.isActive) return false;

        // Check expiry
        if (key.expiresAt && new Date(key.expiresAt) < new Date()) return false;

        // Check rate limit
        const recentRequests = this.requestLogs().filter(l =>
            l.apiKeyId === apiKeyId && Date.now() - new Date(l.timestamp).getTime() < 60000
        ).length;

        return recentRequests < key.rateLimitPerMinute;
    }

    // ===== REQUEST LOGGING =====

    logRequest(apiKeyId: string, method: string, path: string, statusCode: number, responseTime: number) {
        const log: ApiRequestLog = {
            id: crypto.randomUUID(),
            apiKeyId, method, path, statusCode, responseTime,
            timestamp: new Date().toISOString()
        };
        this.requestLogs.update(list => [log, ...list].slice(0, 500));
        this.persistLogs();

        // Update key stats
        this.apiKeys.update(list => list.map(k =>
            k.id === apiKeyId ? { ...k, totalRequests: k.totalRequests + 1, lastUsed: new Date().toISOString() } : k
        ));
        this.persistKeys();
    }

    // ===== HELPERS =====

    private generateRandomKey(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from(crypto.getRandomValues(new Uint8Array(length)))
            .map(v => chars[v % chars.length]).join('');
    }

    getMaskedKey(key: string): string {
        if (key.length <= 8) return '****';
        return key.substring(0, 6) + '...' + key.substring(key.length - 4);
    }

    // ===== PERSISTENCE =====

    private persistKeys() { localStorage.setItem('himcontrol_api_keys', JSON.stringify(this.apiKeys())); }
    private persistLogs() { localStorage.setItem('himcontrol_api_logs', JSON.stringify(this.requestLogs())); }
    private loadKeys(): ApiKey[] { try { return JSON.parse(localStorage.getItem('himcontrol_api_keys') || '[]'); } catch { return []; } }
    private loadLogs(): ApiRequestLog[] { try { return JSON.parse(localStorage.getItem('himcontrol_api_logs') || '[]'); } catch { return []; } }
}
