import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { TaskService } from './task.service';

// Project interfaces
export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
    priority: 'low' | 'medium' | 'high';
    ownerId: string;
    ownerName: string;
    startDate: string;
    endDate?: string;
    color: string;
    tags: string[];
    createdAt: string;
}

export interface ProjectMilestone {
    id: string;
    projectId: string;
    title: string;
    date: string;
    isCompleted: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
    private authService = inject(AuthService);
    private taskService = inject(TaskService);

    readonly projects = signal<Project[]>(this.loadProjects());
    readonly milestones = signal<ProjectMilestone[]>(this.loadMilestones());

    // Computeds
    readonly activeProjects = computed(() => this.projects().filter(p => p.status === 'active'));
    readonly totalProjects = computed(() => this.projects().length);

    readonly projectsWithProgress = computed(() => {
        const tasks = this.taskService.tasks();
        return this.projects().map(p => {
            const projectTasks = tasks.filter((t: any) => t.projectId === p.id || t.tags?.includes(p.name));
            const total = projectTasks.length;
            const done = projectTasks.filter(t => t.status === 'Done').length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            const overdue = projectTasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
            return { ...p, taskCount: total, doneCount: done, progress, overdueCount: overdue };
        });
    });

    // Status labels
    readonly statusLabels: Record<string, string> = {
        planning: 'تخطيط', active: 'نشط', paused: 'متوقف', completed: 'مكتمل', archived: 'مؤرشف'
    };

    readonly statusColors: Record<string, string> = {
        planning: '#94a3b8', active: '#22c55e', paused: '#eab308', completed: '#3b82f6', archived: '#6b7280'
    };

    readonly projectColors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

    // ===== CRUD =====

    createProject(project: Partial<Project>): Project {
        const profile = this.authService.activeProfile();
        const p: Project = {
            id: crypto.randomUUID(),
            name: project.name || 'مشروع جديد',
            description: project.description || '',
            status: 'planning',
            priority: project.priority || 'medium',
            ownerId: profile?.id || '',
            ownerName: profile?.name || '',
            startDate: project.startDate || new Date().toISOString(),
            endDate: project.endDate,
            color: project.color || this.projectColors[this.projects().length % this.projectColors.length],
            tags: project.tags || [],
            createdAt: new Date().toISOString()
        };
        this.projects.update(list => [p, ...list]);
        this.persistProjects();
        return p;
    }

    updateProject(id: string, updates: Partial<Project>) {
        this.projects.update(list => list.map(p => p.id === id ? { ...p, ...updates } : p));
        this.persistProjects();
    }

    deleteProject(id: string) {
        this.projects.update(list => list.filter(p => p.id !== id));
        this.milestones.update(list => list.filter(m => m.projectId !== id));
        this.persistProjects();
        this.persistMilestones();
    }

    // ===== MILESTONES =====

    addMilestone(projectId: string, title: string, date: string): ProjectMilestone {
        const m: ProjectMilestone = {
            id: crypto.randomUUID(),
            projectId, title, date,
            isCompleted: false
        };
        this.milestones.update(list => [...list, m]);
        this.persistMilestones();
        return m;
    }

    toggleMilestone(id: string) {
        this.milestones.update(list => list.map(m => m.id === id ? { ...m, isCompleted: !m.isCompleted } : m));
        this.persistMilestones();
    }

    getProjectMilestones(projectId: string) {
        return this.milestones().filter(m => m.projectId === projectId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // ===== ANALYTICS =====

    getProjectHealth(projectId: string): { score: number; label: string; color: string } {
        const project = this.projectsWithProgress().find(p => p.id === projectId);
        if (!project) return { score: 0, label: 'غير متاح', color: '#94a3b8' };

        let score = project.progress;
        if (project.overdueCount > 0) score -= project.overdueCount * 10;

        // Check timeline
        if (project.endDate) {
            const now = Date.now();
            const end = new Date(project.endDate).getTime();
            const start = new Date(project.startDate).getTime();
            const elapsed = (now - start) / (end - start);
            if (elapsed > 1) score -= 20; // past deadline
            else if (project.progress < elapsed * 80) score -= 10; // behind schedule
        }

        score = Math.max(0, Math.min(100, score));
        const label = score >= 70 ? 'صحي' : score >= 40 ? 'متوسط' : 'حرج';
        const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
        return { score, label, color };
    }

    // ===== PERSISTENCE =====

    private persistProjects() { localStorage.setItem('himcontrol_projects', JSON.stringify(this.projects())); }
    private persistMilestones() { localStorage.setItem('himcontrol_project_milestones', JSON.stringify(this.milestones())); }
    private loadProjects(): Project[] { try { return JSON.parse(localStorage.getItem('himcontrol_projects') || '[]'); } catch { return []; } }
    private loadMilestones(): ProjectMilestone[] { try { return JSON.parse(localStorage.getItem('himcontrol_project_milestones') || '[]'); } catch { return []; } }
}
