

import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Task } from '../../types';
import { ToastService } from '../state/toast.service';
import { environment } from '../../config/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;
  private toastService = inject(ToastService);
  private taskChannel: RealtimeChannel | null = null;
  readonly isConfigured: boolean;

  constructor() {
    const supabaseUrl = environment.supabaseUrl;
    const supabaseKey = environment.supabaseKey;

    if (!supabaseUrl || !supabaseKey) {
      this.isConfigured = false;
      const errorMessage = 'Supabase is not configured. Real-time and data persistence features are disabled. Please configure environment variables.';
      console.warn(errorMessage);
      // Mock the client to prevent crashing the app, ensuring methods exist.
      this.supabase = {
        from: () => ({
          select: async () => ({ data: [], error: { message: errorMessage, details: '', hint: '', code: '' } }),
          insert: async () => ({ data: null, error: { message: errorMessage, details: '', hint: '', code: '' } }),
          update: async () => ({ data: null, error: { message: errorMessage, details: '', hint: '', code: '' } }),
          delete: async () => ({ data: null, error: { message: errorMessage, details: '', hint: '', code: '' } }),
        }),
        channel: () => ({
          on: function () { return this; },
          subscribe: function () { return this; }
        }),
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
          signInWithPassword: async () => ({ data: { user: null }, error: { message: errorMessage } }),
          signOut: async () => ({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
        }
      } as any;
    } else {
      this.isConfigured = true;
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  get client() {
    return this.supabase;
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
    const { data, error } = await this.supabase.from('tasks').select('*');
    if (error) {
      if (this.isConfigured) {
        console.error('Error fetching tasks:', error.message);
        this.toastService.show(`خطأ في جلب البيانات: ${error.message}`, 'error');
      } else {
        console.warn(error.message);
      }
      return [];
    }

    if (!data) return [];

    return data.map(this.mapDbToTask);
  }

  async addTask(task: Omit<Task, 'id'>): Promise<Task | null> {
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
      console.error('Error adding task:', error.message);
      if (this.isConfigured) {
        this.toastService.show(`خطأ في إضافة المهمة: ${error.message}`, 'error');
      }
      return null;
    }

    if (!data) return null;

    return this.mapDbToTask(data);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<any> {
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
      console.error('Error updating task:', error.message);
      if (this.isConfigured) {
        this.toastService.show(`خطأ في تحديث المهمة: ${error.message}`, 'error');
      }
      return null;
    }
    return 'Success';
  }

  async deleteTask(id: string): Promise<any> {
    const { error } = await this.supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting task:', error.message);
      if (this.isConfigured) {
        this.toastService.show(`خطأ في حذف المهمة: ${error.message}`, 'error');
      }
      return null;
    }
    return 'Success';
  }
}