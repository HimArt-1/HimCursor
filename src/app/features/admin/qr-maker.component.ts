import { Component, signal, inject, ElementRef, ViewChild, AfterViewInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { QrService, ZatcaQrFields } from '../../core/services/utils/qr.service';
import { InventoryService, Product } from '../../core/services/domain/inventory.service';

declare var bwipjs: any;

@Component({
  selector: 'app-qr-maker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#fdfaf6] p-4 md:p-8 text-[#2c1810] print:p-0 print:bg-white overflow-x-hidden">
      <!-- Header (Hidden on Print) -->
      <header class="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-[#7A4E2D] rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
            <div [innerHTML]="getIcon('Barcode')" class="w-6 h-6"></div>
          </div>
          <div>
            <h1 class="text-2xl font-black tracking-tight">استوديو الملصقات والباركود</h1>
            <p class="text-[10px] text-[#a09c94] uppercase tracking-widest font-bold">PROFESSIONAL LABEL ENGINE</p>
          </div>
        </div>
        
        <div class="flex bg-white p-1 rounded-2xl shadow-sm border border-[#7a4e2d10]">
          <button (click)="mode.set('invoice')" 
            class="px-6 py-2 rounded-xl text-xs font-black transition-all"
            [ngClass]="mode() === 'invoice' ? 'bg-[#7A4E2D] text-white shadow-lg' : 'text-[#a09c94]'">
            فاتورة ضريبية (QR)
          </button>
          <button (click)="mode.set('product')" 
            class="px-6 py-2 rounded-xl text-xs font-black transition-all"
            [ngClass]="mode() === 'product' ? 'bg-[#7A4E2D] text-white shadow-lg' : 'text-[#a09c94]'">
            ملصق منتج (Barcode/QR)
          </button>
        </div>
      </header>

      <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
        <!-- Controls Panel (Hidden on Print) -->
        <div class="lg:col-span-7 bg-white rounded-[32px] p-8 shadow-xl border border-[#7a4e2d10] print:hidden">
          
          <!-- Mode 1: Invoice QR -->
          @if (mode() === 'invoice') {
            <h2 class="text-lg font-bold mb-6 flex items-center gap-3">
              <div [innerHTML]="getIcon('Edit')" class="w-4 h-4 text-[#7A4E2D]"></div>
              بيانات الفاتورة الضريبية (ZATCA)
            </h2>
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">اسم المورد</label>
                  <input type="text" [(ngModel)]="fields.sellerName" (input)="updateBarcode()" 
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm" />
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">الرقم الضريبي</label>
                  <input type="text" [(ngModel)]="fields.vatNumber" (input)="updateBarcode()" 
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">التاريخ</label>
                  <input type="datetime-local" [(ngModel)]="timestampDate" (input)="updateQrFromDate()" 
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">الإجمالي (مع الضريبة)</label>
                  <input type="number" [(ngModel)]="fields.totalAmount" (input)="calculateVatAndSubmit()" 
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm" />
                </div>
              </div>
            </div>
          }

          <!-- Mode 2: Product Label -->
          @if (mode() === 'product') {
            <h2 class="text-lg font-bold mb-6 flex items-center gap-3">
              <div [innerHTML]="getIcon('Edit')" class="w-4 h-4 text-[#7A4E2D]"></div>
              تخصيص ملصق المنتج
            </h2>
            
            <div class="space-y-6">
              <!-- Select Product -->
              <div class="space-y-2">
                <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">اختر المنتج من المخزون</label>
                <select (change)="onProductSelect($event)" 
                  class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm">
                  <option value="">— اختر منتج لإدراج بياناته فورا —</option>
                  @for (p of products(); track p.id) {
                    <option [value]="p.id">{{p.name}} ({{p.sku}})</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">اسم المنتج</label>
                  <input type="text" [(ngModel)]="labelConfig.name" (input)="updateBarcode()" 
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">الرمز (SKU/Barcode)</label>
                  <input type="text" [(ngModel)]="labelConfig.sku" (input)="updateBarcode()" 
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">السعر</label>
                  <input type="number" [(ngModel)]="labelConfig.price" (input)="updateBarcode()" 
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm" />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">نوع الكود</label>
                  <select [(ngModel)]="labelConfig.type" (change)="updateBarcode()" 
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm">
                    <option value="code128">Code 128 (Barcode)</option>
                    <option value="qrcode">QR Code</option>
                    <option value="ean13">EAN-13</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-[#a09c94] uppercase px-2">المقاس</label>
                  <select [(ngModel)]="labelConfig.size" (change)="updateBarcode()" 
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-xl py-3 px-4 outline-none transition-all font-bold text-sm">
                    <option value="small">صغير (30x20mm)</option>
                    <option value="medium">متوسط (50x30mm)</option>
                    <option value="large">كبير (100x50mm)</option>
                  </select>
                </div>
              </div>

              <!-- Toggles -->
              <div class="flex flex-wrap gap-4 pt-2">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" [(ngModel)]="labelConfig.showName" (change)="updateBarcode()" class="w-4 h-4 accent-[#7A4E2D]">
                  <span class="text-xs font-bold text-gray-500">إظهار الاسم</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" [(ngModel)]="labelConfig.showPrice" (change)="updateBarcode()" class="w-4 h-4 accent-[#7A4E2D]">
                  <span class="text-xs font-bold text-gray-500">إظهار السعر</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" [(ngModel)]="labelConfig.showSku" (change)="updateBarcode()" class="w-4 h-4 accent-[#7A4E2D]">
                  <span class="text-xs font-bold text-gray-500">إظهار الرمز</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" [(ngModel)]="labelConfig.dark" (change)="updateBarcode()" class="w-4 h-4 accent-[#7A4E2D]">
                  <span class="text-xs font-bold text-gray-500">خلفية غامقة</span>
                </label>
              </div>
            </div>
          }
        </div>

        <!-- Preview Panel -->
        <div class="lg:col-span-5 flex flex-col gap-6 print:block print:col-span-12">
          <!-- Preview Card -->
          <div [ngClass]="labelConfig.dark ? 'bg-[#2c1810] text-white' : 'bg-white text-[#2c1810] border border-[#7a4e2d10]'" 
            class="rounded-[32px] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px] print:shadow-none print:border-none print:p-0 print:min-h-0">
            
            <p class="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-8 print:hidden">Live Digital Preview / معاينة</p>
            
            <!-- Label Paper Surface -->
            <div id="print-area" [ngClass]="labelConfig.size" 
              class="bg-white p-4 rounded-xl shadow-inner inline-flex flex-col items-center justify-center gap-2 print:shadow-none print:p-0">
              
              @if (mode() === 'product' && labelConfig.showName) {
                <h3 class="text-center font-bold text-[#2c1810] text-sm truncate max-w-[200px]">{{labelConfig.name}}</h3>
              }

              <canvas #barcodeCanvas class="mx-auto"></canvas>

              @if (mode() === 'product' && (labelConfig.showSku || labelConfig.showPrice)) {
                <div class="flex flex-col items-center gap-0.5">
                   @if (labelConfig.showSku) {
                     <span class="text-[10px] font-mono text-gray-400">{{labelConfig.sku}}</span>
                   }
                   @if (labelConfig.showPrice) {
                     <span class="text-lg font-black text-[#7A4E2D]">{{labelConfig.price}} ر.س</span>
                   }
                </div>
              }

              @if (mode() === 'invoice') {
                <div class="text-center mt-2 flex flex-col items-center gap-1">
                  <div class="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-1 mb-1">
                    <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span class="text-[8px] font-bold text-green-700 uppercase tracking-tighter">ZATCA Compliant</span>
                  </div>
                  <p class="text-[10px] font-bold text-[#2c1810]">{{fields.sellerName}}</p>
                  <p class="text-[8px] text-gray-400 font-mono">{{fields.vatNumber}}</p>
                </div>
              }
            </div>

            <!-- Print Dimensions Helper (Hidden on Print) -->
            <div class="mt-8 text-center print:hidden">
               <p class="text-[10px] opacity-40 italic">دقة الطباعة 300 DPI - تدعم جميع الطابعات الحرارية</p>
            </div>
          </div>

          <!-- Actions (Hidden on Print) -->
          <div class="grid grid-cols-2 gap-4 print:hidden">
            <button (click)="printLabel()"
              class="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-3xl border border-[#7a4e2d10] hover:border-[#7A4E2D] hover:shadow-xl transition-all group active:scale-95 shadow-sm">
              <div class="p-3 bg-[#fdfaf6] text-[#7A4E2D] rounded-xl group-hover:bg-[#7A4E2D] group-hover:text-white transition-colors">
                <div [innerHTML]="getIcon('Printer')" class="w-6 h-6"></div>
              </div>
              <span class="text-xs font-black uppercase tracking-tighter">طباعة الملصق</span>
            </button>
            <button (click)="downloadLabel()"
              class="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-3xl border border-[#7a4e2d10] hover:border-[#7A4E2D] hover:shadow-xl transition-all group active:scale-95 shadow-sm">
              <div class="p-3 bg-[#fdfaf6] text-[#7A4E2D] rounded-xl group-hover:bg-[#7A4E2D] group-hover:text-white transition-colors">
                <div [innerHTML]="getIcon('Download')" class="w-6 h-6"></div>
              </div>
              <span class="text-xs font-black uppercase tracking-tighter">حفظ كصورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    #print-area.small { width: 30mm; min-height: 20mm; }
    #print-area.medium { width: 50mm; min-height: 30mm; }
    #print-area.large { width: 100mm; min-height: 50mm; }
    @media print {
      body * { visibility: hidden; }
      #print-area, #print-area * { visibility: visible; }
      #print-area { 
        position: fixed; 
        left: 0; 
        top: 0; 
        margin: 0; 
        padding: 0; 
        box-shadow: none;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
    }
  `]
})
export class QrMakerComponent implements AfterViewInit {
  private qrService = inject(QrService);
  private inventoryService = inject(InventoryService);
  private sanitizer = inject(DomSanitizer);

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

  labelConfig = {
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
