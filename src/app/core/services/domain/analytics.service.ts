import { Injectable, inject, computed } from '@angular/core';
import { TaskService } from './task.service';
import { FinancialService } from './finance.service';
import { AuditService } from '../infra/audit.service';
import { Task, Transaction } from '../../types';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private taskService = inject(TaskService);
    private financeService = inject(FinancialService);
    private auditService = inject(AuditService);

    readonly tasks = this.taskService.tasks;
    readonly transactions = this.financeService.transactions;
    readonly logs = this.auditService.auditLogs;

    // --- Task Charts Data ---

    // 1. Task Status Distribution (Pie Chart)
    readonly taskStatusData = computed(() => {
        const tasks = this.tasks();
        const todo = tasks.filter(t => t.status === 'Todo').length;
        const doing = tasks.filter(t => t.status === 'Doing').length;
        const done = tasks.filter(t => t.status === 'Done').length;

        return {
            labels: ['Todo', 'Doing', 'Done'],
            datasets: [{
                data: [todo, doing, done],
                backgroundColor: ['#94a3b8', '#3b82f6', '#22c55e'] // Slate-400, Blue-500, Green-500
            }]
        };
    });

    // 2. Tasks by Domain (Bar Chart)
    readonly taskDomainData = computed(() => {
        const tasks = this.tasks();
        const domains: Record<string, number> = {};

        tasks.forEach(t => {
            domains[t.domain] = (domains[t.domain] || 0) + 1;
        });

        return {
            labels: Object.keys(domains),
            datasets: [{
                label: 'Tasks Count',
                data: Object.values(domains),
                backgroundColor: '#a855f7' // Purple-500
            }]
        };
    });

    // --- Financial Charts Data ---

    // 3. Revenue vs Expenses (Line Chart) mainly by month
    // NOTE: This is a simplified aggregation based on all-time data grouped by month
    readonly financialFlowData = computed(() => {
        const txs = this.transactions();
        const monthlyStats: Record<string, { income: number, expense: number }> = {};

        txs.forEach(tx => {
            const date = new Date(tx.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`; // YYYY-M
            if (!monthlyStats[key]) monthlyStats[key] = { income: 0, expense: 0 };

            if (tx.type === 'Income') monthlyStats[key].income += tx.amount;
            else monthlyStats[key].expense += tx.amount;
        });

        const labels = Object.keys(monthlyStats).sort();

        return {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: labels.map(l => monthlyStats[l].income),
                    borderColor: '#22c55e',
                    backgroundColor: '#22c55e',
                    tension: 0.4
                },
                {
                    label: 'Expenses',
                    data: labels.map(l => monthlyStats[l].expense),
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    tension: 0.4
                }
            ]
        };
    });

    // --- Audit Logic ---
    readonly userActivityData = computed(() => {
        const logs = this.logs();
        const users: Record<string, number> = {};

        logs.forEach(l => {
            users[l.user] = (users[l.user] || 0) + 1;
        });

        return {
            labels: Object.keys(users),
            datasets: [{
                label: 'Actions Performed',
                data: Object.values(users),
                backgroundColor: '#eab308' // Yellow-500
            }]
        };
    });
}
