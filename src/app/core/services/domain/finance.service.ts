import { Injectable, signal, inject } from '@angular/core';
import { Transaction } from '../../types';
import { SupabaseService } from '../infra/supabase.service';

@Injectable({ providedIn: 'root' })
export class FinancialService {
    private supabase = inject(SupabaseService);

    readonly transactions = signal<Transaction[]>([]);

    constructor() {
        this.loadTransactions();
    }

    async loadTransactions() {
        if (!this.supabase.isConfigured) {
            const stored = localStorage.getItem('himcontrol_finance_transactions');
            if (stored) {
                try {
                    this.transactions.set(JSON.parse(stored));
                } catch (e) {
                    console.error('Failed to parse local transactions', e);
                }
            }
            return;
        }

        const { data, error } = await this.supabase.client
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        if (data) {
            this.transactions.set(data.map(t => ({
                id: t.id,
                type: t.type,
                category: t.category,
                amount: t.amount,
                description: t.description,
                date: t.date, // Already string in interface
                reference: t.reference // if added later
            } as Transaction)));
        }
    }

    async addTransaction(tx: Transaction) {
        if (!this.supabase.isConfigured) {
            const newTx = {
                ...tx,
                id: `TX-LOCAL-${Date.now()}`
            };
            this.transactions.update(curr => [{
                ...newTx
            }, ...curr]);
            this.saveLocal();
            return;
        }

        const { data, error } = await this.supabase.client
            .from('transactions')
            .insert([{
                type: tx.type,
                category: tx.category,
                amount: tx.amount,
                description: tx.description,
                date: tx.date, // Already ISO string
                // created_by: handled by RLS/Supabase auth.uid() usually, but if column exists we can pass it if needed,
                // or let the DB default to auth.uid() if we set up a default/trigger. 
                // For now, let's assume we just insert data.
            }])
            .select()
            .single();

        if (data) {
            this.transactions.update(curr => [{
                ...tx,
                id: data.id // Use real ID
            }, ...curr]);
        }
    }

    private saveLocal() {
        localStorage.setItem('himcontrol_finance_transactions', JSON.stringify(this.transactions()));
    }
}
