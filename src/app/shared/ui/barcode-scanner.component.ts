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
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" (click)="close()"></div>
      
      <!-- Scanner Container -->
      <div class="relative w-full max-w-lg bg-[#1C1612] rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-scale-in">
        
        <!-- Header -->
        <div class="p-5 flex justify-between items-center bg-white/5 border-b border-white/10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-wushai-sand/20 flex items-center justify-center">
              <span [innerHTML]="getIcon('Barcode')" class="w-6 h-6 text-wushai-sand"></span>
            </div>
            <div>
              <h3 class="font-bold text-lg text-white">ماسح الباركود</h3>
              <p class="text-xs text-gray-400">وجه الكاميرا نحو الكود</p>
            </div>
          </div>
          <button (click)="close()" class="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <span [innerHTML]="getIcon('X')" class="w-6 h-6 text-gray-400"></span>
          </button>
        </div>

        <!-- Camera Viewport -->
        <div class="relative aspect-square bg-black overflow-hidden group">
          <div #scannerContainer id="reader" class="w-full h-full"></div>
          
          <!-- Overlay Graphics -->
          <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
             <!-- Target Frame -->
             <div class="w-64 h-64 border-2 border-dashed border-wushai-sand/40 rounded-3xl relative">
                <!-- Corner Indicators -->
                <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-wushai-sand rounded-tl-lg"></div>
                <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-wushai-sand rounded-tr-lg"></div>
                <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-wushai-sand rounded-bl-lg"></div>
                <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-wushai-sand rounded-br-lg"></div>
                
                <!-- Scanning Laser Animation -->
                <div class="absolute left-0 right-0 h-0.5 bg-wushai-sand shadow-[0_0_15px_rgba(215,189,141,0.8)] animate-scan-line"></div>
             </div>
          </div>

          <!-- Error/Loading State -->
          @if(isLoading()) {
            <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10">
              <div class="w-12 h-12 border-4 border-wushai-sand border-t-transparent rounded-full animate-spin"></div>
              <p class="mt-4 text-sm text-wushai-sand font-bold">جاري تشغيل الكاميرا...</p>
            </div>
          }
        </div>

        <!-- Footer / Controls -->
        <div class="p-5 bg-white/5 space-y-4">
          <div class="flex items-center justify-between gap-4">
             <div class="flex-1">
                <label class="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">الكاميرا المستخدمة</label>
                <select (change)="onCameraChange($event)" class="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-gray-200 outline-none focus:ring-1 focus:ring-wushai-sand appearance-none">
                  @for(cam of cameras(); track cam.id) {
                    <option [value]="cam.id">{{ cam.label }}</option>
                  }
                </select>
             </div>
             <button (click)="toggleTorch()" class="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors" title="الفلاش">
                <span [innerHTML]="getIcon('Zap')" class="w-6 h-6 text-wushai-sand"></span>
             </button>
          </div>

          <div class="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <span [innerHTML]="getIcon('Alert')" class="w-5 h-5 text-blue-400 shrink-0"></span>
            <p class="text-[10px] text-blue-300 leading-tight">
              سيتم التعرف على المنتج وإضافته تلقائياً فور قراءة الكود بنجاح.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes scan-line {
      0% { top: 0%; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    .animate-scan-line {
      position: absolute;
      animation: scan-line 2.5s ease-in-out infinite;
    }
    .animate-scale-in {
      animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    :host ::ng-deep #reader video {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
    }
  `]
})
export class BarcodeScannerComponent implements OnInit, OnDestroy {
  @Output() scanSuccess = new EventEmitter<string>();
  @Output() onClosed = new EventEmitter<void>();

  @ViewChild('scannerContainer') scannerContainer!: ElementRef;

  private scanner: any = null;
  isLoading = signal(true);
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
    if (this.scanner) {
      this.scanner.stop().catch(() => {}).then(() => {
        this.scanner.clear();
      });
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
