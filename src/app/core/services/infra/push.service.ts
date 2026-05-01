import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { SupabaseService } from './supabase.service';
import { ToastService } from '../state/toast.service';

@Injectable({
  providedIn: 'root'
})
export class PushService {
  private swPush = inject(SwPush);
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  // VAPID Public Key - Normally loaded from environment variables
  // This is a placeholder and should be replaced with an actual key generated using web-push
  readonly VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuB-5S_vWwT9xI_Wp_QjP0Vf5Y';

  constructor() {
    // Listen for incoming notifications when the app is open
    this.swPush.messages.subscribe(message => {
      console.log('Push message received:', message);
      // We can also trigger local toasts here if needed
    });
  }

  async requestPermissionAndSubscribe() {
    if (!this.swPush.isEnabled) {
      this.toast.show('Push notifications are not supported in this environment', 'error');
      return false;
    }

    try {
      // Request subscription from the browser
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });

      console.log('Subscription object:', sub);
      const subJSON = sub.toJSON();

      if (!subJSON.endpoint || !subJSON.keys) {
         throw new Error('Invalid subscription object');
      }

      // Get current user
      const user = await this.supabase.client.auth.getUser();
      if (!user.data.user) {
         throw new Error('User not authenticated');
      }

      // Store in Supabase
      const { error } = await this.supabase.client
        .from('push_subscriptions')
        .upsert({
          user_id: user.data.user.id,
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys['p256dh'],
          auth: subJSON.keys['auth'],
          device_name: navigator.userAgent.substring(0, 50) // Basic device identifier
        }, { onConflict: 'user_id, endpoint' });

      if (error) throw error;

      this.toast.show('تم تفعيل الإشعارات الفورية بنجاح', 'success');
      return true;

    } catch (err: any) {
      console.error('Could not subscribe to notifications', err);
      this.toast.show('فشل في تفعيل الإشعارات: ' + (err.message || ''), 'error');
      return false;
    }
  }

  async revokeSubscription() {
    try {
      const user = await this.supabase.client.auth.getUser();
      // Delete from Supabase first
      if (user.data.user) {
         await this.supabase.client
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.data.user.id);
      }
      
      // Unsubscribe from browser
      await this.swPush.unsubscribe();
      this.toast.show('تم إيقاف الإشعارات', 'info');
      
    } catch (err) {
      console.error('Error unsubscribing', err);
    }
  }
}
