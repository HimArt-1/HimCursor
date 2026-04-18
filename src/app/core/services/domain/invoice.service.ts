import { Injectable, signal, computed } from '@angular/core';

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Invoice {
    id: string;
    number: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    date: string;
    dueDate: string;
    items: InvoiceItem[];
    notes: string;
    taxRate: number;
    discount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    subtotal: number;
    taxAmount: number;
    total: number;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class InvoiceService {
    readonly invoices = signal<Invoice[]>(this.loadFromStorage());
    private counter = this.invoices().length + 1;

    createInvoice(partial: Partial<Invoice>): Invoice {
        const inv: Invoice = {
            id: crypto.randomUUID(),
            number: `INV-${String(this.counter++).padStart(4, '0')}`,
            clientName: partial.clientName || '',
            clientEmail: partial.clientEmail || '',
            clientPhone: partial.clientPhone || '',
            date: partial.date || new Date().toISOString().split('T')[0],
            dueDate: partial.dueDate || '',
            items: partial.items || [],
            notes: partial.notes || '',
            taxRate: partial.taxRate ?? 15,
            discount: partial.discount ?? 0,
            status: 'draft',
            subtotal: 0, taxAmount: 0, total: 0,
            createdAt: new Date().toISOString()
        };
        this.recalculate(inv);
        this.invoices.update(list => [inv, ...list]);
        this.persist();
        return inv;
    }

    updateInvoice(id: string, updates: Partial<Invoice>) {
        this.invoices.update(list => list.map(inv => {
            if (inv.id !== id) return inv;
            const updated = { ...inv, ...updates };
            this.recalculate(updated);
            return updated;
        }));
        this.persist();
    }

    deleteInvoice(id: string) {
        this.invoices.update(list => list.filter(inv => inv.id !== id));
        this.persist();
    }

    recalculate(inv: Invoice) {
        inv.items.forEach(item => item.total = item.quantity * item.unitPrice);
        inv.subtotal = inv.items.reduce((sum, item) => sum + item.total, 0);
        inv.taxAmount = inv.subtotal * (inv.taxRate / 100);
        inv.total = inv.subtotal + inv.taxAmount - inv.discount;
    }

    private persist() {
        localStorage.setItem('washa_control_invoices', JSON.stringify(this.invoices()));
    }

    private loadFromStorage(): Invoice[] {
        try {
            return JSON.parse(localStorage.getItem('washa_control_invoices') || '[]');
        } catch { return []; }
    }
}
