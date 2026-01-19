
import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { ConfettiService } from '../../core/services/state/confetti.service';
import { ToastService } from '../../core/services/state/toast.service';

interface TeamMember {
   id: string;
   name: string;
   role: string;
   email: string;
   avatarColor: string;
   avatarUrl: string;
   xp: number;
   level: number;
   tasksDone: number;
   badges: string[];
}

@Component({
   selector: 'app-team',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-8 animate-fade-in pb-10">
      <header class="flex justify-between items-center">
        <div>
           <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-2">
             <span [innerHTML]="getIcon('Users')"></span>
             المجتمع والفريق (Team Hub)
           </h2>
           <p class="text-wushai-olive mt-2">لوحة الشرف وتصنيف الأداء.</p>
        </div>
      </header>

      <!-- Podium Section -->
      <div class="relative h-64 flex items-end justify-center gap-4 md:gap-8 pb-8 px-4">
         @for (member of topMembers(); track member.id; let i = $index) {
            <div class="flex flex-col items-center animate-slide-up" [style.animation-delay]="i * 100 + 'ms'">
               <!-- Avatar -->
               <div class="relative mb-2">
                  <div class="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 shadow-xl flex items-center justify-center text-2xl font-bold text-white relative z-10 bg-gray-200"
                       [style.background-color]="member.avatarColor"
                       [class.border-yellow-400]="i === 0"
                       [class.border-gray-300]="i === 1"
                       [class.border-orange-400]="i === 2">
                     @if (member.avatarUrl) {
                        <img [src]="member.avatarUrl" [alt]="member.name" class="w-full h-full object-cover rounded-full">
                     } @else {
                        {{ member.name.charAt(0) }}
                     }
                  </div>
                  @if (i === 0) {
                     <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-500 drop-shadow-md">
                        <span [innerHTML]="getIcon('Crown')" class="w-8 h-8"></span>
                     </div>
                  }
               </div>
               
               <!-- Name & Score -->
               <div class="text-center mb-2">
                  <p class="font-bold text-wushai-dark dark:text-white text-sm">{{ member.name }}</p>
                  <p class="text-xs font-bold text-wushai-olive">{{ member.xp }} XP</p>
               </div>

               <!-- Step -->
               <div class="w-20 md:w-32 bg-gradient-to-b from-wushai-sand to-wushai-light dark:from-wushai-deep dark:to-wushai-black rounded-t-lg shadow-sm border-t border-wushai-sand dark:border-wushai-olive flex items-end justify-center pb-2 text-2xl font-bold opacity-80"
                    [style.height]="(3 - i) * 30 + 40 + 'px'">
                  <span [class.text-yellow-600]="i === 0" [class.text-gray-500]="i === 1" [class.text-orange-600]="i === 2">
                     {{ i + 1 }}
                  </span>
               </div>
            </div>
         }
      </div>

      <!-- Main Roster Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         @for (member of rankedMembers(); track member.id; let i = $index) {
            <div class="bg-white dark:bg-wushai-black dark:border-wushai-olive border border-wushai-sand rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
               <!-- Rank Badge -->
               <div class="absolute top-0 right-0 bg-wushai-light dark:bg-wushai-deep px-3 py-1 rounded-bl-xl text-xs font-bold text-wushai-dark dark:text-wushai-sand">
                  #{{ i + 1 }}
               </div>

               <div class="flex flex-col items-center text-center">
                  <div class="w-20 h-20 rounded-full mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-inner relative bg-gray-200"
                       [style.background-color]="member.avatarColor">
                     @if (member.avatarUrl) {
                        <img [src]="member.avatarUrl" [alt]="member.name" class="w-full h-full object-cover rounded-full">
                     } @else {
                        {{ member.name.charAt(0) }}
                     }
                     <div class="absolute bottom-0 right-0 bg-white dark:bg-wushai-black rounded-full p-1 border border-wushai-sand">
                        <span class="text-xs font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Lvl {{ member.level }}</span>
                     </div>
                  </div>
                  
                  <h3 class="font-bold text-lg text-wushai-dark dark:text-white">{{ member.name }}</h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">{{ member.role }}</p>

                  <!-- XP Bar -->
                  <div class="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1">
                     <div class="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500" [style.width.%]="(member.xp % 100)"></div>
                  </div>
                  <div class="flex justify-between w-full text-[9px] text-gray-400 mb-4">
                     <span>{{ member.xp % 100 }} / 100 XP</span>
                     <span>Next Level</span>
                  </div>

                  <!-- Badges -->
                  <div class="flex gap-1 mb-6 h-6">
                     @for (badge of member.badges; track badge) {
                        <div class="text-yellow-500 tooltip-container" [title]="badge">
                           <span [innerHTML]="getIcon('Medal')" class="w-5 h-5"></span>
                        </div>
                     }
                  </div>

                  <!-- Stats Row -->
                  <div class="flex justify-around w-full border-t border-gray-100 dark:border-gray-800 pt-4 mb-4">
                     <div>
                        <p class="text-lg font-bold text-wushai-dark dark:text-white">{{ member.tasksDone }}</p>
                        <p class="text-[10px] text-gray-400 uppercase tracking-wide">Tasks</p>
                     </div>
                     <div>
                        <p class="text-lg font-bold text-wushai-dark dark:text-white">{{ member.xp }}</p>
                        <p class="text-[10px] text-gray-400 uppercase tracking-wide">Total XP</p>
                     </div>
                  </div>

                  <!-- Action -->
                  <button (click)="giveKudos(member.name)" class="w-full py-2 rounded-xl bg-wushai-light dark:bg-wushai-deep hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-600 font-bold text-sm transition-colors flex items-center justify-center gap-2 group-hover:scale-105">
                     <span [innerHTML]="getIcon('Heart')" class="w-4 h-4"></span>
                     كفو (Give Kudos)
                  </button>
               </div>
            </div>
         }
      </div>
    </div>
  `
})
export class TeamComponent {
   private dataService = inject(DataService);
   private sanitizer = inject(DomSanitizer);
   private confettiService = inject(ConfettiService);
   private toastService = inject(ToastService);

   private users = this.dataService.availableUsers;

   rankedMembers = computed(() => {
      const tasks = this.dataService.tasks();
      const logs = this.dataService.auditLogs();

      // Filter out System Admin from the team page
      const visibleUsers = this.users().filter(u => u.role !== 'System Admin');

      return visibleUsers.map(user => {
         const userTasks = tasks.filter(t => t.owner.includes(user.name) && t.status === 'Done').length;

         const userLogs = logs.filter(l => l.user.includes(user.name));
         let logScore = 0;
         userLogs.forEach(l => {
            if (l.action === 'Create') logScore += 10;
            if (l.action === 'Update') logScore += 5;
            if (l.action === 'Delete') logScore += 2;
         });

         const totalScore = (userTasks * 50) + logScore;
         const level = Math.floor(totalScore / 100) + 1;

         // Badges Logic
         const badges = [];
         if (totalScore > 100) badges.push('Expert');
         if (userTasks > 2) badges.push('Shipper');
         if (userLogs.length > 5) badges.push('Active');

         return {
            id: user.id,
            name: user.name,
            role: user.role,
            email: `${user.name.toLowerCase()}@wushai.com`,
            avatarColor: user.avatarColor,
            avatarUrl: user.avatarUrl,
            xp: totalScore,
            level: level,
            tasksDone: userTasks,
            badges: badges
         } as TeamMember;
      }).sort((a, b) => b.xp - a.xp);
   });

   topMembers = computed(() => this.rankedMembers().slice(0, 3));

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   giveKudos(name: string) {
      this.confettiService.launch(30);
      this.toastService.show(`👏 أرسلت "كفو" إلى ${name}!`, 'success');
      this.dataService.addNotification('Kudos Received', `Someone appreciated ${name}'s work!`, 'Success');
   }
}
