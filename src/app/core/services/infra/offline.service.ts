import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OfflineService implements OnDestroy {
    /** Whether the browser is currently online */
    readonly isOnline = signal(navigator.onLine);

    /** Pending messages queued while offline */
    private readonly QUEUE_KEY = 'washa_control_offline_queue';

    /** PWA Installation State */
    deferredPrompt: any = null;
    readonly canInstall = signal(false);

    private onlineHandler = () => this.handleOnline();
    private offlineHandler = () => this.handleOffline();
    private installPromptHandler = (e: Event) => this.handleInstallPrompt(e);

    constructor() {
        window.addEventListener('online', this.onlineHandler);
        window.addEventListener('offline', this.offlineHandler);
        window.addEventListener('beforeinstallprompt', this.installPromptHandler);
    }

    private handleInstallPrompt(e: Event) {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        this.deferredPrompt = e;
        this.canInstall.set(true);
    }

    async promptInstallation() {
        if (!this.deferredPrompt) return;
        
        // Show the install prompt
        this.deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the PWA installation');
        } else {
            console.log('User dismissed the PWA installation');
        }
        
        // We've used the prompt, and can't use it again, throw it away
        this.deferredPrompt = null;
        this.canInstall.set(false);
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
        window.removeEventListener('beforeinstallprompt', this.installPromptHandler);
    }
}
