import { Injectable, inject, computed } from '@angular/core';
import { TaskService } from './task.service';
import { InventoryService } from './inventory.service';
import { InvoiceService } from './invoice.service';
import { FinancialService } from './finance.service';
import { AnalyticsService } from './analytics.service';
import { Task, Transaction } from '../../types';

export interface WashaInsight {
    id: string;
    type: 'success' | 'warning' | 'info' | 'critical';
    title: string;
    message: string;
    domain: 'inventory' | 'finance' | 'tasks' | 'general';
    actionLabel?: string;
    actionLink?: string;
    timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class WashaIntelligenceService {
    private taskService = inject(TaskService);
    private inventoryService = inject(InventoryService);
    private invoiceService = inject(InvoiceService);
    private financeService = inject(FinancialService);
    private analyticsService = inject(AnalyticsService);

    /**
     * Aggregates intelligence from all domains to produce proactive insights.
     */
    readonly insights = computed<WashaInsight[]>(() => {
        const insights: WashaInsight[] = [];
        const now = new Date();

        // 1. Inventory Insights
        const lowStock = this.inventoryService.lowStockProducts();
        const reorderSuggestions = this.inventoryService.reorderSuggestions();
        
        if (lowStock.length > 0) {
            const criticalCount = reorderSuggestions.filter(s => s.urgency === 'critical').length;
            if (criticalCount > 0) {
                insights.push({
                    id: 'inv-critical',
                    type: 'critical',
                    title: 'تنبيه مخزون حرج',
                    message: `لديك ${criticalCount} منتجات أوشكت على النفاد تماماً (أقل من 3 أيام).`,
                    domain: 'inventory',
                    actionLabel: 'إدارة المخزون',
                    actionLink: '/inventory',
                    timestamp: now.toISOString()
                });
            } else {
                insights.push({
                    id: 'inv-warning',
                    type: 'warning',
                    title: 'تنبيه مخزون منخفض',
                    message: `هناك ${lowStock.length} منتجات وصلت لحد الطلب الأدنى.`,
                    domain: 'inventory',
                    actionLabel: 'طلب كميات',
                    actionLink: '/inventory',
                    timestamp: now.toISOString()
                });
            }
        }

        // 2. Financial Insights (Overdue Invoices)
        const overdueInvoices = this.invoiceService.invoices().filter(inv => inv.status === 'overdue');
        if (overdueInvoices.length > 0) {
            const totalAtRisk = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);
            insights.push({
                id: 'fin-overdue',
                type: 'warning',
                title: 'مخاطر تدفق نقدي',
                message: `لديك ${overdueInvoices.length} فواتير متأخرة بقيمة إجمالية ${totalAtRisk.toLocaleString()} ريال.`,
                domain: 'finance',
                actionLabel: 'متابعة الفواتير',
                actionLink: '/admin/invoices',
                timestamp: now.toISOString()
            });
        }

        // 3. Task Bottlenecks
        const workload = this.analyticsService.teamWorkload();
        const overloaded = workload.find(w => w.count > 10 && w.name !== 'غير مسند');
        if (overloaded) {
            insights.push({
                id: 'task-bottleneck',
                type: 'info',
                title: 'اختناق في التنفيذ',
                message: `يتحمل "${overloaded.name}" ضغطاً كبيراً (${overloaded.count} مهام نشطة). وشّاي يقترح إعادة توزيع المهام.`,
                domain: 'tasks',
                actionLabel: 'توزيع المهام',
                actionLink: '/execution/tasks',
                timestamp: now.toISOString()
            });
        }

        // 4. Productivity High
        const score = this.analyticsService.productivityScore();
        if (score > 85) {
            insights.push({
                id: 'prod-success',
                type: 'success',
                title: 'أداء استثنائي',
                message: `وصل معدل الإنتاجية إلى ${score}% هذا الأسبوع. فريقك يعمل بكفاءة عالية!`,
                domain: 'tasks',
                timestamp: now.toISOString()
            });
        }

        // 5. Unassigned Critical Tasks
        const unassignedCritical = this.taskService.tasks().filter(t => t.status !== 'Done' && !t.owner && (t.priority === 'High' || t.priority === 'Urgent' as any));
        if (unassignedCritical.length > 0) {
            insights.push({
                id: 'task-unassigned',
                type: 'critical',
                title: 'مهام حرجة معلقة',
                message: `يوجد ${unassignedCritical.length} مهام عالية الأهمية غير مسندة لأحد.`,
                domain: 'tasks',
                actionLabel: 'إسناد المهام',
                actionLink: '/execution/tasks',
                timestamp: now.toISOString()
            });
        }

        return insights.sort((a, b) => b.type === 'critical' ? 1 : -1);
    });
}
