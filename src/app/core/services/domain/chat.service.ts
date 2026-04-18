import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';
import { UserService } from './user.service';
import { ChatMessage, ChatChannel, ChatChannelMember } from '../../types';
import { AuthService } from './auth.service';
import { OfflineService } from '../infra/offline.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private supabase = supabaseClient;
    private userService = inject(UserService);
    private authService = inject(AuthService);
    private offlineService = inject(OfflineService);
    private realtimeInitialized = false;

    // Channels
    readonly channels = signal<ChatChannel[]>([]);
    readonly activeChannelId = signal<string>('global');
    readonly activeChannel = computed(() =>
        this.channels().find(c => c.id === this.activeChannelId()) || null
    );

    // Messages for active channel
    readonly messages = signal<ChatMessage[]>([]);
    readonly isConnected = signal<boolean>(false);
    readonly isLoading = signal(false);

    // Reply state
    readonly replyingTo = signal<ChatMessage | null>(null);

    // Typing indicator
    readonly typingUsers = signal<string[]>([]);
    private typingTimeout: any;

    // Search
    readonly searchQuery = signal('');
    readonly searchResults = computed(() => {
        const q = this.searchQuery().toLowerCase().trim();
        if (!q) return [];
        return this.messages().filter(m =>
            m.content.toLowerCase().includes(q) ||
            m.senderName.toLowerCase().includes(q)
        );
    });

    // Pinned messages
    readonly pinnedMessages = computed(() =>
        this.messages().filter(m => m.isPinned)
    );

    // Unread counts
    private readonly LAST_SEEN_KEY = 'washa_control_chat_last_seen';
    private lastSeenByChannel = signal<Record<string, number>>({});

    readonly unreadCount = computed(() => {
        const allSeen = this.lastSeenByChannel();
        let total = 0;
        const channelId = this.activeChannelId();
        const lastSeen = allSeen[channelId] || 0;
        total = this.messages().filter(m => new Date(m.timestamp).getTime() > lastSeen).length;
        return total;
    });

    readonly totalUnreadCount = computed(() => {
        // Simple approach: count for active channel only
        return this.unreadCount();
    });

    // Channel members
    readonly channelMembers = signal<ChatChannelMember[]>([]);

    private readonly MESSAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days now

    constructor() {
        // Restore last seen state
        try {
            const saved = localStorage.getItem(this.LAST_SEEN_KEY);
            if (saved) this.lastSeenByChannel.set(JSON.parse(saved));
        } catch { }

        effect(() => {
            if (this.realtimeInitialized) return;
            if (!this.authService.sessionReady()) return;
            if (!this.authService.activeProfile()) return;
            this.initRealtime();
            this.realtimeInitialized = true;
        });
    }

    // ===== CHANNELS =====

    async loadChannels() {
        if (!isSupabaseConfigured || !this.supabase) return;
        const { data, error } = await this.supabase
            .from('chat_channels')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error loading channels:', error);
            return;
        }
        if (data) {
            this.channels.set(data.map(this.mapDbToChannel));
        }
    }

    async createChannel(name: string, type: 'group' | 'project' | 'direct', icon: string, description?: string, memberIds?: string[]) {
        if (!isSupabaseConfigured || !this.supabase) return;
        const user = this.userService.currentUser();
        if (!user) return;

        const { data, error } = await this.supabase
            .from('chat_channels')
            .insert([{ name, type, icon, description, created_by: user.id }])
            .select()
            .single();

        if (error) {
            console.error('Create channel error:', error);
            return;
        }

        if (data) {
            // Add creator as admin
            await this.supabase.from('chat_channel_members').insert([
                { channel_id: data.id, user_id: user.id, role: 'admin' }
            ]);

            // Add other members
            if (memberIds?.length) {
                const members = memberIds.map(uid => ({
                    channel_id: data.id, user_id: uid, role: 'member'
                }));
                await this.supabase.from('chat_channel_members').insert(members);
            }

            this.channels.update(ch => [this.mapDbToChannel(data), ...ch]);
            this.switchChannel(data.id);
        }
    }

    switchChannel(channelId: string) {
        this.activeChannelId.set(channelId);
        this.replyingTo.set(null);
        this.searchQuery.set('');
        this.loadMessagesForChannel(channelId);
        this.loadChannelMembers(channelId);
    }

    async loadChannelMembers(channelId: string) {
        if (!isSupabaseConfigured || !this.supabase || channelId === 'global') {
            this.channelMembers.set([]);
            return;
        }
        const { data } = await this.supabase
            .from('chat_channel_members')
            .select('*, profiles:user_id(name, avatar_url)')
            .eq('channel_id', channelId);

        if (data) {
            this.channelMembers.set(data.map((d: any) => ({
                id: d.id,
                channelId: d.channel_id,
                userId: d.user_id,
                userName: d.profiles?.name,
                userAvatar: d.profiles?.avatar_url,
                role: d.role,
                joinedAt: d.joined_at
            })));
        }
    }

    // ===== MESSAGES =====

    async loadMessagesForChannel(channelId: string) {
        if (!isSupabaseConfigured || !this.supabase) return;
        this.isLoading.set(true);

        const { data, error } = await this.supabase
            .from('chat_messages')
            .select('*')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true })
            .limit(100);

        this.isLoading.set(false);

        if (error) {
            console.error('Error loading messages:', error);
            return;
        }

        if (data) {
            const now = Date.now();
            const fresh = data.filter((msg: any) =>
                (now - new Date(msg.created_at).getTime()) <= this.MESSAGE_TTL_MS
            );
            this.messages.set(fresh.map(this.mapDbToMsg));
        }
    }

    sendMessage(content: string, messageType: 'text' | 'image' | 'file' = 'text', fileUrl?: string, fileName?: string, fileSize?: number) {
        const user = this.userService.currentUser();
        if (!user || (!content.trim() && messageType === 'text')) return;

        const channelId = this.activeChannelId();
        const replyTo = this.replyingTo();

        if (!isSupabaseConfigured || !this.supabase) {
            if (!this.offlineService.isOnline()) {
                this.offlineService.queueAction({
                    type: 'chat_message',
                    payload: { content, channelId, messageType, fileUrl, fileName, fileSize, replyToId: replyTo?.id }
                });
            }
            return;
        }

        this.supabase
            .from('chat_messages')
            .insert([{
                sender_id: user.id,
                sender_name: user.name,
                sender_avatar: user.avatarUrl,
                content: content,
                channel_id: channelId,
                message_type: messageType,
                file_url: fileUrl || null,
                file_name: fileName || null,
                file_size: fileSize || null,
                reply_to_id: replyTo?.id || null
            }])
            .then(({ error }) => {
                if (error) console.error('Error sending message:', error);
            });

        this.replyingTo.set(null);
    }

    // ===== REACTIONS =====

    async toggleReaction(messageId: string, emoji: string) {
        if (!isSupabaseConfigured || !this.supabase) return;
        const user = this.userService.currentUser();
        if (!user) return;

        const msg = this.messages().find(m => m.id === messageId);
        if (!msg) return;

        const reactions = { ...(msg.reactions || {}) };
        const users = reactions[emoji] || [];

        if (users.includes(user.id)) {
            reactions[emoji] = users.filter(id => id !== user.id);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            reactions[emoji] = [...users, user.id];
        }

        await this.supabase
            .from('chat_messages')
            .update({ reactions })
            .eq('id', messageId);

        // Optimistic update
        this.messages.update(msgs =>
            msgs.map(m => m.id === messageId ? { ...m, reactions } : m)
        );
    }

    // ===== PIN =====

    async togglePin(messageId: string) {
        if (!isSupabaseConfigured || !this.supabase) return;
        const msg = this.messages().find(m => m.id === messageId);
        if (!msg) return;

        const newPinned = !msg.isPinned;
        await this.supabase
            .from('chat_messages')
            .update({ is_pinned: newPinned })
            .eq('id', messageId);

        this.messages.update(msgs =>
            msgs.map(m => m.id === messageId ? { ...m, isPinned: newPinned } : m)
        );
    }

    // ===== DELETE =====

    async deleteMessage(messageId: string) {
        if (!isSupabaseConfigured || !this.supabase) return;
        await this.supabase.from('chat_messages').delete().eq('id', messageId);
        this.messages.update(msgs => msgs.filter(m => m.id !== messageId));
    }

    // ===== TYPING INDICATOR =====

    notifyTyping() {
        if (!this.supabase) return;
        const user = this.userService.currentUser();
        if (!user) return;

        const channel = this.supabase.channel(`typing:${this.activeChannelId()}`);
        channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userName: user.name }
        });

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.typingUsers.set([]);
        }, 3000);
    }

    // ===== REALTIME =====

    private initRealtime() {
        if (!isSupabaseConfigured || !this.supabase) {
            const saved = localStorage.getItem('washa_control_chat_messages');
            if (saved) {
                try { this.messages.set(JSON.parse(saved)); } catch { }
            }
            return;
        }

        // Load channels first
        this.loadChannels();
        // Load messages for default channel
        this.loadMessagesForChannel(this.activeChannelId());

        // Subscribe to message changes across all channels
        this.supabase.channel('public:chat_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
                const newMsg = this.mapDbToMsg(payload.new);
                // Only add if it's for the active channel
                if (newMsg.channelId === this.activeChannelId()) {
                    this.messages.update(curr => {
                        // Prevent duplicates
                        if (curr.some(m => m.id === newMsg.id)) return curr;
                        return [...curr, newMsg];
                    });
                }
                // Update channel list order
                this.channels.update(chs =>
                    chs.map(ch => ch.id === newMsg.channelId
                        ? { ...ch, lastMessageAt: newMsg.timestamp, lastMessagePreview: newMsg.content }
                        : ch
                    ).sort((a, b) => {
                        if (a.isDefault) return -1;
                        if (b.isDefault) return 1;
                        return new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime();
                    })
                );
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, payload => {
                const deletedId = payload.old?.id;
                if (deletedId) {
                    this.messages.update(curr => curr.filter(m => m.id !== deletedId));
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, payload => {
                const updated = this.mapDbToMsg(payload.new);
                if (updated.channelId === this.activeChannelId()) {
                    this.messages.update(curr =>
                        curr.map(m => m.id === updated.id ? updated : m)
                    );
                }
            })
            .subscribe();

        // Subscribe to channel changes
        this.supabase.channel('public:chat_channels')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_channels' }, payload => {
                const ch = this.mapDbToChannel(payload.new);
                this.channels.update(chs => {
                    if (chs.some(c => c.id === ch.id)) return chs;
                    return [ch, ...chs];
                });
            })
            .subscribe();

        // Typing indicator channel
        this.supabase.channel(`typing:${this.activeChannelId()}`)
            .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
                const userName = payload?.userName;
                const currentUser = this.userService.currentUser();
                if (!userName || userName === currentUser?.name) return;

                this.typingUsers.update(users => {
                    if (users.includes(userName)) return users;
                    return [...users, userName];
                });

                setTimeout(() => {
                    this.typingUsers.update(users => users.filter(u => u !== userName));
                }, 3000);
            })
            .subscribe();

        this.isConnected.set(true);

        // Flush offline queue
        if (this.offlineService.isOnline()) {
            const queue = this.offlineService.flushQueue();
            for (const action of queue) {
                if (action.type === 'chat_message') {
                    this.sendMessage(action.payload.content, action.payload.messageType);
                }
            }
        }
    }

    // ===== MARK AS READ =====

    markAsRead() {
        const now = Date.now();
        const channelId = this.activeChannelId();
        this.lastSeenByChannel.update(state => {
            const updated = { ...state, [channelId]: now };
            localStorage.setItem(this.LAST_SEEN_KEY, JSON.stringify(updated));
            return updated;
        });
    }

    // ===== REPLY =====

    setReplyTo(message: ChatMessage | null) {
        this.replyingTo.set(message);
    }

    // ===== MAPPERS =====

    private mapDbToMsg(db: any): ChatMessage {
        return {
            id: db.id,
            senderId: db.sender_id,
            senderName: db.sender_name,
            senderAvatar: db.sender_avatar,
            content: db.content,
            timestamp: db.created_at,
            channelId: db.channel_id,
            status: 'sent',
            messageType: db.message_type || 'text',
            fileUrl: db.file_url,
            fileName: db.file_name,
            fileSize: db.file_size,
            replyToId: db.reply_to_id,
            isPinned: db.is_pinned || false,
            reactions: db.reactions || {}
        };
    }

    private mapDbToChannel(db: any): ChatChannel {
        return {
            id: db.id,
            name: db.name,
            description: db.description,
            type: db.type,
            icon: db.icon || '💬',
            createdBy: db.created_by,
            isDefault: db.is_default || false,
            createdAt: db.created_at,
            updatedAt: db.updated_at
        };
    }

    isMe(senderId: string): boolean {
        return this.userService.currentUser()?.id === senderId;
    }
}
