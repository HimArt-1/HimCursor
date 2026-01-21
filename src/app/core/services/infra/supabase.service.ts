

import { Injectable, inject } from '@angular/core';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Task } from '../../types';
import { ToastService } from '../state/toast.service';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';
import { AuthService } from '../domain/auth.service';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private taskChannel: RealtimeChannel | null = null;
  readonly isConfigured: boolean;

  constructor() {
    if (!isSupabaseConfigured || !supabaseClient) {
      this.isConfigured = false;
      const errorMessage = 'Supabase is not configured. Real-time and data persistence features are disabled. Please configure environment variables.';
      console.warn(errorMessage);
      // Mock the client to prevent crashing the app, ensuring methods exist.
      this.supabase = {
        from: () => ({
          select: async () => ({ data: [], error: { message: errorMessage, details: '', hint: '', code: '', status: 400 } }),
          insert: async () => ({ data: null, error: { message: errorMessage, details: '', hint: '', code: '', status: 400 } }),
          update: async () => ({ data: null, error: { message: errorMessage, details: '', hint: '', code: '', status: 400 } }),
          delete: async () => ({ data: null, error: { message: errorMessage, details: '', hint: '', code: '', status: 400 } }),
        }),
        channel: () => ({
          on: function () { return this; },
          subscribe: function () { return this; }
        }),
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
          signInWithPassword: async () => ({ data: { user: null }, error: { message: errorMessage, status: 400 } }),
          signOut: async () => ({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
        }
      } as any;
    } else {
      this.isConfigured = true;
      this.supabase = supabaseClient;
    }
  }

  get client() {
    return this.supabase;
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

  listenToTasks(
    onInsert: (task: Task) => void,
    onUpdate: (task: Task) => void,
    onDelete: (id: string) => void
  ) {
    if (this.taskChannel || !this.isConfigured) return;

    this.taskChannel = this.supabase.channel('public:tasks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Realtime INSERT received:', payload);
        onInsert(this.mapDbToTask(payload.new));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Realtime UPDATE received:', payload);
        onUpdate(this.mapDbToTask(payload.new));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('Realtime DELETE received:', payload);
        onDelete(payload.old.id);
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to real-time task updates!');
        }
        if (err) {
          console.error('Real-time subscription error:', err);
        }
      });
  }

  private mapDbToTask(dbRecord: any): Task {
    return {
      id: dbRecord.id,
      title: dbRecord.title,
      description: dbRecord.description,
      domain: dbRecord.domain,
      owner: dbRecord.owner,
      priority: dbRecord.priority,
      status: dbRecord.status,
      dueDate: dbRecord.due_date,
      tags: dbRecord.tags,
    };
  }

  async getTasks(): Promise<Task[]> {
    await this.authService.ensureSession();
    const { data, error } = await this.supabase.from('tasks').select('*');
    if (error) {
      if (this.isConfigured) {
        const detail = this.formatError(error);
        console.error('Error fetching tasks:', detail);
        this.toastService.show(`خطأ في جلب البيانات: ${detail}`, 'error');
      } else {
        console.warn(this.formatError(error));
      }
      return [];
    }

    if (!data) return [];

    return data.map(this.mapDbToTask);
  }

  async addTask(task: Omit<Task, 'id'>): Promise<Task | null> {
    await this.authService.ensureSession();

    const taskForDb = {
      title: task.title,
      description: task.description,
      domain: task.domain,
      owner: task.owner,
      priority: task.priority,
      status: task.status,
      due_date: task.dueDate,
      tags: task.tags
    };

    const { data, error } = await this.supabase
      .from('tasks')
      .insert([taskForDb])
      .select()
      .single();

    if (error) {
      const detail = this.formatError(error);
      console.error('Error adding task:', detail);
      if (this.isConfigured) {
        this.toastService.show(`خطأ في إضافة المهمة: ${detail}`, 'error');
      }
      return null;
    }

    if (!data) return null;

    return this.mapDbToTask(data);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<any> {
    await this.authService.ensureSession();

    const updatesForDb: any = {};
    if (updates.title !== undefined) updatesForDb.title = updates.title;
    if (updates.description !== undefined) updatesForDb.description = updates.description;
    if (updates.domain) updatesForDb.domain = updates.domain;
    if (updates.owner) updatesForDb.owner = updates.owner;
    if (updates.priority) updatesForDb.priority = updates.priority;
    if (updates.status) updatesForDb.status = updates.status;
    if (updates.dueDate) updatesForDb.due_date = updates.dueDate;
    if (updates.tags) updatesForDb.tags = updates.tags;

    const { error } = await this.supabase
      .from('tasks')
      .update(updatesForDb)
      .eq('id', id);

    if (error) {
      const detail = this.formatError(error);
      console.error('Error updating task:', detail);
      if (this.isConfigured) {
        this.toastService.show(`خطأ في تحديث المهمة: ${detail}`, 'error');
      }
      return null;
    }
    return 'Success';
  }

  async deleteTask(id: string): Promise<any> {
    await this.authService.ensureSession();

    const { error } = await this.supabase.from('tasks').delete().eq('id', id);
    if (error) {
      const detail = this.formatError(error);
      console.error('Error deleting task:', detail);
      if (this.isConfigured) {
        this.toastService.show(`خطأ في حذف المهمة: ${detail}`, 'error');
      }
      return null;
    }
    return 'Success';
  }
}