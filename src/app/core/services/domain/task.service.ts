import { Injectable, signal, inject, computed } from '@angular/core';
import { Task } from '../../types';
import { SupabaseService } from '../infra/supabase.service';
import { AuditService } from '../infra/audit.service';
import { UiService } from '../state/ui.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class TaskService {
    private supabaseService = inject(SupabaseService);
    private auditService = inject(AuditService);
    private uiService = inject(UiService);
    private userService = inject(UserService);

    readonly tasks = signal<Task[]>([]);

    readonly stats = computed(() => {
        const t = this.tasks();
        return {
            totalTasks: t.length,
            doneTasks: t.filter(x => x.status === 'Done').length,
            doingTasks: t.filter(x => x.status === 'Doing').length,
            todoTasks: t.filter(x => x.status === 'Todo').length
        };
    });

    async initSupabase() {
        if (!this.supabaseService.isConfigured) {
            if (!localStorage.getItem('himcontrol_tasks_migrated')) {
                this.seedData();
            } else {
                const stored = localStorage.getItem('himcontrol_tasks_local');
                if (stored) this.tasks.set(JSON.parse(stored));
            }
            return;
        }

        const tasks = await this.supabaseService.getTasks();
        this.tasks.set(tasks);

        this.supabaseService.listenToTasks(
            (newTask) => this.handleRealtimeInsert(newTask),
            (updatedTask) => this.handleRealtimeUpdate(updatedTask),
            (deletedId) => this.handleRealtimeDelete(deletedId)
        );
    }

    // --- Realtime Handlers ---
    private handleRealtimeInsert(task: Task) {
        this.tasks.update(current => [task, ...current.filter(t => t.id !== task.id)]);
        this.auditService.logChange('System', 'Create', 'Task', task.id, `Live: ${task.title}`);
        this.uiService.addNotification('مهمة جديدة', `أضيفت: ${task.title}`, 'Success');
    }

    private handleRealtimeUpdate(task: Task) {
        const oldTask = this.tasks().find(t => t.id === task.id);
        this.tasks.update(current => current.map(t => t.id === task.id ? task : t));
        this.auditService.logChange('System', 'Update', 'Task', task.id, `Live: ${task.title} status is ${task.status}`);

        if (oldTask?.status !== 'Done' && task.status === 'Done') {
            this.uiService.addNotification('إنجاز عظيم', `🎉 ${task.owner} أنجز مهمة!`, 'celebrate');
        }
    }

    private handleRealtimeDelete(id: string) {
        this.tasks.update(current => current.filter(t => t.id !== id));
        this.auditService.logChange('System', 'Delete', 'Task', id, `Live: Task deleted`);
        this.uiService.addNotification('حذف', 'تم حذف مهمة من قبل مستخدم آخر', 'Info');
    }

    // --- Task Actions ---
    async addTask(task: Task) {
        const tempId = task.id;
        this.tasks.update(ts => [task, ...ts]);
        this.saveLocal();

        if (this.supabaseService.isConfigured) {
            const { id, ...taskForInsert } = task;
            const createdTask = await this.supabaseService.addTask(taskForInsert);
            if (createdTask) {
                this.tasks.update(ts => ts.map(t => t.id === tempId ? createdTask : t));
                this.auditService.logChange(createdTask.owner, 'Create', 'Task', createdTask.id, `Created Task: ${createdTask.title}`);
                this.uiService.addNotification('تم النشر', `${createdTask.owner} added "${createdTask.title}"`, 'Success');
            } else {
                this.tasks.update(ts => ts.filter(t => t.id !== tempId)); // Rollback
            }
        } else {
            this.auditService.logChange(task.owner, 'Create', 'Task', task.id, `Created Task (local): ${task.title}`);
            this.uiService.addNotification('تم الحفظ محلياً', 'Task created locally', 'Success');
        }
    }

    async updateTask(id: string, updates: Partial<Task>) {
        const originalTasks = this.tasks();
        this.tasks.update(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t));
        this.saveLocal();

        if (this.supabaseService.isConfigured) {
            const result = await this.supabaseService.updateTask(id, updates);
            if (!result) {
                this.tasks.set(originalTasks); // Rollback
            } else {
                this.auditService.logChange('Me', 'Update', 'Task', id, 'Updated task details');
                this.uiService.addNotification('تحديث', 'Task updated', 'Info');
            }
        } else {
            this.auditService.logChange('Me', 'Update', 'Task', id, 'Updated task details (local)');
            this.uiService.addNotification('تحديث محلي', 'Task updated locally', 'Info');
        }
    }

    async deleteTask(id: string) {
        const originalTasks = this.tasks();
        this.tasks.update(ts => ts.filter(t => t.id !== id));
        this.saveLocal();

        if (this.supabaseService.isConfigured) {
            const result = await this.supabaseService.deleteTask(id);
            if (!result) {
                this.tasks.set(originalTasks); // Rollback
            } else {
                this.auditService.logChange('Me', 'Delete', 'Task', id, 'Deleted task');
                this.uiService.addNotification('حذف', 'Task deleted', 'Info');
            }
        } else {
            this.auditService.logChange('Me', 'Delete', 'Task', id, 'Deleted task (local)');
            this.uiService.addNotification('حذف محلي', 'Task deleted locally', 'Info');
        }
    }

    async toggleTaskStatus(id: string, newStatus: 'Todo' | 'Doing' | 'Done') {
        return this.updateTask(id, { status: newStatus });
    }

    private saveLocal() {
        localStorage.setItem('himcontrol_tasks_local', JSON.stringify(this.tasks()));
    }

    private seedData() {
        const seeds: Task[] = [
            { id: 'TSK-1', title: 'تصميم هوية وشعار المشروع', domain: 'Design', owner: 'هشام', priority: 'High', status: 'Done', dueDate: '2024-07-15', tags: ['branding', 'logo'] },
            { id: 'TSK-2', title: 'بناء صفحة الهبوط الرئيسية', domain: 'Development', owner: 'قاسم', priority: 'High', status: 'Doing', dueDate: '2024-07-25', tags: ['frontend', 'ui'] },
            { id: 'TSK-3', title: 'إعداد حملة إعلانية لإطلاق المنتج', domain: 'Marketing', owner: 'هيثم', priority: 'Medium', status: 'Todo', dueDate: '2024-08-01', tags: ['social-media', 'ads'] },
            { id: 'TSK-4', title: 'تجهيز واجهة برمجة التطبيقات للمهام', domain: 'Development', owner: 'قاسم', priority: 'High', status: 'Doing', dueDate: '2024-07-28', tags: ['backend', 'api'] },
            { id: 'TSK-5', title: 'تصميم واجهات تطبيق الجوال', domain: 'Design', owner: 'هشام', priority: 'Medium', status: 'Todo', dueDate: '2024-08-10', tags: ['mobile', 'figma'] }
        ];
        this.tasks.set(seeds);
        this.saveLocal();
        localStorage.setItem('himcontrol_tasks_migrated', 'true');
    }
}
