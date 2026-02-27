import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';
import { AuthService } from '../domain/auth.service';

@Injectable({ providedIn: 'root' })
export class PresenceService implements OnDestroy {
    private authService = inject(AuthService);
    private supabase = supabaseClient;
    private channel: any = null;
    private heartbeatInterval: any = null;

    /** Set of currently online user IDs — updated in real-time */
    readonly onlineUserIds = signal<Set<string>>(new Set());

    /** Whether the presence system is connected */
    readonly isConnected = signal(false);

    constructor() {
        // Wait for auth before starting
        setTimeout(() => this.init(), 2000);
    }

    private async init() {
        if (!isSupabaseConfigured || !this.supabase) return;

        const profile = this.authService.activeProfile();
        if (!profile) {
            // Retry in 3 seconds
            setTimeout(() => this.init(), 3000);
            return;
        }

        // 1. Start sending heartbeats (update last_seen every 30s)
        this.sendHeartbeat();
        this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 30000);

        // 2. Join Supabase Realtime Presence channel
        this.joinPresenceChannel(profile.id, profile.name);
    }

    private joinPresenceChannel(userId: string, userName: string) {
        if (!this.supabase) return;

        this.channel = this.supabase.channel('online-users', {
            config: { presence: { key: userId } }
        });

        this.channel
            .on('presence', { event: 'sync' }, () => {
                const state = this.channel.presenceState();
                const ids = new Set<string>();
                for (const key of Object.keys(state)) {
                    ids.add(key);
                }
                this.onlineUserIds.set(ids);
            })
            .on('presence', { event: 'join' }, ({ key }: any) => {
                this.onlineUserIds.update(set => {
                    const newSet = new Set(set);
                    newSet.add(key);
                    return newSet;
                });
            })
            .on('presence', { event: 'leave' }, ({ key }: any) => {
                this.onlineUserIds.update(set => {
                    const newSet = new Set(set);
                    newSet.delete(key);
                    return newSet;
                });
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await this.channel.track({
                        user_id: userId,
                        user_name: userName,
                        online_at: new Date().toISOString()
                    });
                    this.isConnected.set(true);
                }
            });
    }

    private async sendHeartbeat() {
        if (!this.supabase) return;
        const profile = this.authService.activeProfile();
        if (!profile) return;

        await this.supabase
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', profile.id);
    }

    /** Check if a specific user is online right now */
    isUserOnline(userId: string): boolean {
        return this.onlineUserIds().has(userId);
    }

    ngOnDestroy() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.channel) {
            this.channel.unsubscribe();
            this.channel = null;
        }
        this.isConnected.set(false);
    }
}
