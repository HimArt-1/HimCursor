import { Component, signal, inject, ElementRef, ViewChild, AfterViewInit, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { QrService, ZatcaQrFields } from '../../core/services/utils/qr.service';
import { InventoryService, Product } from '../../core/services/domain/inventory.service';

declare var bwipjs: any;

export interface LabelConfig {
  name: string;
  sku: string;
  price: number;
  type: string;
  size: string;
  showName: boolean;
  showPrice: boolean;
  showSku: boolean;
  dark: boolean;
  [key: string]: string | number | boolean;
}

@Component({
  selector: 'app-qr-maker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-screen bg-[#f8f6f2] text-[#2c1810] selection:bg-[#7A4E2D20] selection:text-[#7A4E2D] overflow-hidden flex flex-col">
      <!-- Background Elements -->
      <div class="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-wushai-sand/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div class="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-wushai-cocoa/5 blur-[120px] rounded-full pointer-events-none"></div>

      <!-- Header -->
      <header class="h-20 bg-white/80 backdrop-blur-xl border-b border-wushai-cocoa/10 px-8 flex items-center justify-between z-30 shadow-sm">
        <div class="flex items-center gap-6">
          <button (click)="goBack()" class="w-12 h-12 flex items-center justify-center bg-white/50 hover:bg-white border border-wushai-cocoa/10 rounded-2xl transition-all active:scale-95 shadow-sm group">
            <span [innerHTML]="getIcon('ChevronRight')" class="w-6 h-6 group-hover:translate-x-1 transition-transform"></span>
          </button>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-wushai-cocoa rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 overflow-hidden group">
              <span [innerHTML]="getIcon('Zap')" class="w-6 h-6 group-hover:scale-125 transition-transform duration-500"></span>
              <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
            </div>
            <div>
              <h1 class="text-2xl font-black tracking-tight">استوديو الباركود الذكي</h1>
              <p class="text-[9px] text-[#a09c94] uppercase tracking-[0.3em] font-black opacity-60">Professional Asset Engine</p>
            </div>
          </div>
        </div>

        <div class="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-wushai-cocoa/10 shadow-inner">
          <button (click)="mode.set('invoice')" 
            class="px-8 py-2.5 rounded-xl text-xs font-black transition-all"
            [ngClass]="mode() === 'invoice' ? 'bg-wushai-cocoa text-white shadow-xl' : 'text-[#a09c94] hover:text-wushai-cocoa'">
            فاتورة ضريبية (QR)
          </button>
          <button (click)="mode.set('product')" 
            class="px-8 py-2.5 rounded-xl text-xs font-black transition-all"
            [ngClass]="mode() === 'product' ? 'bg-wushai-cocoa text-white shadow-xl' : 'text-[#a09c94] hover:text-wushai-cocoa'">
            ملصق منتج (Barcode)
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto p-8 relative z-20 custom-scrollbar">
        <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- Configuration Panel -->
          <div class="lg:col-span-7 space-y-8 animate-fade-in">
            <div class="glass-card rounded-[3rem] p-10 border border-white/40 shadow-2xl relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-32 h-32 bg-wushai-sand/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              
              <h2 class="text-xl font-black mb-8 flex items-center gap-4 text-wushai-cocoa">
                <div class="p-2.5 bg-wushai-cocoa/5 rounded-xl">
                  <span [innerHTML]="getIcon('Edit')" class="w-5 h-5"></span>
                </div>
                تخصيص البيانات
              </h2>

              @if (mode() === 'invoice') {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">اسم المورد</label>
                    <input type="text" [(ngModel)]="fields.sellerName" (input)="updateBarcode()" 
                      class="glass-input block" placeholder="WUSHA BRANCH" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الرقم الضريبي</label>
                    <input type="text" [(ngModel)]="fields.vatNumber" (input)="updateBarcode()" 
                      class="glass-input block" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">التاريخ</label>
                    <input type="datetime-local" [(ngModel)]="timestampDate" (input)="updateQrFromDate()" 
                      class="glass-input block" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الإجمالي</label>
                    <div class="relative">
                      <input type="number" [(ngModel)]="fields.totalAmount" (input)="calculateVatAndSubmit()" 
                        class="glass-input block w-full pr-4" />
                      <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xs text-gray-400">ر.س</span>
                    </div>
                  </div>
                </div>
              }

              @if (mode() === 'product') {
                <div class="space-y-8 animate-slide-up">
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">استيراد من المخزون</label>
                    <select (change)="onProductSelect($event)" class="glass-input block w-full appearance-none">
                      <option value="">— اختر منتج لإدراج بياناته فورا —</option>
                      @for (p of products(); track p.id) {
                        <option [value]="p.id">{{p.name}} ({{p.sku}})</option>
                      }
                    </select>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">اسم المنتج</label>
                      <input type="text" [(ngModel)]="labelConfig.name" (input)="updateBarcode()" class="glass-input block" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الرمز (SKU)</label>
                      <input type="text" [(ngModel)]="labelConfig.sku" (input)="updateBarcode()" class="glass-input block" />
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">السعر</label>
                      <input type="number" [(ngModel)]="labelConfig.price" (input)="updateBarcode()" class="glass-input block" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">نوع الكود</label>
                      <select [(ngModel)]="labelConfig.type" (change)="updateBarcode()" class="glass-input block appearance-none">
                        <option value="code128">Barcode (Code 128)</option>
                        <option value="qrcode">QR Code</option>
                        <option value="ean13">EAN-13 Standard</option>
                      </select>
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">حجم الملصق</label>
                      <select [(ngModel)]="labelConfig.size" (change)="updateBarcode()" class="glass-input block appearance-none">
                        <option value="small">Small (30x20mm)</option>
                        <option value="medium">Medium (50x30mm)</option>
                        <option value="large">Large (100x50mm)</option>
                      </select>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-5 p-6 bg-white/5 rounded-3xl border border-wushai-cocoa/5 shadow-inner">
                    @for (opt of [
                      {label: 'إظهار الاسم', key: 'showName'},
                      {label: 'إظهار السعر', key: 'showPrice'},
                      {label: 'إظهار الرمز', key: 'showSku'},
                      {label: 'مظهر داكن', key: 'dark'}
                    ]; track opt.key) {
                      <label class="flex items-center gap-3 cursor-pointer group">
                        <div class="relative">
                          <input type="checkbox" [ngModel]="getConfigValue(opt.key)" (ngModelChange)="toggleConfig(opt.key)" class="peer sr-only">
                          <div class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wushai-cocoa"
                            [class.bg-wushai-cocoa]="getConfigValue(opt.key)"></div>
                        </div>
                        <span class="text-xs font-black text-gray-600 group-hover:text-wushai-cocoa transition-colors">{{opt.label}}</span>
                      </label>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Preview & Actions -->
          <div class="lg:col-span-5 space-y-8 sticky top-8">
            <div [class]="labelConfig.dark ? 'bg-[#1a0f0a] shadow-[0_40px_80px_rgba(0,0,0,0.3)]' : 'bg-white shadow-[0_40px_80px_rgba(122,78,45,0.1)]'"
              class="rounded-[3rem] p-12 flex flex-col items-center justify-center min-h-[500px] border border-white/40 relative overflow-hidden transition-all duration-700">
              
              <div class="absolute top-8 left-8 flex items-center gap-2 opacity-30 select-none">
                <div class="w-2 h-2 rounded-full bg-wushai-sand animate-pulse"></div>
                <span class="text-[8px] font-black uppercase tracking-[0.4em]">Ready Phase</span>
              </div>

              <!-- Digital Asset Surface -->
              <div id="print-area" [ngClass]="labelConfig.size" 
                class="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-4 transition-transform hover:scale-[1.02] border border-gray-100">
                
                @if (mode() === 'product' && labelConfig.showName) {
                  <h3 class="text-center font-black text-wushai-cocoa text-base leading-tight max-w-[220px]">{{labelConfig.name}}</h3>
                }

                <div class="p-4 bg-[#f8f6f2] rounded-xl border border-gray-50 flex items-center justify-center">
                  <canvas #barcodeCanvas class="max-w-full"></canvas>
                </div>

                @if (mode() === 'product' && (labelConfig.showSku || labelConfig.showPrice)) {
                  <div class="flex flex-col items-center gap-1.5 w-full">
                    @if (labelConfig.showSku) {
                      <span class="text-[10px] font-mono font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 uppercase tracking-widest">#{{labelConfig.sku}}</span>
                    }
                    @if (labelConfig.showPrice) {
                      <div class="flex items-baseline gap-1 mt-1">
                        <span class="text-3xl font-black text-wushai-cocoa tracking-tighter">{{labelConfig.price}}</span>
                        <span class="text-[10px] font-black text-gray-400">ر.س</span>
                      </div>
                    }
                  </div>
                }

                @if (mode() === 'invoice') {
                  <div class="text-center mt-2 flex flex-col items-center gap-2">
                    <div class="px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full flex items-center gap-2 mb-1">
                      <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      <span class="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Audit Ready</span>
                    </div>
                    <div>
                      <p class="text-sm font-black text-wushai-cocoa">{{fields.sellerName}}</p>
                      <p class="text-[9px] text-gray-400 font-bold tracking-widest mt-1">VAT: {{fields.vatNumber}}</p>
                    </div>
                  </div>
                }
              </div>

              <div class="mt-12 text-center max-w-xs">
                <p class="text-[10px] text-gray-400 font-bold leading-relaxed opacity-60">تأكد من ضبط مقاس الورق في الطابعة ليتطابق مع المقاس المختار ({{labelConfig.size}})</p>
              </div>
            </div>

            <!-- Enhanced Actions -->
            <div class="grid grid-cols-2 gap-5">
              <button (click)="printLabel()"
                class="flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white hover:border-wushai-sand/50 hover:bg-white hover:shadow-2xl transition-all group active:scale-95 shadow-xl shadow-wushai-cocoa/5 relative overflow-hidden">
                <div class="p-4 bg-wushai-sand/10 text-wushai-cocoa rounded-2xl group-hover:bg-wushai-cocoa group-hover:text-white transition-all duration-500 relative z-10">
                  <span [innerHTML]="getIcon('Printer')" class="w-8 h-8"></span>
                </div>
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-wushai-cocoa relative z-10">تبدأ الطباعة</span>
                <div class="absolute inset-0 bg-gradient-to-br from-wushai-sand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              
              <button (click)="downloadLabel()"
                class="flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white hover:border-wushai-sand/50 hover:bg-white hover:shadow-2xl transition-all group active:scale-95 shadow-xl shadow-wushai-cocoa/5 relative overflow-hidden">
                <div class="p-4 bg-wushai-sand/10 text-wushai-bitter rounded-2xl group-hover:bg-wushai-bitter group-hover:text-white transition-all duration-500 relative z-10">
                  <span [innerHTML]="getIcon('Download')" class="w-8 h-8"></span>
                </div>
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-wushai-cocoa relative z-10">تحميل الأصل</span>
                <div class="absolute inset-0 bg-gradient-to-br from-wushai-sand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .glass-input {
      @apply w-full bg-white/50 backdrop-blur-md border border-wushai-cocoa/10 focus:border-wushai-sand focus:bg-white rounded-2xl py-4 px-5 outline-none transition-all font-black text-sm text-wushai-cocoa placeholder:text-gray-300;
    }
    #print-area.small { width: 30mm; height: 20mm; }
    #print-area.medium { width: 50mm; height: 30mm; }
    #print-area.large { width: 100mm; height: 50mm; }
    
    .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
    .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

    .custom-scrollbar::-webkit-scrollbar { width: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #7A4E2D15; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #7A4E2D30; }

    @media print {
      body * { visibility: hidden; }
      #print-area, #print-area * { visibility: visible; }
      #print-area { 
        position: fixed; left: 0; top: 0; margin: 0; padding: 0; 
        box-shadow: none; width: 100%; border: none;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      }
    }
  `]
})
export class QrMakerComponent implements AfterViewInit {
  private qrService = inject(QrService);
  private inventoryService = inject(InventoryService);
  private sanitizer = inject(DomSanitizer);
  private location = inject(Location);

  @ViewChild('barcodeCanvas') barcodeCanvas!: ElementRef<HTMLCanvasElement>;

  mode = signal<'invoice' | 'product'>('product');
  products = this.inventoryService.products;

  fields: ZatcaQrFields = {
    sellerName: 'WUSHA CONTROL',
    vatNumber: '310000000000003',
    timestamp: new Date().toISOString(),
    totalAmount: '100.00',
    vatAmount: '15.00'
  };

  labelConfig: LabelConfig = {
    name: 'منتج تجريبي',
    sku: 'WSHA-TEST-001',
    price: 99.00,
    type: 'code128',
    size: 'medium',
    showName: true,
    showPrice: true,
    showSku: true,
    dark: false
  };

  timestampDate: string = new Date().toISOString().slice(0, 16);

  ngAfterViewInit() {
    setTimeout(() => this.updateBarcode(), 500);
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  goBack() {
    this.location.back();
  }

  getConfigValue(key: string): boolean {
    return !!this.labelConfig[key];
  }

  toggleConfig(key: string) {
    this.labelConfig[key] = !this.labelConfig[key];
    this.updateBarcode();
  }

  onProductSelect(event: any) {
    const productId = event.target.value;
    const product = this.products().find(p => p.id === productId);
    if (product) {
      this.labelConfig.name = product.name;
      this.labelConfig.sku = product.sku;
      this.labelConfig.price = product.price;
      this.updateBarcode();
    }
  }

  updateQrFromDate() {
    const date = new Date(this.timestampDate);
    this.fields.timestamp = date.toISOString();
    this.updateBarcode();
  }

  calculateVatAndSubmit() {
    const total = parseFloat(this.fields.totalAmount) || 0;
    const vat = total * 0.15;
    this.fields.vatAmount = vat.toFixed(2);
    this.fields.totalAmount = total.toFixed(2);
    this.updateBarcode();
  }

  updateBarcode() {
    if (!this.barcodeCanvas || typeof bwipjs === 'undefined') return;

    const canvas = this.barcodeCanvas.nativeElement;
    const isProduct = this.mode() === 'product';
    
    let text = '';
    let bcId = '';
    let scale = 2;

    if (!isProduct) {
      // ZATCA QR Mode
      text = this.qrService.generateZatcaQr(this.fields);
      bcId = 'qrcode';
      scale = 3;
    } else {
      // Product Label Mode
      text = this.labelConfig.sku;
      bcId = this.labelConfig.type;
      scale = this.labelConfig.size === 'small' ? 2 : this.labelConfig.size === 'large' ? 4 : 3;
    }

    try {
      const options: any = {
        bcid: bcId,
        text: text,
        scale: scale,
        includetext: false,
        textxalign: 'center',
        backgroundcolor: 'ffffff'
      };

      // Only apply height to 1D barcodes, QR codes should be square
      if (bcId !== 'qrcode') {
        options.height = 10;
        options.scale = scale;
      } else {
        options.scale = scale > 3 ? scale : 4; // QR codes benefit from slightly larger scale
      }

      bwipjs.toCanvas(canvas, options);
    } catch (e) {
      console.error('Barcode Generation Error:', e);
    }
  }

  printLabel() {
    window.print();
  }

  downloadLabel() {
    const link = document.createElement('a');
    link.download = `Label_${this.labelConfig.sku || 'Washa'}.png`;
    link.href = this.barcodeCanvas.nativeElement.toDataURL();
    link.click();
  }
}
