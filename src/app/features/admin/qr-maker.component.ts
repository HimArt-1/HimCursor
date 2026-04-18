import { Component, signal, effect, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { QrService, ZatcaQrFields } from '../../core/services/utils/qr.service';

declare var QRious: any;

@Component({
  selector: 'app-qr-maker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#fdfaf6] p-8 text-[#2c1810]">
      <!-- Header -->
      <header class="max-w-6xl mx-auto mb-12 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 bg-[#7A4E2D] rounded-2xl flex items-center justify-center text-white shadow-2xl rotate-3">
            <div [innerHTML]="getIcon('Barcode')" class="w-8 h-8"></div>
          </div>
          <div>
            <h1 class="text-3xl font-black tracking-tight">صانع الباركود الاحترافي</h1>
            <p class="text-xs text-[#a09c94] uppercase tracking-widest font-bold">ZATCA COMPLIANT QR STUDIO</p>
          </div>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full border border-green-100 shadow-sm animate-pulse">
          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
          <span class="text-[10px] font-black uppercase tracking-tighter">Phase 1 Compliant</span>
        </div>
      </header>

      <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Input Panel -->
        <div class="lg:col-span-7 bg-white rounded-[40px] p-10 shadow-xl border border-[#7a4e2d10] relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-[#7A4E2D] opacity-[0.02] rounded-bl-full"></div>
          
          <h2 class="text-xl font-bold mb-8 flex items-center gap-3">
            <div [innerHTML]="getIcon('Edit')" class="w-5 h-5 text-[#7A4E2D]"></div>
            بيانات الفاتورة الضريبية
          </h2>

          <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-[#a09c94] uppercase tracking-widest px-2">اسم المورد / Seller</label>
                <input 
                  type="text" 
                  [(ngModel)]="fields.sellerName" 
                  (input)="updateQr()"
                  placeholder="شركة وشّى للأنظمة"
                  class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-2xl py-4 px-6 outline-none transition-all font-bold"
                />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black text-[#a09c94] uppercase tracking-widest px-2 Russian">الرقم الضريبي / VAT No.</label>
                <input 
                  type="text" 
                  [(ngModel)]="fields.vatNumber" 
                  (input)="updateQr()"
                  placeholder="300000000000003"
                  class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-2xl py-4 px-6 outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-[#a09c94] uppercase tracking-widest px-2">التاريخ والوقت / Timestamp</label>
                <input 
                  type="datetime-local" 
                  [(ngModel)]="timestampDate" 
                  (input)="updateQrFromDate()"
                  class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-2xl py-4 px-6 outline-none transition-all font-bold"
                />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black text-[#a09c94] uppercase tracking-widest px-2">الإجمالي / Total</label>
                <div class="relative">
                  <input 
                    type="number" 
                    [(ngModel)]="fields.totalAmount" 
                    (input)="calculateVatAndSubmit()"
                    placeholder="100.00"
                    class="w-full bg-[#fdfaf6] border-2 border-transparent focus:border-[#7A4E2D] rounded-2xl py-4 px-6 outline-none transition-all font-bold"
                  />
                  <span class="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-[#a09c94]">ر.س</span>
                </div>
              </div>
            </div>

            <div class="pt-6 border-t border-[#fdfaf6]">
              <div class="bg-[#fdfaf6] p-6 rounded-3xl border border-[#7a4e2d05]">
                <div class="flex justify-between items-center mb-4">
                  <span class="text-xs font-bold text-[#a09c94] uppercase">ضريبة القيمة المضافة (15%)</span>
                  <span class="text-xl font-black text-[#7A4E2D]">{{fields.vatAmount}} ر.س</span>
                </div>
                <div class="h-2 bg-white rounded-full overflow-hidden border border-[#7a4e2d10]">
                  <div class="h-full bg-[#7A4E2D] transition-all duration-700" [style.width]="'15%'"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Helper -->
          <div class="mt-10 p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex items-start gap-4">
            <div [innerHTML]="getIcon('Search')" class="w-5 h-5 flex-shrink-0 mt-0.5"></div>
            <p class="text-[11px] leading-relaxed font-bold">
              يتم توليد الـ QR وفقاً لترميز TLV (Tag-Length-Value) المعتمد من هيئة الزكاة والضريبة والجمارك بالمملكة العربية السعودية.
            </p>
          </div>
        </div>

        <!-- Preview Panel -->
        <div class="lg:col-span-5 flex flex-col gap-6">
          <!-- QR Card -->
          <div class="bg-[#7A4E2D] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div class="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            
            <div class="relative z-10 text-center">
              <p class="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-8">Generated Result / معاينة</p>
              
              <div class="bg-white p-6 rounded-[32px] inline-block shadow-inner mb-8 transform group-hover:scale-[1.02] transition-transform duration-500">
                <canvas #qrCanvas class="mx-auto rounded-lg"></canvas>
              </div>

              <div class="space-y-4">
                <h3 class="font-black text-xl tracking-tight">{{fields.sellerName || 'اسم المنشأة'}}</h3>
                <p class="text-sm opacity-80 font-mono">{{fields.vatNumber || 'رقم التسجيل الضريبي'}}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="grid grid-cols-2 gap-4">
            <button 
              (click)="downloadQr()"
              class="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-[32px] border border-[#7a4e2d10] hover:border-[#7A4E2D] hover:shadow-xl transition-all group active:scale-95 shadow-sm"
            >
              <div class="p-3 bg-[#fdfaf6] text-[#7A4E2D] rounded-2xl group-hover:bg-[#7A4E2D] group-hover:text-white transition-colors">
                <div [innerHTML]="getIcon('Download')" class="w-6 h-6"></div>
              </div>
              <span class="text-xs font-black uppercase tracking-tighter">حفظ كصورة</span>
            </button>
            <button 
              (click)="copyBase64()"
              class="flex flex-col items-center justify-center gap-3 bg-white p-6 rounded-[32px] border border-[#7a4e2d10] hover:border-[#7A4E2D] hover:shadow-xl transition-all group active:scale-95 shadow-sm"
            >
              <div class="p-3 bg-[#fdfaf6] text-[#7A4E2D] rounded-2xl group-hover:bg-[#7A4E2D] group-hover:text-white transition-colors">
                <div [innerHTML]="getIcon('Code')" class="w-6 h-6"></div>
              </div>
              <span class="text-xs font-black uppercase tracking-tighter">نسخ الـ Base64</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  `]
})
export class QrMakerComponent implements AfterViewInit {
  private qrService = inject(QrService);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  fields: ZatcaQrFields = {
    sellerName: 'WUSHA CONTROL',
    vatNumber: '310000000000003',
    timestamp: new Date().toISOString(),
    totalAmount: '100.00',
    vatAmount: '15.00'
  };

  timestampDate: string = new Date().toISOString().slice(0, 16);
  qr: any;

  constructor() {
    effect(() => {
      // Re-generate QR when fields change (if effect needed, but we use manual triggers for performance)
    });
  }

  ngAfterViewInit() {
    this.initQr();
    this.updateQr();
  }

  initQr() {
    if (typeof QRious === 'undefined') {
        console.error('QRious not loaded yet');
        return;
    }
    this.qr = new QRious({
      element: this.qrCanvas.nativeElement,
      size: 200,
      level: 'H',
      background: 'white',
      foreground: '#7A4E2D'
    });
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  updateQrFromDate() {
    const date = new Date(this.timestampDate);
    this.fields.timestamp = date.toISOString();
    this.updateQr();
  }

  calculateVatAndSubmit() {
    const total = parseFloat(this.fields.totalAmount) || 0;
    const vat = total * 0.15;
    this.fields.vatAmount = vat.toFixed(2);
    this.fields.totalAmount = total.toFixed(2);
    this.updateQr();
  }

  updateQr() {
    if (!this.qr) return;
    const base64Data = this.qrService.generateZatcaQr(this.fields);
    this.qr.value = base64Data;
  }

  downloadQr() {
    const link = document.createElement('a');
    link.download = `Washa_QR_${this.fields.sellerName.replace(/\s+/g, '_')}.png`;
    link.href = this.qrCanvas.nativeElement.toDataURL();
    link.click();
  }

  copyBase64() {
    const base64Data = this.qrService.generateZatcaQr(this.fields);
    navigator.clipboard.writeText(base64Data).then(() => {
        alert('تم نسخ كود Base64 بنجاح!');
    });
  }
}
