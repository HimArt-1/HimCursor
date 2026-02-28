import { Injectable, inject, computed } from '@angular/core';
import { TaskService } from './task.service';
import { FinancialService } from './finance.service';
import { AuditService } from '../infra/audit.service';
import { UserService } from './user.service';
import { Task, Transaction } from '../../types';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private taskService = inject(TaskService);
    private financeService = inject(FinancialService);
    private auditService = inject(AuditService);
    private userService = inject(UserService);

    readonly tasks = this.taskService.tasks;
    readonly transactions = this.financeService.transactions;
    readonly logs = this.auditService.auditLogs;

    // ===== TASK CHARTS =====

    readonly taskStatusData = computed(() => {
        const tasks = this.tasks();
        const todo = tasks.filter(t => t.status === 'Todo').length;
        const doing = tasks.filter(t => t.status === 'Doing').length;
        const done = tasks.filter(t => t.status === 'Done').length;

        return {
            labels: ['Todo', 'Doing', 'Done'],
            datasets: [{
                data: [todo, doing, done],
                backgroundColor: ['#94a3b8', '#3b82f6', '#22c55e']
            }]
        };
    });

    readonly taskDomainData = computed(() => {
        const tasks = this.tasks();
        const domains: Record<string, number> = {};
        tasks.forEach(t => { domains[t.domain] = (domains[t.domain] || 0) + 1; });
        return {
            labels: Object.keys(domains),
            datasets: [{
                label: 'Tasks Count',
                data: Object.values(domains),
                backgroundColor: '#E6D3B3'
            }]
        };
    });

    // ===== FINANCIAL CHARTS =====

    readonly financialFlowData = computed(() => {
        const txs = this.transactions();
        const monthlyStats: Record<string, { income: number, expense: number }> = {};
        txs.forEach(tx => {
            const date = new Date(tx.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!monthlyStats[key]) monthlyStats[key] = { income: 0, expense: 0 };
            if (tx.type === 'Income') monthlyStats[key].income += tx.amount;
            else monthlyStats[key].expense += tx.amount;
        });
        const labels = Object.keys(monthlyStats).sort();
        return {
            labels,
            datasets: [
                { label: 'Income', data: labels.map(l => monthlyStats[l].income), borderColor: '#22c55e', backgroundColor: '#22c55e', tension: 0.4 },
                { label: 'Expenses', data: labels.map(l => monthlyStats[l].expense), borderColor: '#ef4444', backgroundColor: '#ef4444', tension: 0.4 }
            ]
        };
    });

    // ===== AUDIT =====
    readonly userActivityData = computed(() => {
        const logs = this.logs();
        const users: Record<string, number> = {};
        logs.forEach(l => { users[l.user] = (users[l.user] || 0) + 1; });
        return {
            labels: Object.keys(users),
            datasets: [{ label: 'Actions Performed', data: Object.values(users), backgroundColor: '#eab308' }]
        };
    });

    // ===== NEW: ADVANCED ANALYTICS =====

    // Productivity Score (0-100)
    readonly productivityScore = computed(() => {
        const tasks = this.tasks();
        if (tasks.length === 0) return 0;

        const total = tasks.length;
        const done = tasks.filter(t => t.status === 'Done').length;
        const doing = tasks.filter(t => t.status === 'Doing').length;
        const overdue = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date()).length;

        // Weighted score: completion (60%) + activity (25%) - penalties for overdue (15%)
        const completionScore = (done / total) * 60;
        const activityScore = (doing / Math.max(total - done, 1)) * 25;
        const overduePenalty = Math.min((overdue / total) * 15, 15);

        return Math.round(Math.max(0, Math.min(100, completionScore + activityScore - overduePenalty)));
    });

    // Productivity label
    readonly productivityLabel = computed(() => {
        const score = this.productivityScore();
        if (score >= 80) return 'ممتاز';
        if (score >= 60) return 'جيد';
        if (score >= 40) return 'متوسط';
        return 'يحتاج تحسين';
    });

    // Productivity color
    readonly productivityColor = computed(() => {
        const score = this.productivityScore();
        if (score >= 80) return '#22c55e';
        if (score >= 60) return '#3b82f6';
        if (score >= 40) return '#eab308';
        return '#ef4444';
    });

    // Team Workload Distribution
    readonly teamWorkload = computed(() => {
        const tasks = this.tasks().filter(t => t.status !== 'Done');
        const team = this.userService.availableUsers();
        const workload: { name: string; count: number; color: string }[] = [];

        const colors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
        team.forEach((member, i) => {
            const memberTasks = tasks.filter((t: any) => t.owner === member.name || t.assigneeId === member.id || t.assignee_id === member.id);
            workload.push({
                name: member.name,
                count: memberTasks.length,
                color: colors[i % colors.length]
            });
        });

        // Add unassigned
        const assigned = workload.reduce((s, w) => s + w.count, 0);
        const unassigned = tasks.length - assigned;
        if (unassigned > 0) {
            workload.push({ name: 'غير مسند', count: unassigned, color: '#94a3b8' });
        }

        return workload.sort((a, b) => b.count - a.count);
    });

    // Weekly Task Completion Trend (last 4 weeks)
    readonly weeklyTrend = computed(() => {
        const tasks = this.tasks().filter(t => t.status === 'Done');
        const weeks: number[] = [0, 0, 0, 0];
        const now = Date.now();

        tasks.forEach((t: any) => {
            const updated = t.updatedAt || t.updated_at || t.createdAt || t.created_at;
            if (!updated) return;
            const daysAgo = Math.floor((now - new Date(updated).getTime()) / 86400000);
            const weekIndex = Math.floor(daysAgo / 7);
            if (weekIndex >= 0 && weekIndex < 4) {
                weeks[weekIndex]++;
            }
        });

        return weeks.reverse(); // oldest first
    });

    // Task velocity (tasks completed per week average)
    readonly velocity = computed(() => {
        const trend = this.weeklyTrend();
        const sum = trend.reduce((a, b) => a + b, 0);
        return Math.round(sum / Math.max(trend.length, 1));
    });

    // Financial Health Score
    readonly financialHealth = computed(() => {
        const txs = this.transactions();
        const income = txs.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
        if (income === 0 && expense === 0) return { score: 100, label: 'لا توجد معاملات', color: '#94a3b8' };
        const ratio = income > 0 ? ((income - expense) / income) * 100 : -100;
        return {
            score: Math.round(Math.max(0, Math.min(100, 50 + ratio / 2))),
            label: ratio >= 20 ? 'صحي' : ratio >= 0 ? 'متوازن' : 'سلبي',
            color: ratio >= 20 ? '#22c55e' : ratio >= 0 ? '#eab308' : '#ef4444'
        };
    });

    // Top contributors by completed tasks
    readonly topContributors = computed(() => {
        const doneTasks = this.tasks().filter(t => t.status === 'Done');
        const counts: Record<string, number> = {};
        doneTasks.forEach((t: any) => {
            const owner = t.owner || 'غير محدد';
            counts[owner] = (counts[owner] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    });

    // Priority breakdown
    readonly priorityBreakdown = computed(() => {
        const tasks = this.tasks().filter(t => t.status !== 'Done');
        return {
            high: tasks.filter((t: any) => t.priority === 'High' || t.priority === 'high').length,
            medium: tasks.filter((t: any) => t.priority === 'Medium' || t.priority === 'medium').length,
            low: tasks.filter((t: any) => t.priority === 'Low' || t.priority === 'low').length,
            urgent: tasks.filter((t: any) => t.priority === 'Urgent' || t.priority === 'urgent').length
        };
    });
}
