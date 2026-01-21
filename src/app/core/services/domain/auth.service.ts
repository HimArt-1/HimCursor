import { Injectable, signal, computed } from '@angular/core';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';

export interface ActiveProfile {
  id: string;
  name: string;
  role: 'admin' | 'supervisor' | 'user' | string;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = supabaseClient;
  private readonly activeProfileKey = 'himcontrol_active_profile';

  readonly session = signal<Session | null>(null);
  readonly sessionReady = signal<boolean>(false);
  readonly activeProfile = signal<ActiveProfile | null>(null);
  readonly adminUser = signal<SupabaseUser | null>(null);

  readonly hasActiveProfile = computed(() => !!this.activeProfile());
  readonly hasSession = computed(() => !!this.session());

  constructor() {
    this.restoreActiveProfile();
    this.ensureSession();
    this.attachAuthListener();
  }

  private attachAuthListener() {
    if (!this.supabase) return;
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.sessionReady.set(true);
      const user = session?.user || null;
      if (user && !user.is_anonymous) {
        this.adminUser.set(user);
        this.loadProfile(user.id);
      } else {
        this.adminUser.set(null);
        if (!session) {
          this.activeProfile.set(null);
          localStorage.removeItem(this.activeProfileKey);
        }
      }
    });
  }

  async ensureSession(): Promise<Session | null> {
    if (!this.supabase || !isSupabaseConfigured) {
      this.sessionReady.set(true);
      return null;
    }

    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      console.error('Supabase getSession error:', this.formatError(error));
    }

    this.session.set(data.session);
    this.sessionReady.set(true);
    return data.session;
  }

  async loginWithEmailPassword(email: string, password: string): Promise<boolean> {
    if (!this.supabase || !isSupabaseConfigured) return false;
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', this.formatError(error));
      return false;
    }
    if (data.user) {
      await this.loadProfile(data.user.id);
      return true;
    }
    return false;
  }

  logout() {
    this.activeProfile.set(null);
    localStorage.removeItem(this.activeProfileKey);
    if (this.supabase && isSupabaseConfigured) {
      this.supabase.auth.signOut();
    }
  }

  async adminLogin(email: string, password: string): Promise<boolean> {
    return this.loginWithEmailPassword(email, password);
  }

  async adminLogout() {
    if (!this.supabase || !isSupabaseConfigured) return;
    await this.supabase.auth.signOut();
    this.adminUser.set(null);
    await this.ensureSession();
  }

  private async loadProfile(userId: string) {
    if (!this.supabase || !isSupabaseConfigured) return;
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id,name,role,is_active')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Load profile error:', this.formatError(error));
      return;
    }
    if (data) {
      const profile: ActiveProfile = {
        id: data.id,
        name: data.name,
        role: data.role,
        is_active: data.is_active
      };
      this.activeProfile.set(profile);
      localStorage.setItem(this.activeProfileKey, JSON.stringify(profile));
      if (data.role === 'admin') {
        const sessionUser = this.session()?.user || null;
        if (sessionUser) this.adminUser.set(sessionUser);
      } else {
        this.adminUser.set(null);
      }
    }
  }

  private restoreActiveProfile() {
    const stored = localStorage.getItem(this.activeProfileKey);
    if (!stored) return;
    try {
      this.activeProfile.set(JSON.parse(stored));
    } catch {
      localStorage.removeItem(this.activeProfileKey);
    }
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
