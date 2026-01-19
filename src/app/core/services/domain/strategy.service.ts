import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from '../infra/supabase.service';

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
    private supabase = inject(SupabaseService);

    readonly objectives = signal<Objective[]>([]);

    constructor() {
        this.loadObjectives();
        this.loadMilestones();
    }

    async loadObjectives() {
        if (!this.supabase.isConfigured) {
            const stored = localStorage.getItem('himcontrol_strategy_objectives');
            if (stored) {
                try {
                    this.objectives.set(JSON.parse(stored));
                } catch (e) {
                    console.error('Failed to parse local objectives', e);
                }
            }
            return;
        }

        const { data, error } = await this.supabase.client
            .from('objectives')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            this.objectives.set(data as Objective[]);
        }
    }

    async addObjective(obj: Omit<Objective, 'id'>) {
        if (!this.supabase.isConfigured) {
            const newObj: Objective = {
                ...obj,
                id: `OBJ-LOCAL-${Date.now()}`
            };
            this.objectives.update(curr => [newObj, ...curr]);
            this.saveLocal();
            return;
        }

        const { data, error } = await this.supabase.client
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

        if (data) {
            this.objectives.update(curr => [data as Objective, ...curr]);
        }
    }

    async updateProgress(id: string, progress: number) {
        await this.updateObjective(id, { progress });
    }

    async updateObjective(id: string, updates: Partial<Objective>) {
        if (!this.supabase.isConfigured) {
            this.objectives.update(curr => curr.map(o => o.id === id ? { ...o, ...updates } : o));
            this.saveLocal();
            return;
        }

        const { error } = await this.supabase.client
            .from('objectives')
            .update(updates)
            .eq('id', id);

        if (!error) {
            this.objectives.update(curr => curr.map(o => o.id === id ? { ...o, ...updates } : o));
        }
    }

    // --- Milestones ---
    readonly milestones = signal<Milestone[]>([]);

    async loadMilestones() {
        if (!this.supabase.isConfigured) {
            const stored = localStorage.getItem('himcontrol_strategy_milestones');
            if (stored) {
                try {
                    this.milestones.set(JSON.parse(stored));
                } catch (e) {
                    console.error('Failed to parse local milestones', e);
                }
            }
            return;
        }

        const { data } = await this.supabase.client
            .from('milestones')
            .select('*')
            .order('date', { ascending: true });

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
        if (!this.supabase.isConfigured) {
            const newMs: Milestone = {
                ...ms,
                id: `MIL-LOCAL-${Date.now()}`
            };
            this.milestones.update(curr => [...curr, newMs]);
            this.saveLocal();
            return;
        }

        const { data } = await this.supabase.client
            .from('milestones')
            .insert([ms])
            .select()
            .single();

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
}

export interface Milestone {
    id: string;
    title: string;
    date: string;
    type: string;
}
