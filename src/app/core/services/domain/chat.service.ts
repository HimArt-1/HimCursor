import { Injectable, signal, inject, effect } from '@angular/core';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';
import { UserService } from './user.service';
import { ChatMessage } from '../../types';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private supabase = supabaseClient;
    private userService = inject(UserService);
    private authService = inject(AuthService);
    private realtimeInitialized = false;

    readonly messages = signal<ChatMessage[]>([]);
    readonly isConnected = signal<boolean>(false);

    constructor() {
        effect(() => {
            if (this.realtimeInitialized) return;
            if (!this.authService.sessionReady()) return;
            if (!this.authService.activeProfile()) return;
            this.initRealtime();
            this.realtimeInitialized = true;
        });
    }

    sendMessage(content: string) {
        const user = this.userService.currentUser();
        if (!user || !content.trim()) return;
        if (!isSupabaseConfigured || !this.supabase) {
            console.warn('Supabase is not configured. Chat messages are local only.');
            return;
        }

        this.supabase
            .from('chat_messages')
            .insert([{
                sender_id: user.id,
                sender_name: user.name,
                sender_avatar: user.avatarUrl,
                content: content,
                channel_id: 'global'
            }])
            .then(({ error }) => {
                if (error) console.error('Error sending message:', this.formatError(error));
            });
    }

    private initRealtime() {
        if (!isSupabaseConfigured || !this.supabase) {
            // Fallback to local storage loading if offline
            const saved = localStorage.getItem('himcontrol_chat_messages');
            if (saved) {
                try { this.messages.set(JSON.parse(saved)); } catch { }
            }
            return;
        }

        // Initial Fetch
        this.supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Error loading chat messages:', this.formatError(error));
                    return;
                }
                if (data) {
                    this.messages.set(data.map(this.mapDbToMsg));
                    this.isConnected.set(true);
                }
            });

        // Realtime Subscription
        this.supabase.channel('public:chat_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
                const newMsg = this.mapDbToMsg(payload.new);
                this.messages.update(curr => [...curr, newMsg]);
            })
            .subscribe();
    }

    private mapDbToMsg(db: any): ChatMessage {
        return {
            id: db.id,
            senderId: db.sender_id,
            senderName: db.sender_name,
            senderAvatar: db.sender_avatar,
            content: db.content,
            timestamp: db.created_at,
            status: 'sent',
            channelId: db.channel_id
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
