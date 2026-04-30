import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from '../infra/supabase.service';

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
    /** آخر تعديل محلي أو زمن صف السحابة — لمزامنة التعارضات */
    updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class InvoiceService {
    readonly invoices = signal<Invoice[]>(this.loadFromStorage());
    private counter = 1;

    private authService = inject(AuthService);
    private supabaseService = inject(SupabaseService);
    private cloudPushTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.syncCounterFromInvoices(this.invoices());
    }

    createInvoice(partial: Partial<Invoice>): Invoice {
        const now = new Date().toISOString();
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
            createdAt: now,
            updatedAt: now
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
            updated.updatedAt = new Date().toISOString();
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

    /** فاتورة متأخرة السداد أو تجاوز تاريخ الاستحقاق (مسودة/مرسلة) */
    isDelinquent(inv: Invoice): boolean {
        if (inv.status === 'paid') return false;
        if (inv.status === 'overdue') return true;
        if (!inv.dueDate) return false;
        const due = new Date(inv.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        return due < today && (inv.status === 'sent' || inv.status === 'draft');
    }

    private writeLocalStorage(): void {
        localStorage.setItem('washa_control_invoices', JSON.stringify(this.invoices()));
    }

    private scheduleCloudPush(): void {
        if (!this.supabaseService.isConfigured) return;
        if (this.cloudPushTimer !== null) clearTimeout(this.cloudPushTimer);
        this.cloudPushTimer = setTimeout(() => {
            this.cloudPushTimer = null;
            void this.pushInvoicesToCloudSilently();
        }, 1600);
    }

    private async pushInvoicesToCloudSilently(): Promise<void> {
        try {
            const session = await this.authService.ensureSession();
            if (!session?.user) return;
            const list = this.invoices().map(i => ({ ...i }) as unknown as Record<string, unknown>);
            await this.supabaseService.syncAppInvoicesFull(list);
        } catch (e) {
            console.warn('Cloud invoice push skipped:', e);
        }
    }

    /**
     * جلب من السحابة ودمج الأحدث ثم رفع القائمة الموحّدة. يتطلب Supabase + مستخدم مسجّل.
     */
    async reconcileWithCloud(): Promise<{ ok: boolean; message?: string }> {
        if (!this.supabaseService.isConfigured) {
            return { ok: false, message: 'لم يُضبط اتصال Supabase (متغيرات البيئة).' };
        }
        const session = await this.authService.ensureSession();
        if (!session?.user) {
            return { ok: false, message: 'سجّل الدخول أولاً لمزامنة الفواتير.' };
        }
        const remoteRows = await this.supabaseService.fetchAppInvoices();
        const map = new Map(this.invoices().map(i => [i.id, { ...i }]));

        for (const row of remoteRows) {
            try {
                const payload = row.payload as unknown as Invoice;
                if (!payload || typeof payload !== 'object') continue;
                const remoteT = new Date(row.updated_at).getTime();
                const cur = map.get(row.id);
                const localT = cur ? new Date(cur.updatedAt || cur.createdAt).getTime() : -1;
                if (!cur || remoteT > localT) {
                    const merged = { ...payload, id: row.id, updatedAt: row.updated_at };
                    this.recalculate(merged);
                    map.set(row.id, merged);
                }
            } catch {
                continue;
            }
        }

        const mergedList = [...map.values()].sort((a, b) => {
            const tb = new Date(b.updatedAt || b.createdAt).getTime();
            const ta = new Date(a.updatedAt || a.createdAt).getTime();
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
        });

        this.invoices.set(mergedList);
        this.syncCounterFromInvoices(mergedList);
        this.writeLocalStorage();

        const pushed = await this.supabaseService.syncAppInvoicesFull(
            mergedList.map(i => ({ ...i }) as unknown as Record<string, unknown>)
        );
        if (!pushed) {
            return { ok: false, message: 'فشل رفع الفواتير بعد الدمج (تحقق من الجدول app_invoices والصلاحيات).' };
        }
        return { ok: true };
    }

    private persist(): void {
        this.writeLocalStorage();
        this.scheduleCloudPush();
    }

    /** تصدير نسخة احتياطية (دمجها لاحقاً أو أرشفتها) */
    exportBackupJson(): string {
        return JSON.stringify({
            schema: 'washa_invoices_v1',
            exportedAt: new Date().toISOString(),
            invoices: this.invoices()
        }, null, 2);
    }

    /**
     * استيراد من JSON. الوضع merge يحدّث أو يضيف حسب `id`؛ replace يستبدل القائمة بالكامل.
     * @returns عدد الفواتير المقروءة من الملف
     */
    importBackupJson(raw: string, mode: 'merge' | 'replace'): number {
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error('الملف ليس JSON صالحاً');
        }
        const rows = this.extractInvoicesArray(parsed);
        const normalized: Invoice[] = [];
        for (const row of rows) {
            const inv = this.normalizeImportedInvoice(row);
            if (inv) normalized.push(inv);
        }
        if (normalized.length === 0) {
            throw new Error('لا توجد فواتير صالحة في الملف');
        }
        if (mode === 'replace') {
            this.invoices.set(normalized);
        } else {
            const byId = new Map<string, Invoice>();
            for (const inv of this.invoices()) byId.set(inv.id, inv);
            for (const inv of normalized) byId.set(inv.id, inv);
            const merged = [...byId.values()].sort((a, b) => {
                const tb = new Date(b.createdAt || b.date).getTime();
                const ta = new Date(a.createdAt || a.date).getTime();
                return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
            });
            this.invoices.set(merged);
        }
        this.syncCounterFromInvoices(this.invoices());
        this.persist();
        return normalized.length;
    }

    private syncCounterFromInvoices(list: Invoice[]): void {
        let maxSeq = 0;
        for (const inv of list) {
            const m = /^INV-(\d+)$/i.exec(String(inv.number || '').trim());
            if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
        }
        this.counter = maxSeq > 0 ? maxSeq + 1 : Math.max(1, list.length + 1);
    }

    private extractInvoicesArray(parsed: unknown): unknown[] {
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { invoices?: unknown }).invoices)) {
            return (parsed as { invoices: unknown[] }).invoices;
        }
        throw new Error('تنسيق النسخة الاحتياطية غير متوقع');
    }

    private normalizeImportedInvoice(row: unknown): Invoice | null {
        if (!row || typeof row !== 'object') return null;
        const r = row as Record<string, unknown>;
        const statusRaw = String(r.status ?? 'draft');
        const status: Invoice['status'] = ['draft', 'sent', 'paid', 'overdue'].includes(statusRaw)
            ? (statusRaw as Invoice['status'])
            : 'draft';
        const itemsIn = Array.isArray(r.items) ? r.items : [];
        const items: InvoiceItem[] = itemsIn.map((it: unknown) => {
            const o = it && typeof it === 'object' ? (it as Record<string, unknown>) : {};
            const qty = Number(o.quantity);
            const price = Number(o.unitPrice);
            return {
                id: typeof o.id === 'string' && o.id ? o.id : crypto.randomUUID(),
                description: String(o.description ?? ''),
                quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
                unitPrice: Number.isFinite(price) && price >= 0 ? price : 0,
                total: 0
            };
        });
        if (items.length === 0) {
            items.push({ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 });
        }
        const id = typeof r.id === 'string' && r.id ? r.id : crypto.randomUUID();
        const number = typeof r.number === 'string' && r.number.trim() ? String(r.number).trim() : id.slice(0, 8).toUpperCase();
        const taxN = Number(r.taxRate);
        const taxRate = Number.isFinite(taxN) ? Math.min(100, Math.max(0, taxN)) : 15;
        const discN = Number(r.discount);
        const discount = Number.isFinite(discN) && discN >= 0 ? discN : 0;
        const createdAt = typeof r.createdAt === 'string' && r.createdAt ? r.createdAt : new Date().toISOString();
        const updatedAt = typeof r.updatedAt === 'string' && r.updatedAt ? r.updatedAt : createdAt;
        const inv: Invoice = {
            id,
            number,
            clientName: String(r.clientName ?? ''),
            clientEmail: String(r.clientEmail ?? ''),
            clientPhone: String(r.clientPhone ?? ''),
            date: typeof r.date === 'string' && r.date ? r.date : new Date().toISOString().split('T')[0],
            dueDate: typeof r.dueDate === 'string' ? r.dueDate : '',
            items,
            notes: String(r.notes ?? ''),
            taxRate,
            discount,
            status,
            subtotal: 0,
            taxAmount: 0,
            total: 0,
            createdAt,
            updatedAt
        };
        this.recalculate(inv);
        return inv;
    }

    private loadFromStorage(): Invoice[] {
        try {
            const raw = JSON.parse(localStorage.getItem('washa_control_invoices') || '[]');
            if (!Array.isArray(raw)) return [];
            return raw.map((x: unknown) => {
                const inv = x as Invoice;
                if (!inv.updatedAt) inv.updatedAt = inv.createdAt || new Date().toISOString();
                return inv;
            });
        } catch { return []; }
    }
}
