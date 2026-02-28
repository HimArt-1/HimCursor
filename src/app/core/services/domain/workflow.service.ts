import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { TaskService } from './task.service';
import { NotificationService } from './notification.service';
import { AuditService } from '../infra/audit.service';

// Workflow step definition
export interface WorkflowStep {
    id: string;
    name: string;
    type: 'action' | 'condition' | 'notification' | 'delay';
    config: Record<string, any>;
    nextStepId?: string;
    conditionTrueId?: string;
    conditionFalseId?: string;
}

// Workflow template
export interface Workflow {
    id: string;
    name: string;
    description: string;
    trigger: 'manual' | 'task_created' | 'task_completed' | 'task_overdue' | 'order_created' | 'low_stock';
    steps: WorkflowStep[];
    isActive: boolean;
    createdAt: string;
    lastRun?: string;
    runCount: number;
}

// Execution log
export interface WorkflowExecution {
    id: string;
    workflowId: string;
    workflowName: string;
    status: 'running' | 'completed' | 'failed';
    startedAt: string;
    completedAt?: string;
    log: string[];
}

@Injectable({ providedIn: 'root' })
export class WorkflowService {
    private authService = inject(AuthService);
    private taskService = inject(TaskService);
    private notificationService = inject(NotificationService);
    private auditService = inject(AuditService);

    readonly workflows = signal<Workflow[]>(this.loadWorkflows());
    readonly executions = signal<WorkflowExecution[]>([]);

    readonly activeWorkflows = computed(() => this.workflows().filter(w => w.isActive));
    readonly totalRuns = computed(() => this.workflows().reduce((s, w) => s + w.runCount, 0));

    // Default workflow templates
    readonly templates: Partial<Workflow>[] = [
        {
            name: 'إشعار المهام المتأخرة',
            description: 'يرسل إشعار يومي بالمهام المتأخرة',
            trigger: 'task_overdue',
            steps: [
                { id: 's1', name: 'جمع المهام المتأخرة', type: 'action', config: { action: 'collect_overdue' } },
                { id: 's2', name: 'إرسال إشعار', type: 'notification', config: { title: 'مهام متأخرة', category: 'tasks' } }
            ]
        },
        {
            name: 'ترحيب عضو جديد',
            description: 'يرسل رسالة ترحيب عند إنشاء مهمة أولى',
            trigger: 'task_created',
            steps: [
                { id: 's1', name: 'فحص أول مهمة', type: 'condition', config: { check: 'is_first_task' } },
                { id: 's2', name: 'إرسال ترحيب', type: 'notification', config: { title: 'مرحباً بك!', message: 'تمت إضافة أول مهمة لك' } }
            ]
        },
        {
            name: 'تقرير إنجاز أسبوعي',
            description: 'يولد ملخص إنجاز كل أسبوع',
            trigger: 'manual',
            steps: [
                { id: 's1', name: 'حساب الإحصائيات', type: 'action', config: { action: 'weekly_stats' } },
                { id: 's2', name: 'إرسال تقرير', type: 'notification', config: { title: 'تقرير أسبوعي', category: 'system' } }
            ]
        },
        {
            name: 'تنبيه المخزون المنخفض',
            description: 'ينبه عند انخفاض مخزون أي منتج',
            trigger: 'low_stock',
            steps: [
                { id: 's1', name: 'جمع المنتجات', type: 'action', config: { action: 'collect_low_stock' } },
                { id: 's2', name: 'إرسال تنبيه', type: 'notification', config: { title: 'تنبيه مخزون', category: 'system' } }
            ]
        }
    ];

    // ===== CRUD =====

    createWorkflow(workflow: Partial<Workflow>): Workflow {
        const w: Workflow = {
            id: crypto.randomUUID(),
            name: workflow.name || 'سير عمل جديد',
            description: workflow.description || '',
            trigger: workflow.trigger || 'manual',
            steps: workflow.steps || [],
            isActive: true,
            createdAt: new Date().toISOString(),
            runCount: 0
        };
        this.workflows.update(list => [w, ...list]);
        this.persist();
        return w;
    }

    createFromTemplate(index: number): Workflow | null {
        const template = this.templates[index];
        if (!template) return null;
        return this.createWorkflow(template);
    }

    updateWorkflow(id: string, updates: Partial<Workflow>) {
        this.workflows.update(list => list.map(w => w.id === id ? { ...w, ...updates } : w));
        this.persist();
    }

    toggleWorkflow(id: string) {
        this.workflows.update(list => list.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w));
        this.persist();
    }

    deleteWorkflow(id: string) {
        this.workflows.update(list => list.filter(w => w.id !== id));
        this.persist();
    }

    // ===== EXECUTION =====

    async executeWorkflow(workflowId: string) {
        const workflow = this.workflows().find(w => w.id === workflowId);
        if (!workflow) return;

        const execution: WorkflowExecution = {
            id: crypto.randomUUID(),
            workflowId,
            workflowName: workflow.name,
            status: 'running',
            startedAt: new Date().toISOString(),
            log: [`▶ بدء تنفيذ: ${workflow.name}`]
        };
        this.executions.update(e => [execution, ...e]);

        try {
            for (const step of workflow.steps) {
                execution.log.push(`⏳ تنفيذ: ${step.name}`);
                await this.executeStep(step, workflow);
                execution.log.push(`✅ اكتمل: ${step.name}`);
            }

            execution.status = 'completed';
            execution.completedAt = new Date().toISOString();
            execution.log.push('🎉 اكتمل بنجاح');

            // Update run count
            this.workflows.update(list => list.map(w =>
                w.id === workflowId ? { ...w, runCount: w.runCount + 1, lastRun: new Date().toISOString() } : w
            ));
            this.persist();
        } catch (error: any) {
            execution.status = 'failed';
            execution.log.push(`❌ فشل: ${error.message || 'خطأ غير معروف'}`);
        }

        this.executions.update(e => e.map(ex => ex.id === execution.id ? execution : ex));
    }

    private async executeStep(step: WorkflowStep, workflow: Workflow) {
        // Simulate async processing
        await new Promise(r => setTimeout(r, 300));

        switch (step.type) {
            case 'notification':
                const profile = this.authService.activeProfile();
                if (profile) {
                    this.notificationService.addLocal(
                        step.config['title'] || workflow.name,
                        step.config['message'] || `تم تنفيذ ${step.name}`,
                        'Info',
                        step.config['category'] || 'system'
                    );
                }
                break;
            case 'action':
                this.auditService.logAction(`workflow:${step.config['action']}`, 'workflow', workflow.id, workflow.name);
                break;
        }
    }

    // ===== TRIGGER HANDLERS =====

    onTaskCreated(taskTitle: string) {
        this.activeWorkflows()
            .filter(w => w.trigger === 'task_created')
            .forEach(w => this.executeWorkflow(w.id));
    }

    onTaskCompleted(taskTitle: string) {
        this.activeWorkflows()
            .filter(w => w.trigger === 'task_completed')
            .forEach(w => this.executeWorkflow(w.id));
    }

    // ===== PERSISTENCE =====

    private persist() {
        localStorage.setItem('himcontrol_workflows', JSON.stringify(this.workflows()));
    }

    private loadWorkflows(): Workflow[] {
        try { return JSON.parse(localStorage.getItem('himcontrol_workflows') || '[]'); } catch { return []; }
    }
}
