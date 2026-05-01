import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OfflineService implements OnDestroy {
    readonly isOnline = signal(navigator.onLine);
    private db!: IDBDatabase;
    private readonly DB_NAME = 'WashaOfflineDB';
    private readonly DB_VERSION = 1;

    deferredPrompt: any = null;
    readonly canInstall = signal(false);

    private onlineHandler = () => this.handleOnline();
    private offlineHandler = () => this.handleOffline();
    private installPromptHandler = (e: Event) => this.handleInstallPrompt(e);

    constructor() {
        window.addEventListener('online', this.onlineHandler);
        window.addEventListener('offline', this.offlineHandler);
        window.addEventListener('beforeinstallprompt', this.installPromptHandler);
        this.initDB();
    }

    private initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB init error', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('sync_queue')) {
                    db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    async cacheData(key: string, data: any): Promise<void> {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('cache', 'readwrite');
            const store = tx.objectStore('cache');
            store.put({ key, data, timestamp: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getCachedData(key: string): Promise<any | null> {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('cache', 'readonly');
            const store = tx.objectStore('cache');
            const request = store.get(key);
            request.onsuccess = () => {
                resolve(request.result ? request.result.data : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async queueAction(action: { type: string; payload: any }): Promise<void> {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sync_queue', 'readwrite');
            const store = tx.objectStore('sync_queue');
            store.add({ ...action, queuedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getQueue(): Promise<any[]> {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sync_queue', 'readonly');
            const store = tx.objectStore('sync_queue');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async clearQueueItem(id: number): Promise<void> {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('sync_queue', 'readwrite');
            const store = tx.objectStore('sync_queue');
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    private handleInstallPrompt(e: Event) {
        e.preventDefault();
        this.deferredPrompt = e;
        this.canInstall.set(true);
    }

    async promptInstallation() {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        this.deferredPrompt = null;
        this.canInstall.set(false);
    }

    private handleOnline() {
        this.isOnline.set(true);
        window.dispatchEvent(new CustomEvent('washa_online'));
    }

    private handleOffline() {
        this.isOnline.set(false);
    }

    ngOnDestroy() {
        window.removeEventListener('online', this.onlineHandler);
        window.removeEventListener('offline', this.offlineHandler);
        window.removeEventListener('beforeinstallprompt', this.installPromptHandler);
    }
}
