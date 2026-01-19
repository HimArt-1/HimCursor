import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from '../infra/supabase.service';

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
    private supabase = inject(SupabaseService);

    readonly assets = signal<Asset[]>([]);

    constructor() {
        this.loadAssets();
    }

    async loadAssets() {
        if (!this.supabase.isConfigured) return;

        const { data } = await this.supabase.client
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            this.assets.set(data as Asset[]);
        }
    }

    async addAsset(asset: Omit<Asset, 'id'>) {
        if (!this.supabase.isConfigured) return;

        const { data } = await this.supabase.client
            .from('assets')
            .insert([asset])
            .select()
            .single();

        if (data) {
            this.assets.update(curr => [data as Asset, ...curr]);
        }
    }
}
