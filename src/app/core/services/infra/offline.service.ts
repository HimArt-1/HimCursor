import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OfflineService implements OnDestroy {
    /** Whether the browser is currently online */
    readonly isOnline = signal(navigator.onLine);

    /** Pending messages queued while offline */
    private readonly QUEUE_KEY = 'washa_control_offline_queue';

    private onlineHandler = () => this.handleOnline();
    private offlineHandler = () => this.handleOffline();

    constructor() {
        window.addEventListener('online', this.onlineHandler);
        window.addEventListener('offline', this.offlineHandler);
    }

    private handleOnline() {
        this.isOnline.set(true);
        this.flushQueue();
    }

    private handleOffline() {
        this.isOnline.set(false);
    }

    /** Queue an action to be executed when back online */
    queueAction(action: { type: string; payload: any }) {
        const queue = this.getQueue();
        queue.push({ ...action, queuedAt: Date.now() });
        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    }

    /** Get all queued actions */
    getQueue(): any[] {
        try {
            return JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    /** Flush the queue — called by services that handle the actions */
    flushQueue(): any[] {
        const queue = this.getQueue();
        localStorage.removeItem(this.QUEUE_KEY);
        return queue;
    }

    ngOnDestroy() {
        window.removeEventListener('online', this.onlineHandler);
        window.removeEventListener('offline', this.offlineHandler);
    }
}
