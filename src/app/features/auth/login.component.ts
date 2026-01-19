import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, User } from '../../core/services/state/data.service';
import { UserService } from '../../core/services/domain/user.service';
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
            <div (click)="handleTitleClick()" class="text-center mb-10 animate-fade-in-down cursor-pointer select-none">
                <h1 class="text-5xl font-bold tracking-tighter mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">HimControl</h1>
                <p class="text-wushai-sand/60 text-sm uppercase tracking-[0.3em] font-mono">System Access Portal</p>
            </div>

            <!-- Step 1: User Selection -->
            @if (!selectedUser()) {
                <div class="grid grid-cols-2 gap-4 animate-scale-in">
                @for (user of visibleUsers(); track user.id) {
                    <button (click)="selectUser(user)" class="group bg-gray-800/40 backdrop-blur-md hover:bg-gray-700/60 border border-gray-700 hover:border-wushai-olive rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-wushai-olive/10">
                        <div class="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg border-2 border-transparent group-hover:border-wushai-sand transition-all relative overflow-hidden"
                            [style.background-color]="user.avatarColor">
                            @if (user.avatarUrl) {
                              <img [src]="user.avatarUrl" [alt]="user.name" class="w-full h-full object-cover rounded-full">
                            } @else {
                              <span class="relative z-10">{{ user.name.charAt(0) }}</span>
                            }
                            <!-- Shine effect -->
                            <div class="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div class="text-center">
                            <p class="font-bold text-lg group-hover:text-wushai-sand transition-colors">{{ user.name }}</p>
                            <p class="text-xs text-gray-500 uppercase font-mono tracking-wide">{{ user.role }}</p>
                        </div>
                    </button>
                }
                </div>
            } 
            <!-- Step 2: PIN Entry -->
            @else {
                <div class="bg-gray-800/60 backdrop-blur-xl border border-gray-700 rounded-3xl p-8 shadow-2xl animate-fade-in text-center relative overflow-hidden">
                    <!-- Glass reflection -->
                    <div class="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

                    <button (click)="clearSelection()" class="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors z-20">
                        <span [innerHTML]="getIcon('X')" class="w-6 h-6"></span>
                    </button>

                    <div class="flex flex-col items-center mb-8 relative z-10">
                        <div class="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl border-4 border-wushai-black mb-4 ring-2 ring-gray-700"
                            [style.background-color]="selectedUser()?.avatarColor">
                            @if (selectedUser()?.avatarUrl) {
                               <img [src]="selectedUser()?.avatarUrl" [alt]="selectedUser()?.name" class="w-full h-full object-cover rounded-full">
                            } @else {
                               {{ selectedUser()?.name?.charAt(0) }}
                            }
                        </div>
                        <h3 class="text-2xl font-bold text-white">{{ selectedUser()?.name }}</h3>
                        <p class="text-wushai-sand/70 text-xs uppercase tracking-widest mt-1 font-bold">Security Clearance Required</p>
                    </div>

                    <!-- PIN Dots -->
                    <div class="flex justify-center gap-4 mb-8">
                        @for (i of [0,1,2,3,4,5]; track i) {
                            <div class="w-4 h-4 rounded-full border border-gray-500 transition-all duration-200"
                                [ngClass]="pin().length > i ? 'bg-wushai-olive border-wushai-olive scale-125 shadow-[0_0_10px_rgba(75,88,66,0.8)]' : 'bg-transparent'"></div>
                        }
                    </div>

                    <!-- Numpad -->
                    <div class="grid grid-cols-3 gap-4 mb-2 max-w-[280px] mx-auto">
                        @for (num of [1,2,3,4,5,6,7,8,9]; track num) {
                            <button (click)="enterDigit(num)" class="w-full aspect-square rounded-full bg-gray-700/30 hover:bg-gray-600/80 border border-white/5 hover:border-white/20 text-2xl font-medium transition-all active:scale-95 shadow-lg backdrop-blur-sm">
                                {{ num }}
                            </button>
                        }
                        <button (click)="handleBiometric()" class="w-full aspect-square rounded-full flex items-center justify-center text-red-400/80 hover:text-red-300 hover:bg-red-900/20 transition-all active:scale-95" title="Biometric Bypass">
                            <span [innerHTML]="getIcon('Fingerprint')" class="w-8 h-8"></span>
                        </button>
                        <button (click)="enterDigit(0)" class="w-full aspect-square rounded-full bg-gray-700/30 hover:bg-gray-600/80 border border-white/5 hover:border-white/20 text-2xl font-medium transition-all active:scale-95 shadow-lg backdrop-blur-sm">0</button>
                        <button (click)="backspace()" class="w-full aspect-square rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                            ⌫
                        </button>
                    </div>
                    
                    @if (error()) {
                        <p class="absolute bottom-4 left-0 right-0 text-center text-red-500 text-xs font-bold animate-shake tracking-widest uppercase">Invalid Access Code</p>
                    }
                </div>
            }
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
   // Use UserService directly for Auth
   private userService = inject(UserService);
   private sanitizer = inject(DomSanitizer);

   private allUsers = this.userService.availableUsers; // Use UserService
   private titleClicks = signal(0);
   private showAdmin = computed(() => this.titleClicks() >= 5);

   visibleUsers = computed(() => {
      if (this.showAdmin()) {
         return this.allUsers();
      }
      return this.allUsers().filter(u => u.role !== 'System Admin');
   });

   selectedUser = signal<User | null>(null);

   // Effect to auto-select admin if backdoor triggered and no user selected
   constructor() {
      effect(() => {
         if (this.showAdmin() && !this.selectedUser()) {
            // Find or create temp admin user for display
            const adminUser: User = {
               id: 'dev-admin',
               name: 'System Admin',
               email: 'admin@himcontrol.local',
               role: 'System Admin',
               avatarColor: '#4B5842',
               pin: '0000'
            };
            this.selectedUser.set(adminUser);
         }
      });
   }

   pin = signal('');
   error = signal(false);

   // Motion States
   loginState = signal<LoginState>('idle');
   loadingText = signal('INITIALIZING HANDSHAKE...');
   progress = signal(0);

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   handleTitleClick() {
      this.titleClicks.update(c => c + 1);
   }

   selectUser(user: User) {
      this.selectedUser.set(user);
      this.pin.set('');
      this.error.set(false);
   }

   clearSelection() {
      this.selectedUser.set(null);
      this.titleClicks.set(0);
   }

   enterDigit(num: number) {
      if (this.pin().length < 6) {
         this.pin.update(p => p + num);
         this.error.set(false);
         if (this.pin().length === 6) {
            this.attemptLogin();
         }
      }
   }

   backspace() {
      this.pin.update(p => p.slice(0, -1));
      this.error.set(false);
   }

   async attemptLogin() {
      const user = this.selectedUser();
      if (!user) return;

      // Note: In real auth, we verify against the server. 
      // We optimistically start the sequence.
      this.startLoginSequence();
   }

   handleBiometric() {
      // Check if this is the backdoor admin (title clicks >= 5)
      // AND attempting to bypass.
      if (this.showAdmin() && this.selectedUser()?.id === 'dev-admin') {
         this.loginState.set('authenticating');
         this.loadingText.set('OVERRIDING SECURITY PROTOCOLS...');
         this.progress.set(30);

         setTimeout(async () => {
            this.loadingText.set('INJECTING ADMIN CREDENTIALS...');
            this.progress.set(60);

            // Call special backdoor login
            await this.userService.loginAsBackdoorAdmin();

            this.loadingText.set('ACCESS GRANTED - GOD MODE');
            this.progress.set(100);
            this.loginState.set('success');
         }, 1500);
         return;
      }

      this.pin.set(this.selectedUser()?.pin || '000000');
      this.attemptLogin();
   }

   // --- The Magic Sequence ---
   async startLoginSequence() {
      this.loginState.set('authenticating');

      // Step 1: Authentication
      this.loadingText.set('VERIFYING BIOMETRICS...');
      this.progress.set(10);

      // Actual Login Attempt
      const user = this.selectedUser();
      if (!user) return;

      // Attempt Real Login
      const success = await this.userService.login(user.email, this.pin());

      if (!success) {
         // Login Failed
         this.loadingText.set('ACCESS DENIED');
         this.progress.set(0);
         setTimeout(() => {
            this.loginState.set('idle');
            this.error.set(true);
            this.pin.set('');
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
}
