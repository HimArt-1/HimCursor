import { Injectable, signal, inject } from '@angular/core';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';

export interface Objective {
    id: string;
    title: string;
    progress?: number;
    term?: 'Short' | 'Medium' | 'Long';
    description?: string;
    owner?: string;
    status?: string;
}

@Injectable({ providedIn: 'root' })
export class StrategyService {
    private supabase = supabaseClient;

    readonly objectives = signal<Objective[]>([]);

    constructor() {
        this.loadObjectives();
        this.loadMilestones();
    }

    async loadObjectives() {
        if (!isSupabaseConfigured || !this.supabase) {
            const stored = localStorage.getItem('himcontrol_strategy_objectives');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.length > 0) {
                        this.objectives.set(parsed);
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse local objectives', e);
                }
            }
            // Load seed data if empty
            this.loadSeedObjectives();
            return;
        }

        const { data, error } = await this.supabase
            .from('objectives')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to load objectives:', this.formatError(error));
            return;
        }

        if (data) {
            this.objectives.set(data as Objective[]);
        }
    }

    async addObjective(obj: Omit<Objective, 'id'>) {
        if (!isSupabaseConfigured || !this.supabase) {
            const newObj: Objective = {
                ...obj,
                id: `OBJ-LOCAL-${Date.now()}`
            };
            this.objectives.update(curr => [newObj, ...curr]);
            this.saveLocal();
            return;
        }

        const { data, error } = await this.supabase
            .from('objectives')
            .insert([{
                title: obj.title,
                progress: obj.progress || 0,
                term: obj.term,
                description: obj.description,
                owner: obj.owner,
                status: obj.status
            }])
            .select()
            .single();

        if (error) {
            console.error('Failed to add objective:', this.formatError(error));
            return;
        }

        if (data) {
            this.objectives.update(curr => [data as Objective, ...curr]);
        }
    }

    async updateProgress(id: string, progress: number) {
        await this.updateObjective(id, { progress });
    }

    async updateObjective(id: string, updates: Partial<Objective>) {
        if (!isSupabaseConfigured || !this.supabase) {
            this.objectives.update(curr => curr.map(o => o.id === id ? { ...o, ...updates } : o));
            this.saveLocal();
            return;
        }

        const { error } = await this.supabase
            .from('objectives')
            .update(updates)
            .eq('id', id);

        if (!error) {
            this.objectives.update(curr => curr.map(o => o.id === id ? { ...o, ...updates } : o));
        } else {
            console.error('Failed to update objective:', this.formatError(error));
        }
    }

    async deleteObjective(id: string) {
        if (!isSupabaseConfigured || !this.supabase) {
            this.objectives.update(curr => curr.filter(o => o.id !== id));
            this.saveLocal();
            return;
        }

        const { error } = await this.supabase
            .from('objectives')
            .delete()
            .eq('id', id);

        if (!error) {
            this.objectives.update(curr => curr.filter(o => o.id !== id));
        } else {
            console.error('Failed to delete objective:', this.formatError(error));
        }
    }

    // --- Milestones ---
    readonly milestones = signal<Milestone[]>([]);

    async loadMilestones() {
        if (!isSupabaseConfigured || !this.supabase) {
            const stored = localStorage.getItem('himcontrol_strategy_milestones');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.length > 0) {
                        this.milestones.set(parsed);
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse local milestones', e);
                }
            }
            // Load seed data if empty
            this.loadSeedMilestones();
            return;
        }

        const { data, error } = await this.supabase
            .from('milestones')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('Failed to load milestones:', this.formatError(error));
            return;
        }

        if (data) {
            this.milestones.set(data.map(m => ({
                id: m.id,
                title: m.title,
                date: m.date,
                type: m.type
            } as any)));
        }
    }

    async addMilestone(ms: { title: string, date: string, type: string }) {
        if (!isSupabaseConfigured || !this.supabase) {
            const newMs: Milestone = {
                ...ms,
                id: `MIL-LOCAL-${Date.now()}`
            };
            this.milestones.update(curr => [...curr, newMs]);
            this.saveLocal();
            return;
        }

        const { data, error } = await this.supabase
            .from('milestones')
            .insert([ms])
            .select()
            .single();

        if (error) {
            console.error('Failed to add milestone:', this.formatError(error));
            return;
        }

        if (data) {
            this.milestones.update(curr => [...curr, {
                id: data.id,
                title: data.title,
                date: data.date,
                type: data.type
            } as any]);
        }
    }

    private saveLocal() {
        localStorage.setItem('himcontrol_strategy_objectives', JSON.stringify(this.objectives()));
        localStorage.setItem('himcontrol_strategy_milestones', JSON.stringify(this.milestones()));
    }

    private loadSeedObjectives() {
        this.objectives.set([
            { id: 'OBJ-001', title: 'زيادة المبيعات بنسبة 50%', progress: 35, term: 'Medium', description: 'تحقيق نمو في إيرادات المبيعات خلال الربع الأول', owner: 'مدير المبيعات' },
            { id: 'OBJ-002', title: 'الوصول إلى 100 ألف مستخدم', progress: 60, term: 'Long', description: 'زيادة قاعدة المستخدمين للتطبيق', owner: 'فريق التسويق' },
            { id: 'OBJ-003', title: 'تحسين تجربة المستخدم', progress: 80, term: 'Short', description: 'تقليل وقت التحميل وتحسين الواجهة', owner: 'فريق التطوير' },
            { id: 'OBJ-004', title: 'التوسع في دول الخليج', progress: 15, term: 'Long', description: 'إطلاق التطبيق في الإمارات والكويت', owner: 'المدير التنفيذي' }
        ]);
    }

    private loadSeedMilestones() {
        this.milestones.set([
            { id: 'MIL-001', title: 'إطلاق النسخة التجريبية', date: '2026-02-01', type: 'Launch' },
            { id: 'MIL-002', title: 'معرض الأزياء السعودي', date: '2026-03-15', type: 'Event' },
            { id: 'MIL-003', title: 'تحديث V2.0', date: '2026-04-01', type: 'Update' },
            { id: 'MIL-004', title: 'إطلاق الإمارات', date: '2026-05-15', type: 'Launch' }
        ]);
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

export interface Milestone {
    id: string;
    title: string;
    date: string;
    type: string;
}
