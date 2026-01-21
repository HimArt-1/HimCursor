import { Injectable, signal, inject } from '@angular/core';
import { Transaction } from '../../types';
import { supabaseClient, isSupabaseConfigured } from '../../supabase.client';

@Injectable({ providedIn: 'root' })
export class FinancialService {
    private supabase = supabaseClient;

    readonly transactions = signal<Transaction[]>([]);

    constructor() {
        this.loadTransactions();
    }

    async loadTransactions() {
        if (!isSupabaseConfigured || !this.supabase) {
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

        const { data, error } = await this.supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        if (error) {
            console.error('Error loading transactions:', this.formatError(error));
            return;
        }

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
        if (!isSupabaseConfigured || !this.supabase) {
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

        const { data, error } = await this.supabase
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

        if (error) {
            console.error('Error adding transaction:', this.formatError(error));
            return;
        }

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
