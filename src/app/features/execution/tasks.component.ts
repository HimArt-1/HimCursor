
import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { DataService, Task, Domain, Priority, User, Comment } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { ConfettiService } from '../../core/services/state/confetti.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col space-y-6 animate-fade-in relative">
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-500" [class.opacity-0]="zenModeTask()" [class.pointer-events-none]="zenModeTask()">
        <div>
           <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand">إدارة المهام</h2>
           <p class="text-wushai-olive dark:text-wushai-lilac/80 mt-2">تتبع سير العمل في كافة مجالات المشروع</p>
        </div>
        
        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
           <!-- Search Bar -->
           <div class="relative flex-1 md:flex-none">
              <span class="absolute right-3 top-2.5 text-gray-400 w-4 h-4" [innerHTML]="getIcon('Search')"></span>
              <input type="text" 
                     placeholder="بحث في العنوان والوصف..." 
                     (input)="searchText.set($any($event.target).value)"
                     class="w-full md:w-64 pr-9 pl-4 py-2 rounded-xl border border-wushai-sand dark:border-wushai-lilac/20 focus:outline-none focus:border-wushai-olive dark:focus:border-wushai-lilac text-sm bg-white dark:bg-wushai-surface dark:text-white shadow-sm transition-all placeholder-gray-400">
           </div>

           <!-- Owner Filter -->
           <div class="relative">
             <select [value]="ownerFilter()" (change)="ownerFilter.set($any($event.target).value)" 
                     class="appearance-none bg-white dark:bg-wushai-surface dark:text-wushai-sand border border-wushai-sand dark:border-wushai-lilac/20 text-gray-700 py-2 pr-4 pl-8 rounded-xl leading-tight focus:outline-none focus:border-wushai-olive dark:focus:border-wushai-lilac text-sm font-medium shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-wushai-surface/80 transition-colors">
               <option value="">كل الفريق</option>
               @for (owner of uniqueOwners(); track owner) {
                 <option [value]="owner">{{ owner }}</option>
               }
             </select>
             <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-700 dark:text-gray-400">
               <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
           </div>

           <!-- Status Filter -->
           <div class="relative">
             <select [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value)" 
                     class="appearance-none bg-white dark:bg-wushai-surface dark:text-wushai-sand border border-wushai-sand dark:border-wushai-lilac/20 text-gray-700 py-2 pr-4 pl-8 rounded-xl leading-tight focus:outline-none focus:border-wushai-olive dark:focus:border-wushai-lilac text-sm font-medium shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-wushai-surface/80 transition-colors">
               <option value="All">كل الحالات</option>
               <option value="Todo">للعمل</option>
               <option value="Doing">جاري</option>
               <option value="Done">مكتمل</option>
             </select>
             <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-700 dark:text-gray-400">
               <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
           </div>

           <!-- View Switcher -->
           <div class="bg-white dark:bg-wushai-surface border border-wushai-sand dark:border-wushai-lilac/20 rounded-xl p-1 flex shadow-sm">
              <button (click)="viewMode.set('Kanban')" 
                 class="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                 [ngClass]="viewMode() === 'Kanban' ? 'bg-wushai-sand dark:bg-wushai-lilac/20 text-wushai-dark dark:text-wushai-sand shadow-sm' : 'text-gray-400 hover:text-wushai-dark dark:hover:text-wushai-sand hover:bg-gray-50 dark:hover:bg-white/5'">
                 <span class="w-4 h-4" [innerHTML]="getIcon('BarChart')"></span>
              </button>
              <button (click)="viewMode.set('List')" 
                 class="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                 [ngClass]="viewMode() === 'List' ? 'bg-wushai-sand dark:bg-wushai-lilac/20 text-wushai-dark dark:text-wushai-sand shadow-sm' : 'text-gray-400 hover:text-wushai-dark dark:hover:text-wushai-sand hover:bg-gray-50 dark:hover:bg-white/5'">
                 <span class="w-4 h-4" [innerHTML]="getIcon('List')"></span>
              </button>
           </div>

           <button class="bg-wushai-brown hover:bg-wushai-deep dark:bg-wushai-lilac dark:hover:bg-purple-400 dark:text-wushai-sidebar-dark text-white px-5 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-wushai-brown/20 dark:shadow-none"
                (click)="openModal(null)">
              <span [innerHTML]="getIcon('Plus')" class="w-5 h-5"></span>
              <span class="hidden md:inline">مهمة جديدة</span>
           </button>
        </div>
      </header>

      <!-- Quick Add -->
      <div class="bg-white dark:bg-wushai-surface border border-wushai-sand dark:border-wushai-lilac/10 rounded-2xl p-4 shadow-sm transition-all duration-500"
           [class.opacity-0]="zenModeTask()" [class.pointer-events-none]="zenModeTask()">
        <div class="flex flex-col md:flex-row md:items-center gap-3">
          <div class="flex-1 relative">
            <input type="text"
                   [value]="quickTaskTitle()"
                   (input)="quickTaskTitle.set($any($event.target).value)"
                   (keyup.enter)="createQuickTask()"
                   placeholder="أضف مهمة بسرعة... (اضغط Enter)"
                   class="w-full pr-4 pl-4 py-2.5 rounded-xl border border-wushai-sand dark:border-wushai-lilac/20 focus:outline-none focus:border-wushai-olive dark:focus:border-wushai-lilac text-sm bg-white dark:bg-wushai-surface dark:text-white shadow-sm">
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select [value]="quickTaskDomain()" (change)="quickTaskDomain.set($any($event.target).value)"
                    class="bg-white dark:bg-wushai-surface dark:text-wushai-sand border border-wushai-sand dark:border-wushai-lilac/20 text-gray-700 py-2 pr-4 pl-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer">
              <option value="Design">Design</option>
              <option value="Development">Development</option>
              <option value="Marketing">Marketing</option>
              <option value="Store">Store</option>
              <option value="Operations">Operations</option>
            </select>
            <select [value]="quickTaskPriority()" (change)="quickTaskPriority.set($any($event.target).value)"
                    class="bg-white dark:bg-wushai-surface dark:text-wushai-sand border border-wushai-sand dark:border-wushai-lilac/20 text-gray-700 py-2 pr-4 pl-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <input type="date"
                   [value]="quickTaskDue()"
                   (change)="quickTaskDue.set($any($event.target).value)"
                   class="bg-white dark:bg-wushai-surface dark:text-wushai-sand border border-wushai-sand dark:border-wushai-lilac/20 text-gray-700 py-2 px-3 rounded-xl text-xs font-bold shadow-sm">
            <button (click)="createQuickTask()"
                    class="bg-wushai-dark text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-wushai-black transition-colors shadow-sm">
              إضافة
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Filters -->
      <div class="flex flex-wrap items-center gap-2 transition-all duration-500" [class.opacity-0]="zenModeTask()" [class.pointer-events-none]="zenModeTask()">
        <button (click)="toggleOverdue()"
                class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-2"
                [ngClass]="overdueOnly() ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50' : 'bg-white dark:bg-wushai-surface text-gray-500 border-wushai-sand dark:border-wushai-lilac/10 hover:text-red-600'">
          متأخر
          <span class="text-[10px] bg-white/70 dark:bg-black/20 px-1.5 py-0.5 rounded">{{ overdueCount() }}</span>
        </button>
        <button (click)="toggleDueSoon(7)"
                class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-2"
                [ngClass]="dueWithinDays() === 7 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50' : 'bg-white dark:bg-wushai-surface text-gray-500 border-wushai-sand dark:border-wushai-lilac/10 hover:text-amber-600'">
          خلال 7 أيام
          <span class="text-[10px] bg-white/70 dark:bg-black/20 px-1.5 py-0.5 rounded">{{ dueSoonCount() }}</span>
        </button>
        <button (click)="toggleHighPriority()"
                class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-2"
                [ngClass]="highPriorityOnly() ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/50' : 'bg-white dark:bg-wushai-surface text-gray-500 border-wushai-sand dark:border-wushai-lilac/10 hover:text-purple-600'">
          أولوية عالية
          <span class="text-[10px] bg-white/70 dark:bg-black/20 px-1.5 py-0.5 rounded">{{ highPriorityCount() }}</span>
        </button>
        <button (click)="toggleMineOnly()"
                class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-2"
                [ngClass]="mineOnly() ? 'bg-wushai-olive/20 text-wushai-olive border-wushai-olive/40 dark:bg-wushai-lilac/10 dark:text-wushai-lilac dark:border-wushai-lilac/30' : 'bg-white dark:bg-wushai-surface text-gray-500 border-wushai-sand dark:border-wushai-lilac/10 hover:text-wushai-olive'">
          مهماتي
          <span class="text-[10px] bg-white/70 dark:bg-black/20 px-1.5 py-0.5 rounded">{{ mineCount() }}</span>
        </button>
        <button (click)="resetFilters()" class="px-3 py-1.5 rounded-full text-xs font-bold border border-wushai-sand dark:border-wushai-lilac/10 text-gray-400 hover:text-wushai-dark dark:hover:text-wushai-sand transition-colors">
          إعادة ضبط
        </button>
      </div>

      <!-- Zen Mode Overlay -->
      @if (zenModeTask()) {
        <div class="fixed inset-0 z-40 bg-wushai-light/95 dark:bg-wushai-espresso/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in p-8">
            <button (click)="toggleZenMode(null)" class="absolute top-8 right-8 text-gray-500 hover:text-wushai-dark dark:hover:text-wushai-sand flex items-center gap-2 font-bold px-4 py-2 rounded-full hover:bg-white/50 dark:hover:bg-wushai-surface/50 transition-all">
                <span class="text-xl">✕</span> Exit Focus
            </button>
            
            <div class="max-w-3xl w-full text-center space-y-8">
                <span class="inline-block px-4 py-1.5 rounded-full bg-wushai-olive dark:bg-wushai-lilac text-white dark:text-wushai-sidebar-dark text-sm font-bold tracking-widest uppercase">
                    Currently Focusing On
                </span>
                <h1 class="text-5xl md:text-6xl font-extrabold text-wushai-dark dark:text-wushai-sand leading-tight">
                    {{ zenModeTask()?.title }}
                </h1>
                <p class="text-2xl text-wushai-brown dark:text-wushai-lilac/80 opacity-80 max-w-2xl mx-auto leading-relaxed">
                    {{ zenModeTask()?.description || 'No description provided for this task.' }}
                </p>
                
                <div class="flex items-center justify-center gap-6 mt-8">
                     <div class="flex flex-col items-center">
                        <span class="text-xs font-bold text-gray-400 uppercase">Priority</span>
                        <span class="text-xl font-bold" [class]="getPriorityClass(zenModeTask()!.priority)">{{ zenModeTask()?.priority }}</span>
                     </div>
                     <div class="w-px h-10 bg-gray-300 dark:bg-gray-700"></div>
                     <div class="flex flex-col items-center">
                        <span class="text-xs font-bold text-gray-400 uppercase">Due Date</span>
                        <span class="text-xl font-bold text-wushai-dark dark:text-wushai-sand">{{ zenModeTask()?.dueDate | date:'mediumDate' }}</span>
                     </div>
                </div>

                <div class="pt-12 flex justify-center gap-4">
                     @if(zenModeTask()?.status !== 'Done') {
                        <button (click)="completeTaskInZen()" class="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl text-xl font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-3">
                           <span [innerHTML]="getIcon('Check')" class="w-6 h-6"></span> Mark Complete
                        </button>
                     } @else {
                        <div class="text-green-600 dark:text-green-400 font-bold text-2xl flex items-center gap-2 animate-bounce">
                           <span [innerHTML]="getIcon('Check')" class="w-8 h-8"></span> Completed! Great Job!
                        </div>
                     }
                </div>
            </div>
        </div>
      }

      @if (viewMode() === 'Kanban') {
        <!-- Kanban Board -->
        <div class="flex-1 overflow-x-auto pb-4 transition-all duration-500" [class.opacity-0]="zenModeTask()" [class.pointer-events-none]="zenModeTask()">
          <div class="flex gap-6 h-full min-w-[1000px]">

            <!-- Todo Column -->
            <div class="flex-1 rounded-2xl p-4 flex flex-col h-full border backdrop-blur-sm transition-all duration-300"
                 [ngClass]="dragOverColumn() === 'Todo' ? 'bg-wushai-sand/80 dark:bg-wushai-surface/80 border-wushai-olive border-dashed scale-[1.01] shadow-lg' : 'bg-wushai-sand/30 dark:bg-wushai-surface/30 border-wushai-sand dark:border-wushai-lilac/10'"
                 (dragover)="onDragOver($event, 'Todo')"
                 (dragleave)="onDragLeave()"
                 (drop)="onDrop($event, 'Todo')">
              <div class="flex items-center justify-between mb-4 pointer-events-none">
                 <h3 class="font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-2">
                   <span class="w-2.5 h-2.5 rounded-full bg-gray-400"></span> للعمل (Todo)
                 </h3>
                 <span class="bg-white dark:bg-wushai-surface px-2 py-0.5 rounded-md text-xs font-bold shadow-sm text-gray-600 dark:text-gray-400">{{ getTasksByStatus('Todo').length }}</span>
              </div>
              <div class="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[100px]">
                @for (task of getTasksByStatus('Todo'); track task.id) {
                   <ng-container *ngTemplateOutlet="taskCard; context: { $implicit: task }"></ng-container>
                }
                @if(getTasksByStatus('Todo').length === 0 && dragOverColumn() !== 'Todo') {
                    <div class="h-24 flex items-center justify-center text-gray-400 text-xs border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                        لا توجد مهام
                    </div>
                }
              </div>
            </div>

            <!-- Doing Column -->
            <div class="flex-1 rounded-2xl p-4 flex flex-col h-full border backdrop-blur-sm transition-all duration-300"
                 [ngClass]="dragOverColumn() === 'Doing' ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-400 border-dashed scale-[1.01] shadow-lg' : 'bg-wushai-sand/50 dark:bg-wushai-surface/50 border-wushai-sand dark:border-wushai-lilac/10'"
                 (dragover)="onDragOver($event, 'Doing')"
                 (dragleave)="onDragLeave()"
                 (drop)="onDrop($event, 'Doing')">
              <div class="flex items-center justify-between mb-4 pointer-events-none">
                 <h3 class="font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-2">
                   <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span> جاري التنفيذ
                 </h3>
                 <span class="bg-white dark:bg-wushai-surface px-2 py-0.5 rounded-md text-xs font-bold shadow-sm text-blue-600 dark:text-blue-400">{{ getTasksByStatus('Doing').length }}</span>
              </div>
              <div class="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[100px]">
                @for (task of getTasksByStatus('Doing'); track task.id) {
                  <ng-container *ngTemplateOutlet="taskCard; context: { $implicit: task }"></ng-container>
                }
              </div>
            </div>

            <!-- Done Column -->
            <div class="flex-1 rounded-2xl p-4 flex flex-col h-full border backdrop-blur-sm transition-all duration-300"
                 [ngClass]="dragOverColumn() === 'Done' ? 'bg-green-50/80 dark:bg-green-900/20 border-green-400 border-dashed scale-[1.01] shadow-lg' : 'bg-wushai-sand/30 dark:bg-wushai-surface/30 border-wushai-sand dark:border-wushai-lilac/10'"
                 (dragover)="onDragOver($event, 'Done')"
                 (dragleave)="onDragLeave()"
                 (drop)="onDrop($event, 'Done')">
              <div class="flex items-center justify-between mb-4 pointer-events-none">
                 <h3 class="font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-2">
                   <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span> مكتمل (Done)
                 </h3>
                 <span class="bg-white dark:bg-wushai-surface px-2 py-0.5 rounded-md text-xs font-bold shadow-sm text-green-600 dark:text-green-400">{{ getTasksByStatus('Done').length }}</span>
              </div>
              <div class="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[100px]">
                 @for (task of getTasksByStatus('Done'); track task.id) {
                   <ng-container *ngTemplateOutlet="taskCard; context: { $implicit: task }"></ng-container>
                }
              </div>
            </div>

          </div>
        </div>
      } @else {
        <!-- List View -->
        <div class="bg-white dark:bg-wushai-surface border border-wushai-sand dark:border-wushai-lilac/10 rounded-2xl shadow-sm overflow-hidden flex-1 transition-all duration-500" [class.opacity-0]="zenModeTask()">
          <table class="w-full text-right">
             <thead class="bg-wushai-light dark:bg-wushai-black border-b border-wushai-sand dark:border-wushai-lilac/10">
               <tr>
                 <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">المهمة</th>
                 <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">المجال</th>
                 <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الوسوم</th>
                 <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">المالك</th>
                 <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الموعد</th>
                 <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الأولوية</th>
                 <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الحالة</th>
                 <th class="p-4 text-sm font-bold text-wushai-dark dark:text-wushai-sand">الإجراء</th>
               </tr>
             </thead>
             <tbody>
               @for (task of filteredTasks(); track task.id) {
                 <tr class="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-wushai-black/30 transition-colors">
                   <td class="p-4 max-w-xs">
                     <p class="font-bold text-wushai-dark dark:text-wushai-sand">{{ task.title }}</p>
                     <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{{ task.description || 'لا يوجد وصف' }}</p>
                   </td>
                   <td class="p-4">
                     <span class="text-xs font-medium px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{{ task.domain }}</span>
                   </td>
                   <td class="p-4">
                      <div class="flex flex-wrap gap-1">
                        @for(tag of task.tags; track tag) {
                          <span class="text-[10px] bg-wushai-sand/50 dark:bg-wushai-lilac/10 text-wushai-olive dark:text-wushai-lilac px-1.5 py-0.5 rounded border border-wushai-sand dark:border-wushai-lilac/10">#{{tag}}</span>
                        }
                      </div>
                   </td>
                   <td class="p-4 text-sm text-gray-600 dark:text-gray-400">{{ task.owner }}</td>
                   <td class="p-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{{ task.dueDate | date:'shortDate' }}</td>
                   <td class="p-4">
                      <span [class]="getPriorityClass(task.priority) + ' text-xs px-2 py-1 rounded-full bg-opacity-10 bg-current'">{{ task.priority }}</span>
                   </td>
                   <td class="p-4">
                      @if(task.status === 'Todo') {
                        <span class="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">للعمل</span>
                      } @else if(task.status === 'Doing') {
                        <span class="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">جاري</span>
                      } @else {
                        <span class="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md">مكتمل</span>
                      }
                   </td>
                   <td class="p-4">
                      <div class="flex items-center gap-2">
                        <button class="text-gray-400 hover:text-blue-600 transition-colors" (click)="openModal(task)">
                          <span [innerHTML]="getIcon('Edit')" class="w-4 h-4"></span>
                        </button>
                        <button class="text-gray-400 hover:text-wushai-olive dark:hover:text-wushai-lilac transition-colors" title="Zen Mode" (click)="toggleZenMode(task)">
                          <span [innerHTML]="getIcon('Search')" class="w-4 h-4"></span>
                        </button>
                        <button class="text-gray-400 hover:text-red-500 transition-colors" (click)="deleteTask(task.id)">
                          <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
                        </button>
                      </div>
                   </td>
                 </tr>
               }
             </tbody>
          </table>
        </div>
      }

      <!-- Shared Task Card Template -->
      <ng-template #taskCard let-task>
        <div draggable="true"
             (dragstart)="onDragStart($event, task.id)" 
             (dragend)="onDragEnd()"
             [class.opacity-40]="draggedTaskId() === task.id"
             [class.scale-95]="draggedTaskId() === task.id"
             class="bg-white dark:bg-wushai-surface p-4 rounded-xl shadow-sm border border-wushai-sand dark:border-wushai-lilac/10 group hover:shadow-md transition-all duration-200 cursor-move relative overflow-hidden flex flex-col gap-2 hover:-translate-y-1">
            
            <!-- Edit Button on Hover -->
            <button (click)="openModal(task)" class="absolute top-2 left-2 z-20 bg-white dark:bg-wushai-black shadow-sm p-1.5 rounded-lg text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
               <span [innerHTML]="getIcon('Edit')" class="w-3 h-3"></span>
            </button>

             <!-- Zen Button on Hover -->
            <button (click)="toggleZenMode(task)" title="Focus (Zen Mode)" class="absolute top-2 left-10 z-20 bg-white dark:bg-wushai-black shadow-sm p-1.5 rounded-lg text-gray-400 hover:text-wushai-olive dark:hover:text-wushai-lilac opacity-0 group-hover:opacity-100 transition-all">
               <span [innerHTML]="getIcon('Search')" class="w-3 h-3"></span>
            </button>

            <!-- Top Row: Domain & Actions -->
            <div class="flex justify-between items-start">
              <span class="text-[10px] font-bold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase tracking-wider">{{ task.domain }}</span>
              
              <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-wushai-black/80 backdrop-blur-sm rounded-lg shadow-sm p-0.5 absolute left-20 top-2">
                @if(task.status !== 'Todo') {
                  <button (click)="moveTask(task.id, 'Todo')" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500" title="للعمل">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                }
                @if(task.status !== 'Doing') {
                  <button (click)="moveTask(task.id, 'Doing')" class="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-blue-600" title="جاري">
                      <span *ngIf="task.status === 'Todo'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </span>
                      <span *ngIf="task.status === 'Done'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                      </span>
                  </button>
                }
                @if(task.status !== 'Done') {
                  <button (click)="moveTask(task.id, 'Done')" class="p-1 hover:bg-green-50 dark:hover:bg-green-900/30 rounded text-green-600" title="إتمام">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                }
              </div>
            </div>

            <!-- Content -->
            <div>
              <h4 class="font-bold text-wushai-deep dark:text-wushai-sand leading-snug" [class.line-through]="task.status === 'Done'" [class.text-gray-400]="task.status === 'Done'" [class.dark:text-gray-500]="task.status === 'Done'">{{ task.title }}</h4>
              @if(task.description) {
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{{ task.description }}</p>
              }
            </div>

            <!-- Tags -->
            @if(task.tags && task.tags.length > 0) {
              <div class="flex flex-wrap gap-1.5 mt-1">
                @for(tag of task.tags; track tag) {
                  <span class="text-[10px] font-medium bg-wushai-light dark:bg-wushai-lilac/10 text-wushai-olive dark:text-wushai-lilac px-1.5 py-0.5 rounded border border-wushai-sand/50 dark:border-wushai-lilac/10">#{{ tag }}</span>
                }
              </div>
            }

            <!-- Footer -->
            <div class="flex items-center justify-between text-xs pt-3 border-t border-gray-50 dark:border-gray-700/50 mt-1">
                <div class="flex items-center gap-1.5 text-wushai-olive dark:text-wushai-lilac font-medium">
                  <div class="w-5 h-5 rounded-full bg-wushai-sand dark:bg-wushai-lilac/20 flex items-center justify-center text-[9px] border border-white dark:border-wushai-surface shadow-sm">{{ task.owner.charAt(0) }}</div>
                  {{ task.owner }}
                </div>
                
                <div class="flex items-center gap-3">
                   <button (click)="openModal(task)" class="flex items-center gap-1 text-gray-400 font-bold hover:text-wushai-olive dark:hover:text-wushai-lilac transition-colors" title="View Comments">
                      <span [innerHTML]="getIcon('MessageSquare')" class="w-4 h-4"></span>
                      @if(task.commentCount > 0) {
                         <span>{{ task.commentCount }}</span>
                      }
                   </button>
                   <div class="flex items-center gap-1 font-mono text-[10px]" 
                     [ngClass]="isOverdue(task.dueDate) && task.status !== 'Done' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-400 dark:text-gray-500'">
                      <span class="w-3 h-3" [innerHTML]="getIcon('Clock')"></span>
                      {{ task.dueDate | date:'MM/dd' }}
                   </div>
                   <span [class]="getPriorityClass(task.priority)">{{ task.priority }}</span>
                </div>
            </div>
        </div>
      </ng-template>

      <!-- Create/Edit Task Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
           <div class="bg-white dark:bg-wushai-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-wushai-sand dark:border-wushai-lilac/20">
              <div class="flex flex-col h-[90vh] max-h-[700px]">
                <div class="p-5 border-b border-wushai-sand dark:border-wushai-lilac/10 bg-wushai-light dark:bg-wushai-black flex justify-between items-center">
                    <h3 class="font-bold text-xl text-wushai-dark dark:text-wushai-sand">
                        @if(editingTask()) { تعديل المهمة } @else { إضافة مهمة جديدة }
                    </h3>
                    <button (click)="closeModal()" class="text-gray-400 hover:text-red-600 transition-colors">
                        <span [innerHTML]="getIcon('X')"></span>
                    </button>
                </div>
                
                <!-- Form Area -->
                <div class="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label class="block text-sm font-bold text-wushai-olive dark:text-wushai-lilac mb-1">عنوان المهمة</label>
                        <input #tTitle type="text" [value]="editingTask()?.title || ''" class="w-full border rounded-lg p-3 focus:ring-2 focus:ring-wushai-olive dark:focus:ring-wushai-lilac outline-none text-sm bg-gray-50 dark:bg-wushai-deep dark:border-gray-600 dark:text-white" placeholder="ماذا تريد أن تنجز؟">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-bold text-wushai-olive dark:text-wushai-lilac mb-1">الوصف</label>
                        <textarea #tDesc rows="3" class="w-full border rounded-lg p-3 focus:ring-2 focus:ring-wushai-olive dark:focus:ring-wushai-lilac outline-none text-sm bg-gray-50 dark:bg-wushai-deep dark:border-gray-600 dark:text-white" placeholder="تفاصيل إضافية للمهمة...">{{ editingTask()?.description || '' }}</textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                        <label class="block text-sm font-bold text-wushai-olive dark:text-wushai-lilac mb-1">المجال</label>
                        <select #tDomain [value]="editingTask()?.domain || 'Development'" class="w-full border rounded-lg p-3 focus:ring-2 focus:ring-wushai-olive dark:focus:ring-wushai-lilac outline-none text-sm bg-white dark:bg-wushai-deep dark:border-gray-600 dark:text-white">
                            <option value="Design">Design</option>
                            <option value="Development">Development</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Store">Store</option>
                            <option value="Operations">Operations</option>
                        </select>
                        </div>
                        <div>
                        <label class="block text-sm font-bold text-wushai-olive dark:text-wushai-lilac mb-1">الأولوية</label>
                        <select #tPriority [value]="editingTask()?.priority || 'Medium'" class="w-full border rounded-lg p-3 focus:ring-2 focus:ring-wushai-olive dark:focus:ring-wushai-lilac outline-none text-sm bg-white dark:bg-wushai-deep dark:border-gray-600 dark:text-white">
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-wushai-olive dark:text-wushai-lilac mb-1">المالك</label>
                        <input #tOwner type="text" [value]="editingTask()?.owner || ''" class="w-full border rounded-lg p-3 focus:ring-2 focus:ring-wushai-olive dark:focus:ring-wushai-lilac outline-none text-sm bg-gray-50 dark:bg-wushai-deep dark:border-gray-600 dark:text-white" placeholder="اسم الموظف">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-wushai-olive dark:text-wushai-lilac mb-1">تاريخ الاستحقاق</label>
                        <input #tDate type="date" [value]="editingTask()?.dueDate ? (editingTask()?.dueDate | date:'yyyy-MM-dd') : ''" class="w-full border rounded-lg p-3 focus:ring-2 focus:ring-wushai-olive dark:focus:ring-wushai-lilac outline-none text-sm bg-white dark:bg-wushai-deep dark:border-gray-600 dark:text-white">
                    </div>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-wushai-olive dark:text-wushai-lilac mb-1">الوسوم (مفصولة بفاصلة)</label>
                        <input #tTags type="text" [value]="editingTask()?.tags?.join(', ') || ''" class="w-full border rounded-lg p-3 focus:ring-2 focus:ring-wushai-olive dark:focus:ring-wushai-lilac outline-none text-sm bg-gray-50 dark:bg-wushai-deep dark:border-gray-600 dark:text-white" placeholder="مثال: رمضان, عاجل, محتوى">
                    </div>
                    
                    <button (click)="saveTask(tTitle.value, tDesc.value, tDomain.value, tPriority.value, tOwner.value, tDate.value, tTags.value)" 
                        class="w-full bg-wushai-dark dark:bg-wushai-lilac text-white dark:text-wushai-sidebar-dark py-3 rounded-xl font-bold hover:bg-wushai-black dark:hover:bg-purple-300 transition-all mt-2 shadow-lg shadow-wushai-dark/20 dark:shadow-none">
                        {{ editingTask() ? 'حفظ التعديلات' : 'إنشاء المهمة' }}
                    </button>
                </div>

                <!-- Discussion Section -->
                @if(editingTask()) {
                    <div class="flex-1 flex flex-col p-6 border-t border-wushai-sand dark:border-gray-700 bg-gray-50 dark:bg-wushai-deep/50 overflow-hidden">
                        <h4 class="font-bold text-wushai-dark dark:text-wushai-sand mb-4 flex-shrink-0">المناقشة (Discussion)</h4>
                        
                        <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                            @for(comment of taskComments(); track comment.id) {
                                @let user = getUserById(comment.userId);
                                <div class="flex items-start gap-3">
                                    @if (user?.avatarUrl) {
                                      <img [src]="user.avatarUrl" [alt]="user.name" class="w-8 h-8 rounded-full object-cover shadow-sm flex-shrink-0">
                                    } @else {
                                      <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm flex-shrink-0" [style.background-color]="user?.avatarColor">
                                        {{ user?.name.charAt(0) }}
                                      </div>
                                    }
                                    <div class="flex-1">
                                        <div class="flex items-baseline gap-2">
                                            <span class="font-bold text-sm text-wushai-dark dark:text-wushai-sand">{{ user?.name }}</span>
                                            <span class="text-[10px] text-gray-400 font-mono">{{ formatRelativeTime(comment.timestamp) }}</span>
                                        </div>
                                        <p class="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-wushai-deep p-3 rounded-lg rounded-tl-none mt-1 border border-gray-100 dark:border-gray-600">
                                            {{ comment.text }}
                                        </p>
                                    </div>
                                </div>
                            }
                            @if(taskComments().length === 0) {
                                <div class="text-center text-xs text-gray-400 pt-8">لا توجد تعليقات. كن أول من يبدأ النقاش!</div>
                            }
                        </div>
                        
                        <div class="mt-4 flex items-center gap-3 pt-4 border-t border-wushai-sand dark:border-gray-700 flex-shrink-0">
                           <input #commentInput (keyup.enter)="addComment(commentInput.value); commentInput.value=''" type="text" placeholder="أضف تعليقاً..." class="w-full border rounded-lg p-3 text-sm bg-white dark:bg-wushai-deep dark:text-white dark:border-gray-600 focus:outline-none focus:border-wushai-olive">
                           <button (click)="addComment(commentInput.value); commentInput.value=''" class="bg-wushai-olive hover:bg-wushai-dark text-white p-3 rounded-lg transition-colors">
                              <span [innerHTML]="getIcon('Send')"></span>
                           </button>
                        </div>
                    </div>
                }
              </div>
           </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #EBE5D9; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9D8BB1; }
  `]
})
export class TasksComponent {
  private dataService = inject(DataService);
  private sanitizer = inject(DomSanitizer);
  private confettiService = inject(ConfettiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly filterStorageKey = 'himcontrol_task_filters';

  tasks = this.dataService.tasks;
  viewMode = signal<'Kanban' | 'List'>('Kanban');
  showModal = signal(false);
  editingTask = signal<Task | null>(null);
  zenModeTask = signal<Task | null>(null);

  // Drag and Drop State
  draggedTaskId = signal<string | null>(null);
  dragOverColumn = signal<string | null>(null);

  // Search & Filter State
  searchText = signal('');
  ownerFilter = signal('');
  statusFilter = signal<'All' | 'Todo' | 'Doing' | 'Done'>('All');
  overdueOnly = signal(false);
  dueWithinDays = signal<number | null>(null);
  highPriorityOnly = signal(false);
  mineOnly = signal(false);

  // Quick Add State
  quickTaskTitle = signal('');
  quickTaskDomain = signal<Domain>('Development');
  quickTaskPriority = signal<Priority>('Medium');
  quickTaskDue = signal<string>('');

  // User map for comments
  private userMap = computed(() => {
    const map = new Map<string, User>();
    this.dataService.availableUsers().forEach(user => map.set(user.id, user));
    return map;
  });

  // Computed: Unique Owners for Filter
  uniqueOwners = computed(() => {
    const allTasks = this.tasks();
    const owners = new Set(allTasks.map(t => t.owner));
    return Array.from(owners);
  });

  overdueCount = computed(() => this.tasks().filter(t => t.status !== 'Done' && this.isOverdue(t.dueDate)).length);
  dueSoonCount = computed(() => this.tasks().filter(t => t.status !== 'Done' && this.isDueWithin(t.dueDate, 7)).length);
  highPriorityCount = computed(() => this.tasks().filter(t => t.status !== 'Done' && t.priority === 'High').length);
  mineCount = computed(() => {
    const name = this.dataService.currentUser()?.name;
    if (!name) return 0;
    return this.tasks().filter(t => t.status !== 'Done' && t.owner === name).length;
  });

  // Computed: Filtered Tasks
  filteredTasks = computed(() => {
    const all = this.tasks();
    const search = this.searchText().toLowerCase().trim();
    const owner = this.ownerFilter();
    const status = this.statusFilter();
    const overdueOnly = this.overdueOnly();
    const dueWithinDays = this.dueWithinDays();
    const highPriorityOnly = this.highPriorityOnly();
    const mineOnly = this.mineOnly();
    const currentUser = this.dataService.currentUser()?.name || null;
    const comments = this.dataService.comments();

    return all
      .map(task => {
        const commentCount = comments.filter(c => c.taskId === task.id).length;
        return { ...task, commentCount };
      })
      .filter(task => {
        const matchesSearch = !search ||
          task.title.toLowerCase().includes(search) ||
          (task.description || '').toLowerCase().includes(search);
        const matchesOwner = !owner || task.owner === owner;
        const matchesMine = !mineOnly || (!!currentUser && task.owner === currentUser);
        const matchesStatus = status === 'All' || task.status === status;
        const matchesOverdue = !overdueOnly || (task.status !== 'Done' && this.isOverdue(task.dueDate));
        const matchesDueSoon = dueWithinDays === null || (task.status !== 'Done' && this.isDueWithin(task.dueDate, dueWithinDays));
        const matchesPriority = !highPriorityOnly || task.priority === 'High';
        return matchesSearch && matchesOwner && matchesMine && matchesStatus && matchesOverdue && matchesDueSoon && matchesPriority;
      });
  });

  taskComments = computed(() => {
    const taskId = this.editingTask()?.id;
    if (!taskId) return [];
    return this.dataService.comments()
      .filter(c => c.taskId === taskId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  });

  constructor() {
    this.restoreFilters();
    this.applyQueryParams(this.route.snapshot.queryParamMap);
    this.persistFilters();
  }

  private persistFilters() {
    effect(() => {
      const payload = {
        viewMode: this.viewMode(),
        searchText: this.searchText(),
        ownerFilter: this.ownerFilter(),
        statusFilter: this.statusFilter(),
        overdueOnly: this.overdueOnly(),
        dueWithinDays: this.dueWithinDays(),
        highPriorityOnly: this.highPriorityOnly(),
        mineOnly: this.mineOnly()
      };
      localStorage.setItem(this.filterStorageKey, JSON.stringify(payload));
    });
  }

  private restoreFilters() {
    const stored = localStorage.getItem(this.filterStorageKey);
    if (!stored) return;
    try {
      const saved = JSON.parse(stored);
      if (saved.viewMode) this.viewMode.set(saved.viewMode);
      if (typeof saved.searchText === 'string') this.searchText.set(saved.searchText);
      if (typeof saved.ownerFilter === 'string') this.ownerFilter.set(saved.ownerFilter);
      if (saved.statusFilter) this.statusFilter.set(saved.statusFilter);
      if (typeof saved.overdueOnly === 'boolean') this.overdueOnly.set(saved.overdueOnly);
      if (typeof saved.dueWithinDays === 'number' || saved.dueWithinDays === null) this.dueWithinDays.set(saved.dueWithinDays);
      if (typeof saved.highPriorityOnly === 'boolean') this.highPriorityOnly.set(saved.highPriorityOnly);
      if (typeof saved.mineOnly === 'boolean') this.mineOnly.set(saved.mineOnly);
    } catch {
      // Ignore invalid cache
    }
  }

  private applyQueryParams(params: ParamMap) {
    const status = params.get('status');
    if (status === 'Todo' || status === 'Doing' || status === 'Done' || status === 'All') {
      this.statusFilter.set(status);
    }
    const overdue = params.get('overdue');
    if (this.isTruthyParam(overdue)) this.overdueOnly.set(true);

    const due = params.get('due');
    if (due && !Number.isNaN(Number(due))) {
      this.dueWithinDays.set(Number(due));
    }

    const priority = params.get('priority');
    if (priority === 'High' || this.isTruthyParam(params.get('high'))) {
      this.highPriorityOnly.set(true);
    }

    const owner = params.get('owner');
    if (owner) {
      if (owner === 'me') this.mineOnly.set(true);
      else this.ownerFilter.set(owner);
    }

    const query = params.get('q');
    if (query) this.searchText.set(query);

    const view = params.get('view');
    if (view === 'Kanban' || view === 'List') this.viewMode.set(view);

    if (this.isTruthyParam(params.get('new'))) {
      setTimeout(() => this.openModal(null), 0);
    }
  }

  private isTruthyParam(value: string | null): boolean {
    if (!value) return false;
    return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
  }

  getTasksByStatus(status: string) {
    return this.filteredTasks().filter(t => t.status === status);
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  getPriorityClass(priority: string) {
    switch (priority) {
      case 'High': return 'text-red-600 dark:text-red-400 font-bold';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-500 font-medium';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  }

  toggleOverdue() {
    this.overdueOnly.update(v => !v);
  }

  toggleDueSoon(days = 7) {
    this.dueWithinDays.set(this.dueWithinDays() === days ? null : days);
  }

  toggleHighPriority() {
    this.highPriorityOnly.update(v => !v);
  }

  toggleMineOnly() {
    const next = !this.mineOnly();
    this.mineOnly.set(next);
    if (next) this.ownerFilter.set('');
  }

  resetFilters() {
    this.searchText.set('');
    this.ownerFilter.set('');
    this.statusFilter.set('All');
    this.overdueOnly.set(false);
    this.dueWithinDays.set(null);
    this.highPriorityOnly.set(false);
    this.mineOnly.set(false);
  }

  createQuickTask() {
    const title = this.quickTaskTitle().trim();
    if (!title) return;
    const owner = this.dataService.currentUser()?.name || 'غير محدد';
    const dueDate = this.quickTaskDue() || new Date().toISOString();
    this.dataService.addTask({
      id: `TSK-${Math.floor(Math.random() * 9999)}`,
      title,
      description: '',
      domain: this.quickTaskDomain(),
      owner,
      priority: this.quickTaskPriority(),
      status: 'Todo',
      dueDate,
      tags: []
    });
    this.resetQuickTask();
  }

  resetQuickTask() {
    this.quickTaskTitle.set('');
    this.quickTaskDomain.set('Development');
    this.quickTaskPriority.set('Medium');
    this.quickTaskDue.set('');
  }

  isOverdue(dateStr: string): boolean {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  isDueWithin(dateStr: string, days: number): boolean {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const now = new Date();
    const end = new Date();
    end.setDate(now.getDate() + days);
    now.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return due >= now && due <= end;
  }

  // --- Modal Logic ---
  openModal(task: Task | null) {
    this.editingTask.set(task);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingTask.set(null);
  }

  // --- Zen Mode Logic ---
  toggleZenMode(task: Task | null) {
    this.zenModeTask.set(task);
  }

  completeTaskInZen() {
    if (this.zenModeTask()) {
      this.dataService.toggleTaskStatus(this.zenModeTask()!.id, 'Done');
      this.confettiService.launch(100); // Celebrate!
      setTimeout(() => {
        // Keep showing it for a moment to celebrate
      }, 1000);
    }
  }

  // --- CRUD Operations ---
  moveTask(id: string, status: 'Todo' | 'Doing' | 'Done') {
    this.dataService.toggleTaskStatus(id, status);
    if (status === 'Done') {
      this.confettiService.launch(50); // Small celebration
    }
  }

  deleteTask(id: string) {
    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
      this.dataService.deleteTask(id);
    }
  }

  saveTask(title: string, desc: string, domain: any, priority: any, owner: string, date: string, tagsStr: string) {
    if (!title) return;

    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t !== '');

    if (this.editingTask()) {
      // Update Mode
      this.dataService.updateTask(this.editingTask()!.id, {
        title,
        description: desc,
        domain,
        priority,
        owner: owner || 'غير محدد',
        dueDate: date || this.editingTask()!.dueDate,
        tags
      });
    } else {
      // Create Mode
      this.dataService.addTask({
        id: `TSK-${Math.floor(Math.random() * 9999)}`,
        title,
        description: desc,
        domain,
        owner: owner || 'غير محدد',
        priority,
        status: 'Todo',
        dueDate: date || new Date().toISOString(),
        tags: tags
      });
    }
    this.closeModal();
  }

  // --- Comments Logic ---
  getUserById(userId: string): User | undefined {
    return this.userMap().get(userId);
  }

  addComment(text: string) {
    if (!text.trim() || !this.editingTask()) return;
    this.dataService.addComment(this.editingTask()!.id, text);
  }

  formatRelativeTime(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "just now";
  }

  // Drag and Drop Handlers
  onDragStart(event: DragEvent, taskId: string) {
    this.draggedTaskId.set(taskId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', taskId);
    }
  }

  onDragEnd() {
    this.draggedTaskId.set(null);
    this.dragOverColumn.set(null);
  }

  onDragOver(event: DragEvent, status: 'Todo' | 'Doing' | 'Done') {
    event.preventDefault(); // Necessary to allow dropping
    if (this.draggedTaskId()) {
      this.dragOverColumn.set(status);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  onDragLeave() {
    // Optional: Clear highlight logic can go here if needed
  }

  onDrop(event: DragEvent, newStatus: 'Todo' | 'Doing' | 'Done') {
    event.preventDefault();
    const taskId = this.draggedTaskId();
    if (taskId) {
      this.moveTask(taskId, newStatus);
    }
    this.onDragEnd();
  }
}