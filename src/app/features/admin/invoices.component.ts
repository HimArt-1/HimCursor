import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceService, Invoice, InvoiceItem } from '../../core/services/domain/invoice.service';
import { ToastService } from '../../core/services/state/toast.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="animate-fade-in-up">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
          <button (click)="goBack()" class="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <span [innerHTML]="getIcon('ArrowRight')" class="w-5 h-5 text-gray-600 dark:text-gray-300"></span>
          </button>
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">الفواتير الإلكترونية</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">إنشاء وإدارة فواتيرك بسهولة</p>
          </div>
        </div>
        <button (click)="openCreate()" class="btn-primary px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
          <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span>
          فاتورة جديدة
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="stat-card rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">الإجمالي</p>
          <p class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ invoices().length }}</p>
        </div>
        <div class="stat-card rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">مسودة</p>
          <p class="text-lg font-bold text-amber-600 mt-1">{{ countByStatus('draft') }}</p>
        </div>
        <div class="stat-card rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">مدفوعة</p>
          <p class="text-lg font-bold text-emerald-600 mt-1">{{ countByStatus('paid') }}</p>
        </div>
        <div class="stat-card rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">إجمالي المبلغ</p>
          <p class="text-lg font-bold gradient-text mt-1">{{ totalRevenue() | number:'1.2-2' }} ر.س</p>
        </div>
      </div>

      <!-- Invoice List -->
      @if(!showEditor()) {
        <div class="space-y-3">
          @for(inv of invoices(); track inv.id) {
            <div class="glass-card rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3 hover:shadow-lg transition-shadow cursor-pointer" (click)="editInvoice(inv)">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-wushai-cocoa dark:text-wushai-sand">{{ inv.number }}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    [ngClass]="{
                      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400': inv.status === 'draft',
                      'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400': inv.status === 'sent',
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400': inv.status === 'paid',
                      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400': inv.status === 'overdue'
                    }">{{ statusLabel(inv.status) }}</span>
                </div>
                <p class="text-sm text-gray-700 dark:text-gray-300 mt-1">{{ inv.clientName || 'بدون عميل' }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ inv.date }}</p>
              </div>
              <div class="text-left md:text-right">
                <p class="text-lg font-bold text-gray-900 dark:text-white">{{ inv.total | number:'1.2-2' }} <span class="text-xs text-gray-400">ر.س</span></p>
              </div>
            </div>
          } @empty {
            <div class="text-center py-16 text-gray-400">
              <span [innerHTML]="getIcon('CreditCard')" class="w-12 h-12 mx-auto opacity-30 mb-3 block"></span>
              <p>لا توجد فواتير بعد</p>
              <p class="text-xs mt-1">أنشئ فاتورتك الأولى</p>
            </div>
          }
        </div>
      }

      <!-- Invoice Editor -->
      @if(showEditor()) {
        <div class="glass-card rounded-2xl overflow-hidden">
          <!-- Editor Header -->
          <div class="p-5 bg-gradient-to-r from-wushai-cocoa to-wushai-cocoa text-white flex justify-between items-center">
            <div class="flex items-center gap-3">
              <button (click)="closeEditor()" class="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors" title="عودة">
                <span [innerHTML]="getIcon('ArrowRight')" class="w-5 h-5"></span>
              </button>
              <div>
                <h2 class="font-bold text-lg">{{ editingId() ? 'تعديل فاتورة' : 'فاتورة جديدة' }}</h2>
                @if(editingId()) {
                  <span class="text-xs text-white/60">{{ currentInvoice.number }}</span>
                }
              </div>
            </div>
            <div class="flex gap-2">
              @if(editingId()) {
                <button (click)="printInvoice()" class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors flex items-center gap-1">
                  <span [innerHTML]="getIcon('Download')" class="w-4 h-4"></span>
                  PDF
                </button>
              }
            </div>
          </div>

          <div class="p-5 space-y-5">
            <!-- Client Info -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">اسم العميل</label>
                <input type="text" [(ngModel)]="currentInvoice.clientName" name="clientName"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">البريد الإلكتروني</label>
                <input type="email" [(ngModel)]="currentInvoice.clientEmail" name="clientEmail"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">رقم الجوال</label>
                <input type="text" [(ngModel)]="currentInvoice.clientPhone" name="clientPhone"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none">
              </div>
            </div>

            <!-- Dates & Status -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">تاريخ الفاتورة</label>
                <input type="date" [(ngModel)]="currentInvoice.date" name="date"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">تاريخ الاستحقاق</label>
                <input type="date" [(ngModel)]="currentInvoice.dueDate" name="dueDate"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الحالة</label>
                <select [(ngModel)]="currentInvoice.status" name="status"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none">
                  <option value="draft">مسودة</option>
                  <option value="sent">مُرسلة</option>
                  <option value="paid">مدفوعة</option>
                  <option value="overdue">متأخرة</option>
                </select>
              </div>
            </div>

            <!-- Line Items -->
            <div>
              <div class="flex justify-between items-center mb-3">
                <label class="text-sm font-bold text-gray-700 dark:text-gray-300">البنود</label>
                <button (click)="addItem()" class="text-xs text-wushai-cocoa dark:text-wushai-sand font-bold flex items-center gap-1 hover:text-wushai-cocoa">
                  <span [innerHTML]="getIcon('Plus')" class="w-3.5 h-3.5"></span>
                  إضافة بند
                </button>
              </div>

              <!-- Table Header -->
              <div class="hidden md:grid grid-cols-12 gap-2 text-xs text-gray-400 dark:text-gray-500 font-bold mb-2 px-2">
                <div class="col-span-5">الوصف</div>
                <div class="col-span-2 text-center">الكمية</div>
                <div class="col-span-2 text-center">السعر</div>
                <div class="col-span-2 text-center">الإجمالي</div>
                <div class="col-span-1"></div>
              </div>

              @for(item of currentInvoice.items; track item.id; let i = $index) {
                <div class="grid grid-cols-12 gap-2 mb-2 items-center">
                  <input type="text" [(ngModel)]="item.description" [name]="'desc'+i"
                    class="col-span-12 md:col-span-5 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm outline-none focus:ring-1 focus:ring-wushai-cocoa"
                    placeholder="وصف البند">
                  <input type="number" [(ngModel)]="item.quantity" [name]="'qty'+i" (ngModelChange)="recalc()"
                    class="col-span-4 md:col-span-2 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-center outline-none focus:ring-1 focus:ring-wushai-cocoa"
                    min="1">
                  <input type="number" [(ngModel)]="item.unitPrice" [name]="'price'+i" (ngModelChange)="recalc()"
                    class="col-span-4 md:col-span-2 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-center outline-none focus:ring-1 focus:ring-wushai-cocoa"
                    min="0" step="0.01">
                  <div class="col-span-3 md:col-span-2 text-center text-sm font-bold text-gray-700 dark:text-gray-300 py-2">
                    {{ (item.quantity * item.unitPrice) | number:'1.2-2' }}
                  </div>
                  <button (click)="removeItem(i)" class="col-span-1 p-2 text-red-400 hover:text-red-500 transition-colors">
                    <span [innerHTML]="getIcon('Trash')" class="w-4 h-4"></span>
                  </button>
                </div>
              }
            </div>

            <!-- Tax, Discount, Notes -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">ملاحظات</label>
                <textarea [(ngModel)]="currentInvoice.notes" name="notes" rows="3"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none resize-none"
                  placeholder="ملاحظات إضافية..."></textarea>
              </div>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-500 dark:text-gray-400">المجموع الجزئي</span>
                  <span class="text-sm font-bold text-gray-700 dark:text-gray-300">{{ calcSubtotal() | number:'1.2-2' }} ر.س</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500 dark:text-gray-400 flex-1">الضريبة (%)</span>
                  <input type="number" [(ngModel)]="currentInvoice.taxRate" name="taxRate" (ngModelChange)="recalc()"
                    class="w-20 px-2 py-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-center outline-none" min="0">
                  <span class="text-sm font-bold text-gray-700 dark:text-gray-300 w-24 text-left">{{ calcTax() | number:'1.2-2' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500 dark:text-gray-400 flex-1">خصم</span>
                  <input type="number" [(ngModel)]="currentInvoice.discount" name="discount" (ngModelChange)="recalc()"
                    class="w-20 px-2 py-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-center outline-none" min="0">
                </div>
                <div class="border-t border-gray-200 dark:border-white/10 pt-3 flex justify-between items-center">
                  <span class="font-bold text-gray-900 dark:text-white">الإجمالي النهائي</span>
                  <span class="text-xl font-bold gradient-text">{{ calcTotal() | number:'1.2-2' }} ر.س</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button (click)="saveInvoice()" class="btn-primary flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <span [innerHTML]="getIcon('Check')" class="w-4 h-4"></span>
                حفظ الفاتورة
              </button>
              @if(editingId()) {
                <button (click)="deleteCurrentInvoice()" class="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors">
                  <span [innerHTML]="getIcon('Trash')" class="w-4 h-4"></span>
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Print Template (Hidden) -->
    <div id="invoice-print" class="hidden">
      <!-- Rendered by printInvoice() -->
    </div>
  `
})
export class InvoicesComponent {
  private invoiceService = inject(InvoiceService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private location = inject(Location);

  invoices = this.invoiceService.invoices;
  showEditor = signal(false);
  editingId = signal<string | null>(null);

  currentInvoice: Invoice = this.emptyInvoice();

  openCreate() {
    this.currentInvoice = this.emptyInvoice();
    this.editingId.set(null);
    this.showEditor.set(true);
  }

  editInvoice(inv: Invoice) {
    this.currentInvoice = JSON.parse(JSON.stringify(inv));
    this.editingId.set(inv.id);
    this.showEditor.set(true);
  }

  closeEditor() {
    this.showEditor.set(false);
    this.editingId.set(null);
  }

  addItem() {
    this.currentInvoice.items.push({
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    });
  }

  removeItem(index: number) {
    this.currentInvoice.items.splice(index, 1);
    this.recalc();
  }

  recalc() {
    this.invoiceService.recalculate(this.currentInvoice);
  }

  calcSubtotal(): number {
    return this.currentInvoice.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  }

  calcTax(): number {
    return this.calcSubtotal() * (this.currentInvoice.taxRate / 100);
  }

  calcTotal(): number {
    return this.calcSubtotal() + this.calcTax() - this.currentInvoice.discount;
  }

  saveInvoice() {
    if (this.editingId()) {
      this.invoiceService.updateInvoice(this.editingId()!, this.currentInvoice);
      this.toastService.show('تم تحديث الفاتورة', 'success');
    } else {
      this.invoiceService.createInvoice(this.currentInvoice);
      this.toastService.show('تم إنشاء الفاتورة', 'success');
    }
    this.closeEditor();
  }

  deleteCurrentInvoice() {
    if (this.editingId()) {
      this.invoiceService.deleteInvoice(this.editingId()!);
      this.toastService.show('تم حذف الفاتورة', 'success');
      this.closeEditor();
    }
  }

  printInvoice() {
    const inv = this.currentInvoice;
    const itemsHtml = inv.items.map(item => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${item.description}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.unitPrice.toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
    <html dir="rtl"><head><title>فاتورة ${inv.number}</title>
    <style>body{font-family:Tajawal,sans-serif;padding:40px;color:#333}
    .header{display:flex;justify-content:space-between;margin-bottom:30px}
    .logo{font-size:24px;font-weight:bold;color:#7A4E2D}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th{background:#f8f6f1;padding:10px;text-align:right;font-size:13px;color:#666}
    .total-row{font-size:18px;font-weight:bold;color:#7A4E2D}</style></head>
    <body>
      <div class="header">
        <div><div class="logo">HimControl</div><p style="color:#999;font-size:12px">فاتورة إلكترونية</p></div>
        <div style="text-align:left"><h2 style="color:#7A4E2D;margin:0">${inv.number}</h2>
        <p style="color:#999;font-size:12px">التاريخ: ${inv.date}</p>
        <p style="color:#999;font-size:12px">الاستحقاق: ${inv.dueDate || '-'}</p></div>
      </div>
      <div style="background:#f8f6f1;padding:15px;border-radius:8px;margin-bottom:20px">
        <strong>العميل:</strong> ${inv.clientName}<br/>
        ${inv.clientEmail ? '<span style="color:#999">' + inv.clientEmail + '</span><br/>' : ''}
        ${inv.clientPhone ? '<span style="color:#999">' + inv.clientPhone + '</span>' : ''}
      </div>
      <table><thead><tr><th>الوصف</th><th style="text-align:center">الكمية</th><th style="text-align:center">السعر</th><th style="text-align:center">الإجمالي</th></tr></thead>
      <tbody>${itemsHtml}</tbody></table>
      <div style="width:300px;margin-right:auto;margin-top:20px">
        <div style="display:flex;justify-content:space-between;padding:5px 0"><span>المجموع</span><span>${this.calcSubtotal().toFixed(2)} ر.س</span></div>
        <div style="display:flex;justify-content:space-between;padding:5px 0"><span>الضريبة (${inv.taxRate}%)</span><span>${this.calcTax().toFixed(2)} ر.س</span></div>
        ${inv.discount > 0 ? '<div style="display:flex;justify-content:space-between;padding:5px 0"><span>خصم</span><span>-' + inv.discount.toFixed(2) + ' ر.س</span></div>' : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #7A4E2D;margin-top:5px" class="total-row">
          <span>الإجمالي</span><span>${this.calcTotal().toFixed(2)} ر.س</span>
        </div>
      </div>
      ${inv.notes ? '<div style="margin-top:30px;padding:15px;background:#f8f6f1;border-radius:8px;font-size:13px"><strong>ملاحظات:</strong> ' + inv.notes + '</div>' : ''}
    </body></html>`;

    const win = window.open('', '_blank', 'width=800,height=600');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 500);
    }
  }

  countByStatus(status: string): number {
    return this.invoices().filter(i => i.status === status).length;
  }

  totalRevenue(): number {
    return this.invoices().filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = { draft: 'مسودة', sent: 'مُرسلة', paid: 'مدفوعة', overdue: 'متأخرة' };
    return map[status] || status;
  }

  private emptyInvoice(): Invoice {
    return {
      id: '', number: '', clientName: '', clientEmail: '', clientPhone: '',
      date: new Date().toISOString().split('T')[0], dueDate: '',
      items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
      notes: '', taxRate: 15, discount: 0, status: 'draft',
      subtotal: 0, taxAmount: 0, total: 0, createdAt: ''
    };
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  goBack() {
    this.location.back();
  }
}
