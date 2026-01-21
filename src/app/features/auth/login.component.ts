import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/domain/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

type LoginState = 'idle' | 'authenticating' | 'success';

@Component({
   selector: 'app-login',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="min-h-screen bg-wushai-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      <!-- Ambient Background (Always Visible) -->
      <div class="absolute inset-0 z-0 pointer-events-none">
         <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-wushai-dark/40 to-black"></div>
         <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-wushai-olive/10 rounded-full blur-3xl animate-pulse"></div>
         <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-wushai-deep/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
         <!-- Grid overlay for tech feel -->
         <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      <!-- Main Container -->
      <div class="relative z-10 w-full max-w-md transition-all duration-500 ease-out" 
           [class.scale-95]="loginState() !== 'idle'" 
           [class.opacity-0]="loginState() === 'success'">
         
         @if (loginState() === 'idle') {
            <!-- Logo & Branding -->
            <div class="text-center mb-10 animate-fade-in-down select-none">
                <h1 class="text-5xl font-bold tracking-tighter mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">HimControl</h1>
                <p class="text-wushai-sand/60 text-sm uppercase tracking-[0.3em] font-mono">User Access Portal</p>
            </div>

            <div class="bg-gray-800/60 backdrop-blur-xl border border-gray-700 rounded-3xl p-8 shadow-2xl animate-fade-in text-center relative overflow-hidden">
                <!-- Glass reflection -->
                <div class="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

                <div class="flex flex-col items-center mb-8 relative z-10">
                    <div class="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl border-4 border-wushai-black mb-4 ring-2 ring-gray-700">
                        <span [innerHTML]="getIcon('User')" class="w-10 h-10 text-wushai-olive"></span>
                    </div>
                    <h3 class="text-2xl font-bold text-white">تسجيل الدخول</h3>
                    <p class="text-wushai-sand/70 text-xs uppercase tracking-widest mt-1 font-bold">Email / Password</p>
                </div>

                <div class="space-y-4 text-left">
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">Email</label>
                        <input type="email" [value]="email()" (input)="email.set($any($event.target).value)"
                               class="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">Password</label>
                        <input type="password" [value]="password()" (input)="password.set($any($event.target).value)"
                               class="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    </div>
                    <button (click)="attemptLogin()" class="w-full bg-wushai-olive text-white rounded-lg py-2 text-sm font-bold">
                        دخول
                    </button>
                </div>

                <button (click)="handleQuickAccess()" class="mt-4 text-xs text-wushai-sand/70 hover:text-wushai-sand transition-colors">
                    دخول سريع إذا كانت الجلسة موجودة
                </button>
                
                @if (error()) {
                    <p class="absolute bottom-4 left-0 right-0 text-center text-red-500 text-xs font-bold animate-shake tracking-widest uppercase">بيانات الدخول غير صحيحة</p>
                }
            </div>
         }
      </div>

      <!-- TECH LOADER OVERLAY (The Motion) -->
      @if (loginState() !== 'idle') {
         <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in transition-all duration-500">
            
            <!-- Central Ring Animation -->
            <div class="relative w-48 h-48 flex items-center justify-center">
                <!-- Spinner Rings -->
                <div class="absolute inset-0 rounded-full border-t-2 border-l-2 border-wushai-olive animate-spin duration-[1.5s]"></div>
                <div class="absolute inset-3 rounded-full border-r-2 border-b-2 border-wushai-sand/50 animate-spin duration-[2s] reverse-spin"></div>
                <div class="absolute inset-8 rounded-full border-t border-white/30 animate-pulse"></div>
                
                <!-- Central Icon/State -->
                <div class="relative z-10 flex flex-col items-center justify-center">
                    @if (loginState() === 'authenticating') {
                       <span [innerHTML]="getIcon('Fingerprint')" class="w-12 h-12 text-wushai-olive animate-pulse"></span>
                    } @else {
                       <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-scale-up-bounce shadow-[0_0_30px_rgba(34,197,94,0.6)]">
                          <span [innerHTML]="getIcon('Check')" class="w-8 h-8 text-white"></span>
                       </div>
                    }
                </div>
            </div>

            <!-- Status Text Scramble/Typewriter -->
            <div class="mt-8 text-center h-12">
               <p class="text-wushai-sand font-mono text-sm tracking-[0.2em] font-bold animate-pulse">
                  {{ loadingText() }}
               </p>
               <!-- Progress Bar -->
               <div class="w-64 h-1 bg-gray-800 rounded-full mt-3 overflow-hidden mx-auto">
                  <div class="h-full bg-wushai-olive transition-all duration-300 ease-out" [style.width.%]="progress()"></div>
               </div>
            </div>

         </div>
      }
    </div>
  `,
   styles: [`
    @keyframes fade-in-down {
       from { opacity: 0; transform: translateY(-20px); }
       to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-down { animation: fade-in-down 0.8s ease-out; }
    
    @keyframes scale-in {
       from { opacity: 0; transform: scale(0.9); }
       to { opacity: 1; transform: scale(1); }
    }
    .animate-scale-in { animation: scale-in 0.4s ease-out; }

    @keyframes shake {
       0%, 100% { transform: translateX(0); }
       25% { transform: translateX(-5px); }
       75% { transform: translateX(5px); }
    }
    .animate-shake { animation: shake 0.3s ease-in-out; }

    .reverse-spin { animation-direction: reverse; }
    
    @keyframes scale-up-bounce {
        0% { transform: scale(0); opacity: 0; }
        60% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
    }
    .animate-scale-up-bounce { animation: scale-up-bounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  `]
})
export class LoginComponent {
   private authService = inject(AuthService);
   private sanitizer = inject(DomSanitizer);

   email = signal('');
   password = signal('');
   error = signal(false);

   // Motion States
   loginState = signal<LoginState>('idle');
   loadingText = signal('INITIALIZING HANDSHAKE...');
   progress = signal(0);

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   handleQuickAccess() {
      if (this.authService.hasSession() && this.authService.hasActiveProfile()) {
         this.loginState.set('authenticating');
         this.loadingText.set('RESTORING SECURE SESSION...');
         this.progress.set(60);
         setTimeout(() => {
            this.progress.set(100);
            this.loadingText.set('ACCESS GRANTED');
            this.loginState.set('success');
         }, 800);
      } else {
         this.error.set(true);
      }
   }

   // --- The Magic Sequence ---
   async startLoginSequence() {
      this.loginState.set('authenticating');

      // Step 1: Authentication
      this.loadingText.set('VERIFYING BIOMETRICS...');
      this.progress.set(10);

      // Actual Login Attempt
      const success = await this.authService.loginWithEmailPassword(this.email(), this.password());

      if (!success) {
         // Login Failed
         this.loadingText.set('ACCESS DENIED');
         this.progress.set(0);
         setTimeout(() => {
            this.loginState.set('idle');
            this.error.set(true);
            this.password.set('');
         }, 1000);
         return;
      }

      // Login Success - Continue Animation
      this.progress.set(40);
      this.loadingText.set('DECRYPTING WORKSPACE...');

      setTimeout(() => {
         this.progress.set(75);
         this.loadingText.set('SYNCING CLOUD DATA...');
      }, 600);

      setTimeout(() => {
         this.progress.set(90);
         this.loadingText.set('ESTABLISHING SECURE LINK...');
      }, 1200);

      setTimeout(() => {
         this.progress.set(100);
         this.loadingText.set('ACCESS GRANTED');
         this.loginState.set('success');
      }, 1800);
   }
   async attemptLogin() {
      this.error.set(false);
      await this.startLoginSequence();
   }
}
