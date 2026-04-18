import { Component, EventEmitter, Output, OnInit, OnDestroy, ElementRef, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from './icons';

declare var Html5Qrcode: any;

@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-[#2c1810]/60 backdrop-blur-[15px]" (click)="close()"></div>
      
      <!-- Scanner Container -->
      <div class="relative w-full max-w-xl bg-white/10 backdrop-blur-2xl rounded-[4rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-white/20 animate-scale-in">
        <div class="absolute inset-0 bg-gradient-to-br from-wushai-sand/10 to-transparent pointer-events-none"></div>

        <!-- Header -->
        <div class="p-8 flex justify-between items-center border-b border-white/10 relative z-10">
          <div class="flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-wushai-sand/20 flex items-center justify-center border border-wushai-sand/30 shadow-lg rotate-3 group overflow-hidden">
              <span [innerHTML]="getIcon('Barcode')" class="w-8 h-8 text-wushai-sand group-hover:scale-125 transition-transform duration-500"></span>
              <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
            </div>
            <div>
              <h3 class="font-black text-2xl text-white tracking-tight">رادار التعرف الذكي</h3>
              <p class="text-[10px] text-gray-300 font-black uppercase tracking-[0.3em] opacity-60">High Precision Scanning Engine</p>
            </div>
          </div>
          <button (click)="close()" class="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all active:scale-90 group">
            <span [innerHTML]="getIcon('X')" class="w-6 h-6 text-white group-hover:rotate-90 transition-transform"></span>
          </button>
        </div>

        <!-- Camera Viewport -->
        <div class="relative aspect-video bg-black/40 overflow-hidden group">
          <div #scannerContainer id="reader" class="w-full h-full scale-[1.02]"></div>
          
          <!-- Overlay Graphics -->
          <div class="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
             <!-- Target Frame -->
             <div class="w-72 h-48 border-2 border-dashed border-white/20 rounded-[2rem] relative bg-white/5 backdrop-blur-[2px]">
                <!-- Corner Indicators -->
                <div class="absolute -top-1 -left-1 w-12 h-12 border-t-[6px] border-l-[6px] border-wushai-sand rounded-tl-[1.5rem] shadow-[0_0_20px_rgba(215,189,141,0.5)]"></div>
                <div class="absolute -top-1 -right-1 w-12 h-12 border-t-[6px] border-r-[6px] border-wushai-sand rounded-tr-[1.5rem] shadow-[0_0_20px_rgba(215,189,141,0.5)]"></div>
                <div class="absolute -bottom-1 -left-1 w-12 h-12 border-b-[6px] border-l-[6px] border-wushai-sand rounded-bl-[1.5rem] shadow-[0_0_20px_rgba(215,189,141,0.5)]"></div>
                <div class="absolute -bottom-1 -right-1 w-12 h-12 border-b-[6px] border-r-[6px] border-wushai-sand rounded-br-[1.5rem] shadow-[0_0_20px_rgba(215,189,141,0.5)]"></div>
                
                <!-- Scanning Laser Animation -->
                <div class="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-wushai-sand to-transparent shadow-[0_0_30px_rgba(215,189,141,0.8)] animate-scan-line"></div>
             </div>
          </div>

          <!-- Success Flash -->
          @if(showSuccessFlash()) {
            <div class="absolute inset-0 z-30 scan-success-flash pointer-events-none"></div>
          }

          <!-- Loading State -->
          @if(isLoading()) {
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-[#1C1612]/80 backdrop-blur-xl z-10 animate-fade-in">
              <div class="w-16 h-16 relative">
                 <div class="absolute inset-0 border-4 border-wushai-sand/20 rounded-full"></div>
                 <div class="absolute inset-0 border-4 border-wushai-sand border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p class="mt-6 text-sm text-wushai-sand font-black uppercase tracking-[0.3em]">Initializing Optics...</p>
            </div>
          }
        </div>

        <!-- Footer / Controls -->
        <div class="p-8 bg-white/5 backdrop-blur-md relative z-10 border-t border-white/10">
          <div class="flex items-center justify-between gap-6">
             <div class="flex-1 space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 px-1 opacity-60">Source Controller</label>
                <div class="relative">
                  <select (change)="onCameraChange($event)" class="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:ring-4 focus:ring-wushai-sand/20 appearance-none transition-all cursor-pointer font-black">
                    @for(cam of cameras(); track cam.id) {
                      <option [value]="cam.id" class="bg-[#2c1810] text-white">{{ cam.label || 'Camera ' + ($index + 1) }}</option>
                    }
                  </select>
                  <div class="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-wushai-sand">
                    <span [innerHTML]="getIcon('ChevronDown')" class="w-5 h-5"></span>
                  </div>
                </div>
             </div>
             
             <button (click)="toggleTorch()" 
               [class.bg-wushai-sand]="torchEnabled()"
               [class.text-wushai-cocoa]="torchEnabled()"
               class="w-16 h-16 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 flex items-center justify-center transition-all active:scale-95 group shadow-lg">
                <span [innerHTML]="getIcon('Zap')" class="w-7 h-7 group-hover:scale-125 transition-transform duration-500"></span>
             </button>
          </div>

          <div class="mt-8 p-5 bg-wushai-sand/5 border border-wushai-sand/10 rounded-[2rem] flex items-center gap-4 group">
            <div class="w-10 h-10 rounded-xl bg-wushai-sand/10 flex items-center justify-center text-wushai-sand shrink-0 group-hover:rotate-12 transition-transform">
              <span [innerHTML]="getIcon('Activity')" class="w-5 h-5"></span>
            </div>
            <p class="text-[11px] text-gray-400 leading-relaxed font-bold">
              سيتم التعرف على المنتج وعرض تفاصيله تلقائياً فور قراءة الكود بنجاح. تأكد من ثبات اليد أثناء المسح.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes scan-line {
      0% { top: 10%; opacity: 0; }
      20% { opacity: 1; }
      80% { opacity: 1; }
      100% { top: 90%; opacity: 0; }
    }
    @keyframes success-flash {
      0% { background: rgba(34, 197, 94, 0); }
      50% { background: rgba(34, 197, 94, 0.4); }
      100% { background: rgba(34, 197, 94, 0); }
    }
    .animate-scan-line {
      position: absolute;
      animation: scan-line 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    .scan-success-flash {
      animation: success-flash 0.5s ease-out forwards;
    }
    .animate-scale-in {
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .animate-fade-in {
      animation: fadeIn 0.4s ease-out forwards;
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9) translateY(40px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    :host ::ng-deep #reader video {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      border-radius: 4rem;
    }
  `]
})
export class BarcodeScannerComponent implements OnInit, OnDestroy {
  @Output() scanSuccess = new EventEmitter<string>();
  @Output() onClosed = new EventEmitter<void>();

  @ViewChild('scannerContainer') scannerContainer!: ElementRef;

  private scanner: any = null;
  isLoading = signal(true);
  showSuccessFlash = signal(false);
  cameras = signal<any[]>([]);
  currentCameraId = signal<string | null>(null);
  torchEnabled = signal(false);

  private sanitizer = inject(DomSanitizer);
  private beepSound: HTMLAudioElement | null = null;

  ngOnInit() {
    this.initBeep();
    this.startScanner();
  }

  ngOnDestroy() {
    this.stopScanner();
  }

  private initBeep() {
    // High-quality success beep (Sine wave)
    const audioContent = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT18A"; // Minimal header
    // Actually generating a small beep using AudioContext is better but complex to base64. 
    // I'll just use a standard base64 beep string.
    this.beepSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'); 
  }

  private playBeep() {
    if (this.beepSound) {
      this.beepSound.currentTime = 0;
      this.beepSound.play().catch(() => {});
    }
  }

  async startScanner() {
    try {
      const devices = await Html5Qrcode.getCameras();
      this.cameras.set(devices);
      
      if (devices && devices.length > 0) {
        // Prefer back camera
        const backCam = devices.find((c: any) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('خلفية'));
        this.currentCameraId.set(backCam ? backCam.id : devices[0].id);
        this.initScanner();
      } else {
        alert('لم يتم العثور على كاميرات نشطة');
        this.close();
      }
    } catch (err) {
      console.error('Error getting cameras', err);
      this.isLoading.set(false);
    }
  }

  private initScanner() {
    if (this.scanner) {
      this.scanner.clear();
    }

    this.scanner = new Html5Qrcode("reader");
    const config = { 
      fps: 15, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    this.scanner.start(
      this.currentCameraId(), 
      config, 
      (decodedText: string) => {
        this.playBeep();
        this.showSuccessFlash.set(true);
        setTimeout(() => this.showSuccessFlash.set(false), 500);
        this.scanSuccess.emit(decodedText);
      },
      (errorMessage: string) => {
        // Ignore noise errors
      }
    ).then(() => {
      this.isLoading.set(false);
    }).catch((err: any) => {
      console.error('Failed to start scanner', err);
      this.isLoading.set(false);
    });
  }

  stopScanner() {
    if (this.scanner && this.scanner.isScanning) {
      this.scanner.stop().catch(() => {}).then(() => {
        this.scanner.clear();
      });
    } else if (this.scanner) {
      this.scanner.clear();
    }
  }

  onCameraChange(event: any) {
    this.currentCameraId.set(event.target.value);
    this.isLoading.set(true);
    this.initScanner();
  }

  toggleTorch() {
    if (this.scanner && this.scanner.isScanning) {
      this.torchEnabled.set(!this.torchEnabled());
      this.scanner.applyVideoConstraints({
        advanced: [{ torch: this.torchEnabled() }]
      }).catch((e: any) => console.log('Torch not supported', e));
    }
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  close() {
    this.stopScanner();
    this.onClosed.emit();
  }
}
