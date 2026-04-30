import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { InvoiceService, Invoice } from '../../core/services/domain/invoice.service';
import { AuthService } from '../../core/services/domain/auth.service';
import { SupabaseService } from '../../core/services/infra/supabase.service';
import { InventoryService } from '../../core/services/domain/inventory.service';
import { QrService } from '../../core/services/utils/qr.service';
import { ToastService } from '../../core/services/state/toast.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

declare var QRious: any;

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
        <div class="flex flex-wrap items-center gap-2">
          <input #invBackupInput type="file" accept=".json,application/json" class="hidden" (change)="onInvoicesBackupFileSelected(invBackupInput)" />
          <button type="button"
            (click)="reconcileCloud()"
            [disabled]="!cloudSyncEnabled() || syncState() === 'syncing'"
            [attr.title]="cloudSyncHint()"
            class="px-4 py-2.5 rounded-xl font-bold text-sm border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-100 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed">
            <span [innerHTML]="getIcon('Globe')" class="w-4 h-4 opacity-80"></span>
            {{ syncState() === 'syncing' ? 'جاري المزامنة…' : 'مزامنة السحابة' }}
          </button>
          <button type="button" (click)="exportInvoicesJson()" class="px-4 py-2.5 rounded-xl font-bold text-sm border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
            <span [innerHTML]="getIcon('Cpu')" class="w-4 h-4 opacity-70"></span>
            تصدير JSON
          </button>
          <button type="button" (click)="prepareImport('merge', invBackupInput)" class="px-4 py-2.5 rounded-xl font-bold text-sm border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
            <span [innerHTML]="getIcon('Plus')" class="w-4 h-4 opacity-70"></span>
            استيراد (دمج)
          </button>
          <button type="button" (click)="prepareImport('replace', invBackupInput)" class="px-4 py-2.5 rounded-xl font-bold text-sm border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-2">
            <span [innerHTML]="getIcon('Alert')" class="w-4 h-4 opacity-80"></span>
            استيراد (استبدال)
          </button>
          <button (click)="openCreate()" class="btn-primary px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
            <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span>
            فاتورة جديدة
          </button>
        </div>
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

      @if (!showEditor() && listView()) {
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-wushai-cocoa/20 dark:border-white/10 bg-wushai-cocoa/5 dark:bg-white/5 px-4 py-3">
          <p class="text-sm font-bold text-wushai-cocoa dark:text-wushai-sand">{{ listViewBanner() }}</p>
          <button type="button" (click)="clearListView()" class="text-sm font-bold text-wushai-cocoa dark:text-wushai-sand underline-offset-2 hover:underline">
            عرض كل الفواتير
          </button>
        </div>
      }

      <!-- Invoice List -->
      @if(!showEditor()) {
        <div class="space-y-3">
          @for(inv of displayedInvoices(); track inv.id) {
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
              @if (listView()) {
                <p>لا توجد فواتير ضمن هذا العرض</p>
                <p class="text-xs mt-2"><button type="button" (click)="clearListView()" class="font-bold text-wushai-cocoa dark:text-wushai-sand underline-offset-2 hover:underline">عرض كل الفواتير</button></p>
              } @else {
                <p>لا توجد فواتير بعد</p>
                <p class="text-xs mt-1">أنشئ فاتورتك الأولى</p>
              }
            </div>
          }
        </div>
      }

      <!-- Invoice Editor -->
      @if(showEditor()) {
        <div class="glass-card rounded-2xl overflow-hidden">
          <!-- Editor Header -->
          <div class="p-5 bg-gradient-to-r from-wushai-cocoa to-wushai-cocoa text-white flex flex-wrap justify-between items-center gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <button (click)="closeEditor()" class="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors" title="عودة">
                <span [innerHTML]="getIcon('ArrowRight')" class="w-5 h-5"></span>
              </button>
              <div class="min-w-0">
                <h2 class="font-bold text-lg">{{ editingId() ? 'تعديل فاتورة' : 'فاتورة جديدة' }}</h2>
                @if(editingId()) {
                  <span class="text-xs text-white/60">{{ currentInvoice.number }}</span>
                }
              </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              @if (getInvoiceQrDataUrl()) {
                <div class="flex flex-col items-center gap-1 rounded-xl bg-white/10 border border-white/20 px-2 py-2">
                  <img [src]="getInvoiceQrDataUrl()!" width="72" height="72" alt="رمز ZATCA" class="rounded-lg bg-white p-1 shadow-sm" />
                  <span class="text-[9px] text-white/75 text-center leading-tight">ZATCA TLV</span>
                </div>
              }
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
export class InvoicesComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private inventoryService = inject(InventoryService);
  private qrService = inject(QrService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private location = inject(Location);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);

  syncState = signal<'idle' | 'syncing'>('idle');

  cloudSyncEnabled = computed(() => {
    if (!this.supabaseService.isConfigured) return false;
    const u = this.authService.session()?.user;
    return !!u && !(u as { is_anonymous?: boolean }).is_anonymous;
  });

  cloudSyncHint = computed(() => {
    if (!this.supabaseService.isConfigured) return 'أضف مفاتيح Supabase في البيئة لتفعيل المزامنة';
    if (!this.authService.session()?.user) return 'سجّل الدخول لمزامنة الفواتير مع السحابة';
    return 'دمج أحدث البيانات من جدول app_invoices ثم رفع القائمة الموحّدة';
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const view = params.get('view');
      if (view === 'paid' || view === 'expected' || view === 'delinquent') {
        this.listView.set(view);
      } else {
        this.listView.set(null);
      }

      if (params.get('new') === '1') {
        this.openCreate();
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { new: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      } else if (view === 'paid' || view === 'expected' || view === 'delinquent') {
        this.closeEditor();
      }
    });
  }

  async reconcileCloud(): Promise<void> {
    if (!this.cloudSyncEnabled() || this.syncState() === 'syncing') return;
    this.syncState.set('syncing');
    const r = await this.invoiceService.reconcileWithCloud();
    this.syncState.set('idle');
    if (!r.ok) {
      this.toastService.show(r.message ?? 'فشلت المزامنة', 'error');
    } else {
      this.toastService.show('تمت مزامنة الفواتير مع السحابة', 'success');
    }
  }

  private sellerBranding(): { brand_name: string; vat_number: string } {
    const s = this.inventoryService.settings();
    return {
      brand_name: s?.brand_name || 'Washa Control',
      vat_number: s?.vat_number || '310000000000003'
    };
  }

  /** TLV payload rendered as QR image (ZATCA Phase 1), same pattern as PrintService orders */
  private zatcaQrDataUrl(inv: Invoice): string | null {
    try {
      this.invoiceService.recalculate(inv);
      if (typeof QRious === 'undefined') return null;
      const b = this.sellerBranding();
      const ts = inv.createdAt
        ? new Date(inv.createdAt).toISOString()
        : `${inv.date}T12:00:00.000+03:00`;
      const tlvBase64 = this.qrService.generateZatcaQr({
        sellerName: b.brand_name,
        vatNumber: b.vat_number,
        timestamp: ts,
        totalAmount: inv.total.toFixed(2),
        vatAmount: inv.taxAmount.toFixed(2)
      });
      const canvas = document.createElement('canvas');
      new QRious({ element: canvas, value: tlvBase64, size: 200, level: 'H' });
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }

  getInvoiceQrDataUrl(): string | null {
    return this.zatcaQrDataUrl(this.currentInvoice);
  }

  invoices = this.invoiceService.invoices;
  showEditor = signal(false);
  editingId = signal<string | null>(null);
  listView = signal<'paid' | 'expected' | 'delinquent' | null>(null);

  displayedInvoices = computed(() => {
    const all = this.invoices();
    const v = this.listView();
    if (!v) return all;
    if (v === 'paid') return all.filter(i => i.status === 'paid');
    if (v === 'expected') return all.filter(i => i.status === 'draft' || i.status === 'sent');
    return all.filter(i => this.invoiceService.isDelinquent(i));
  });

  listViewBanner = computed(() => {
    const v = this.listView();
    if (v === 'paid') return 'التصفية النشطة: فواتير مسددة فقط';
    if (v === 'expected') return 'التصفية النشطة: مسودات ومُرسلة (إيراد متوقع)';
    if (v === 'delinquent') return 'التصفية النشطة: متأخرة أو تجاوزت تاريخ الاستحقاق';
    return '';
  });

  clearListView(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  currentInvoice: Invoice = this.emptyInvoice();

  pendingImportMode: 'merge' | 'replace' | null = null;

  exportInvoicesJson(): void {
    const json = this.invoiceService.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `washa-invoices-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.show('تم تصدير النسخة الاحتياطية', 'success');
  }

  prepareImport(mode: 'merge' | 'replace', input: HTMLInputElement): void {
    if (mode === 'replace' && !window.confirm('سيتم استبدال جميع الفواتير المحفوظة محلياً بمحتوى الملف. هل تريد المتابعة؟')) {
      return;
    }
    this.pendingImportMode = mode;
    input.click();
  }

  onInvoicesBackupFileSelected(input: HTMLInputElement): void {
    const mode = this.pendingImportMode;
    this.pendingImportMode = null;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !mode) return;
    file.text().then(text => {
      try {
        const n = this.invoiceService.importBackupJson(text, mode);
        const msg = mode === 'merge'
          ? `تم دمج ${n} فاتورة من الملف`
          : `تم استبدال القائمة (${n} فاتورة)`;
        this.toastService.show(msg, 'success');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'فشل الاستيراد';
        this.toastService.show(msg, 'error');
      }
    }).catch(() => this.toastService.show('تعذّر قراءة الملف', 'error'));
  }

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

    const qrBlock = (() => {
      const dataUrl = this.zatcaQrDataUrl(inv);
      if (!dataUrl) return '';
      const vat = this.sellerBranding().vat_number;
      return `
      <div style="text-align:center;margin:12px 0 0;padding-top:12px;border-top:1px dashed #e5e5e5">
        <img src="${dataUrl}" width="120" height="120" style="border-radius:10px;border:1px solid #eee;padding:6px" alt="ZATCA QR" />
        <div style="font-size:10px;color:#888;margin-top:8px">فاتورة إلكترونية — ZATCA (مرحلة أولى)</div>
        <div style="font-size:9px;color:#aaa">الرقم الضريبي: ${vat}</div>
      </div>`;
    })();

    const html = `
    <html dir="rtl"><head><title>فاتورة ${inv.number}</title>
    <style>body{font-family:Tajawal,sans-serif;padding:40px;color:#333}
    .header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:30px}
    .logo{font-size:24px;font-weight:bold;color:#7A4E2D}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th{background:#f8f6f1;padding:10px;text-align:right;font-size:13px;color:#666}
    .total-row{font-size:18px;font-weight:bold;color:#7A4E2D}</style></head>
    <body>
      <div class="header">
        <div style="flex:1"><div class="logo">${this.sellerBranding().brand_name}</div><p style="color:#999;font-size:12px">فاتورة إلكترونية</p></div>
        <div style="text-align:center">
          ${qrBlock || ''}
        </div>
        <div style="text-align:left;min-width:140px"><h2 style="color:#7A4E2D;margin:0">${inv.number}</h2>
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
    const now = new Date().toISOString();
    return {
      id: '', number: '', clientName: '', clientEmail: '', clientPhone: '',
      date: new Date().toISOString().split('T')[0], dueDate: '',
      items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, total: 0 }],
      notes: '', taxRate: 15, discount: 0, status: 'draft',
      subtotal: 0, taxAmount: 0, total: 0, createdAt: now, updatedAt: now
    };
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  goBack() {
    this.location.back();
  }
}
