import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { ConfettiService } from './confetti.service';
import { Notification, SystemAlert } from '../../types';

@Injectable({ providedIn: 'root' })
export class UiService {
    private toastService = inject(ToastService);
    private confettiService = inject(ConfettiService);

    // App Settings
    readonly darkMode = signal<boolean>(false);
    readonly showNotifications = signal<boolean>(false);
    readonly isMobileMenuOpen = signal<boolean>(false);
    readonly isAiAssistantOpen = signal<boolean>(false);

    // UI Data
    readonly notifications = signal<Notification[]>([]);
    readonly systemAlerts = signal<SystemAlert[]>([]);

    constructor() {
        this.loadLocalSettings();

        effect(() => {
            this.saveLocalSettings();
            this.applyTheme();
        });
    }

    // --- UI State Logic ---
    toggleMobileMenu() { this.isMobileMenuOpen.update(v => !v); }
    closeMobileMenu() { this.isMobileMenuOpen.set(false); }
    toggleDarkMode() { this.darkMode.update(v => !v); }
    toggleNotifications() { this.showNotifications.update(v => !v); }
    toggleAiAssistant() { this.isAiAssistantOpen.update(v => !v); }

    private applyTheme() {
        if (this.darkMode()) { document.documentElement.classList.add('dark'); }
        else { document.documentElement.classList.remove('dark'); }
    }

    // --- Notification Logic ---
    addNotification(title: string, message: string, type: Notification['type'] = 'Info') {
        const notif: Notification = { id: `NOT-${Date.now()}`, title, message, type, time: new Date().toISOString(), read: false };
        this.notifications.update(n => [notif, ...n]);
        this.toastService.show(message, type === 'celebrate' ? 'celebrate' : (type === 'Success' ? 'success' : 'info'));
        if (type === 'celebrate') this.confettiService.launch(50);
    }

    markAllNotificationsRead() { this.notifications.update(n => n.map(x => ({ ...x, read: true }))); }
    deleteNotification(id: string) { this.notifications.update(n => n.filter(x => x.id !== id)); }

    // --- System Alert Logic ---
    sendSystemAlert(message: string, sender: string = 'Admin', targetUser: string = 'All') {
        const alert: SystemAlert = { id: `ALT-${Date.now()}`, message, sender, targetUser, timestamp: new Date().toISOString(), seenBy: [] };
        this.systemAlerts.update(alerts => [alert, ...alerts]);
    }

    markAlertSeen(alertId: string, userId: string) {
        this.systemAlerts.update(alerts => alerts.map(a => a.id === alertId ? { ...a, seenBy: [...a.seenBy, userId] } : a));
    }

    getActiveAlert(userId: string | null) {
        return computed(() => {
            if (!userId) return null;
            return this.systemAlerts().find(a => (a.targetUser === 'All' || a.targetUser === userId) && !a.seenBy.includes(userId)) || null;
        });
    }

    // --- Persistence ---
    private loadLocalSettings() {
        const settings = localStorage.getItem('himcontrol_settings');
        if (settings) { this.darkMode.set(JSON.parse(settings).darkMode ?? false); }
    }

    private saveLocalSettings() {
        localStorage.setItem('himcontrol_settings', JSON.stringify({ darkMode: this.darkMode() }));
    }
}
