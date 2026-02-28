import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';
import { AuthService } from './auth.service';
import { Notification } from '../../types';
import { ToastService } from '../state/toast.service';
import { ConfettiService } from '../state/confetti.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private supabase = supabaseClient;
    private authService = inject(AuthService);
    private toastService = inject(ToastService);
    private confettiService = inject(ConfettiService);
    private realtimeInitialized = false;

    readonly notifications = signal<Notification[]>([]);
    readonly isLoading = signal(false);
    readonly activeCategory = signal<string>('all');

    readonly unreadCount = computed(() =>
        this.notifications().filter(n => !n.read).length
    );

    readonly filteredNotifications = computed(() => {
        const cat = this.activeCategory();
        const all = this.notifications();
        if (cat === 'all') return all;
        return all.filter(n => n.category === cat);
    });

    readonly groupedNotifications = computed(() => {
        const notifs = this.filteredNotifications();
        const groups = new Map<string, Notification[]>();
        const ungrouped: Notification[] = [];

        for (const n of notifs) {
            if (n.groupedKey) {
                const existing = groups.get(n.groupedKey) || [];
                existing.push(n);
                groups.set(n.groupedKey, existing);
            } else {
                ungrouped.push(n);
            }
        }

        // Convert groups to single display items
        const result: (Notification & { groupCount?: number })[] = [];
        for (const [key, items] of groups) {
            if (items.length > 1) {
                result.push({
                    ...items[0],
                    message: `${items.length} ${items[0].title}`,
                    groupCount: items.length,
                    read: items.every(i => i.read)
                });
            } else {
                result.push(items[0]);
            }
        }

        return [...result, ...ungrouped].sort((a, b) =>
            new Date(b.time).getTime() - new Date(a.time).getTime()
        );
    });

    readonly categories = [
        { key: 'all', label: 'الكل', icon: '📋' },
        { key: 'tasks', label: 'المهام', icon: '✅' },
        { key: 'finance', label: 'المالية', icon: '💰' },
        { key: 'system', label: 'النظام', icon: '⚙️' },
        { key: 'team', label: 'الفريق', icon: '👥' }
    ];

    constructor() {
        effect(() => {
            if (this.realtimeInitialized) return;
            if (!this.authService.sessionReady()) return;
            if (!this.authService.activeProfile()) return;
            this.initRealtime();
            this.realtimeInitialized = true;
        });
    }

    // ===== LOAD =====

    async loadNotifications() {
        if (!isSupabaseConfigured || !this.supabase) return;
        const profile = this.authService.activeProfile();
        if (!profile) return;

        this.isLoading.set(true);
        const { data, error } = await this.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(50);

        this.isLoading.set(false);

        if (data) {
            this.notifications.set(data.map(this.mapDbToNotification));
        }
    }

    // ===== SEND =====

    async sendNotification(
        userId: string,
        title: string,
        message: string,
        type: Notification['type'] = 'Info',
        category: string = 'system',
        actionUrl?: string,
        groupedKey?: string
    ) {
        if (!isSupabaseConfigured || !this.supabase) {
            // Fallback: local only
            this.addLocal(title, message, type, category);
            return;
        }

        await this.supabase.from('notifications').insert([{
            user_id: userId,
            title,
            message,
            type,
            category,
            action_url: actionUrl || null,
            grouped_key: groupedKey || null
        }]);
    }

    async sendBulk(userIds: string[], title: string, message: string, type: Notification['type'] = 'Info', category: string = 'system') {
        if (!isSupabaseConfigured || !this.supabase) return;
        const rows = userIds.map(uid => ({
            user_id: uid, title, message, type, category
        }));
        await this.supabase.from('notifications').insert(rows);
    }

    // Local fallback (also used for immediate toast)
    addLocal(title: string, message: string, type: Notification['type'] = 'Info', category: string = 'system') {
        const notif: Notification = {
            id: `NOT-${Date.now()}`,
            title,
            message,
            type,
            time: new Date().toISOString(),
            read: false,
            category
        };
        this.notifications.update(n => [notif, ...n]);
        this.toastService.show(message, type === 'celebrate' ? 'celebrate' : (type === 'Success' ? 'success' : 'info'));
        if (type === 'celebrate') this.confettiService.launch(50);
    }

    // ===== MARK READ =====

    async markAsRead(id: string) {
        this.notifications.update(n => n.map(x => x.id === id ? { ...x, read: true } : x));
        if (isSupabaseConfigured && this.supabase) {
            await this.supabase.from('notifications').update({ is_read: true }).eq('id', id);
        }
    }

    async markAllRead() {
        const profile = this.authService.activeProfile();
        this.notifications.update(n => n.map(x => ({ ...x, read: true })));
        if (isSupabaseConfigured && this.supabase && profile) {
            await this.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', profile.id)
                .eq('is_read', false);
        }
    }

    // ===== DELETE =====

    async deleteNotification(id: string) {
        this.notifications.update(n => n.filter(x => x.id !== id));
        if (isSupabaseConfigured && this.supabase) {
            await this.supabase.from('notifications').delete().eq('id', id);
        }
    }

    // ===== REALTIME =====

    private initRealtime() {
        this.loadNotifications();

        if (!isSupabaseConfigured || !this.supabase) return;
        const profile = this.authService.activeProfile();
        if (!profile) return;

        this.supabase.channel('user-notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${profile.id}`
            }, payload => {
                const notif = this.mapDbToNotification(payload.new);
                this.notifications.update(n => {
                    if (n.some(x => x.id === notif.id)) return n;
                    return [notif, ...n];
                });
                // Show toast for new notifications
                this.toastService.show(notif.message,
                    notif.type === 'celebrate' ? 'celebrate' : (notif.type === 'Success' ? 'success' : 'info')
                );
            })
            .subscribe();
    }

    // ===== TIME HELPERS =====

    getRelativeTime(dateStr: string): string {
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        const diff = now - then;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `منذ ${hours} ساعة`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `منذ ${days} يوم`;
        return new Date(dateStr).toLocaleDateString('ar-SA');
    }

    // ===== MAPPERS =====

    private mapDbToNotification(db: any): Notification {
        return {
            id: db.id,
            userId: db.user_id,
            title: db.title,
            message: db.message,
            type: db.type || 'Info',
            category: db.category || 'system',
            time: db.created_at,
            read: db.is_read || false,
            actionUrl: db.action_url,
            groupedKey: db.grouped_key
        };
    }
}
