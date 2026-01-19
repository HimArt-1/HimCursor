import { Injectable, signal, inject, effect } from '@angular/core';
import { SupabaseService } from '../infra/supabase.service';
import { UserService } from './user.service';
import { ChatMessage } from '../../types';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private supabase = inject(SupabaseService);
    private userService = inject(UserService);

    readonly messages = signal<ChatMessage[]>([]);
    readonly isConnected = signal<boolean>(false);

    constructor() {
        // Initialize Realtime directly
        this.initRealtime();
    }

    sendMessage(content: string) {
        const user = this.userService.currentUser();
        if (!user || !content.trim()) return;

        const msgPayload = {
            sender_id: user.id,
            sender_name: user.name,
            sender_avatar: user.avatarUrl,
            content: content,
            channel_id: 'global'
        };

        // Optimistic UI update (optional, but good for UX)
        // We'll rely on the subscription to confirm it, 
        // OR push locally and handle ID later. 
        // For simplicity, let's just insert and wait for echo.

        this.supabase.client
            .from('chat_messages')
            .insert([msgPayload])
            .then(({ error }) => {
                if (error) console.error('Error sending message:', error);
            });
    }

    private initRealtime() {
        if (!this.supabase.isConfigured) {
            // Fallback to local storage loading if offline
            const saved = localStorage.getItem('himcontrol_chat_messages');
            if (saved) {
                try { this.messages.set(JSON.parse(saved)); } catch { }
            }
            return;
        }

        // Initial Fetch
        this.supabase.client
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50)
            .then(({ data }) => {
                if (data) {
                    this.messages.set(data.map(this.mapDbToMsg));
                    this.isConnected.set(true);
                }
            });

        // Realtime Subscription
        this.supabase.client.channel('public:chat_messages')
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
}
