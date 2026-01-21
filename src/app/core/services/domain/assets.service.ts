import { Injectable, signal, inject } from '@angular/core';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';

export interface Asset {
    id: string;
    name: string;
    type: 'Image' | 'Video' | 'Document' | 'Design';
    url: string;
    status: 'Draft' | 'Final' | 'Archived';
    project?: string;
}

@Injectable({ providedIn: 'root' })
export class AssetsService {
    private supabase = supabaseClient;

    readonly assets = signal<Asset[]>([]);

    constructor() {
        this.loadAssets();
    }

    async loadAssets() {
        if (!isSupabaseConfigured || !this.supabase) return;

        const { data, error } = await this.supabase
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to load assets:', this.formatError(error));
            return;
        }

        if (data) {
            this.assets.set(data as Asset[]);
        }
    }

    async addAsset(asset: Omit<Asset, 'id'>) {
        if (!isSupabaseConfigured || !this.supabase) return;

        const { data, error } = await this.supabase
            .from('assets')
            .insert([asset])
            .select()
            .single();

        if (error) {
            console.error('Failed to add asset:', this.formatError(error));
            return;
        }

        if (data) {
            this.assets.update(curr => [data as Asset, ...curr]);
        }
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
