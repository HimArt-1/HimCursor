import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { DataService } from '../../core/services/state/data.service';
import { UserService } from '../../core/services/domain/user.service';
import { PermissionsService } from '../../core/services/domain/permissions.service';

type ViewTab = 'overview' | 'users' | 'tasks' | 'content' | 'finance' | 'timeline';

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white pb-10">
      
      <!-- Header -->
      <header class="bg-gradient-to-r from-indigo-900/50 via-purple-900/30 to-pink-900/20 border-b border-white/10 px-6 py-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <span [innerHTML]="getIcon('Activity')" class="w-6 h-6"></span>
              </div>
              <span class="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                مركز الرصد والتنفيذ
              </span>
            </h1>
            <p class="text-gray-400 mt-2 text-sm">System Admin Command Center - Full Visibility</p>
          </div>
          
          <div class="flex items-center gap-4">
            <!-- Live Status -->
            <div class="flex items-center gap-2 bg-green-900/30 border border-green-800/50 px-4 py-2 rounded-xl">
              <span class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
              <span class="text-green-400 text-sm font-bold">LIVE</span>
            </div>
            
            <!-- Last Updated -->
            <div class="text-xs text-gray-500">
              آخر تحديث: {{ lastUpdate | date:'HH:mm:ss' }}
            </div>
            
            <!-- Refresh Button -->
            <button (click)="refresh()" class="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <span [innerHTML]="getIcon('Sync')" class="w-5 h-5 text-gray-400"></span>
            </button>
          </div>
        </div>
        
        <!-- Navigation Tabs -->
        <div class="flex gap-2 mt-6 overflow-x-auto pb-2">
          @for(tab of tabs; track tab.id) {
            <button (click)="activeTab.set(tab.id)"
              class="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2"
              [class.bg-white]="activeTab() === tab.id"
              [class.text-gray-900]="activeTab() === tab.id"
              [class.bg-white/5]="activeTab() !== tab.id"
              [class.text-gray-400]="activeTab() !== tab.id"
              [class.hover:bg-white/10]="activeTab() !== tab.id">
              <span [innerHTML]="getIcon(tab.icon)" class="w-4 h-4"></span>
              {{ tab.label }}
              @if(tab.count) {
                <span class="text-[10px] px-1.5 py-0.5 rounded-full"
                  [class.bg-indigo-500]="activeTab() === tab.id"
                  [class.text-white]="activeTab() === tab.id"
                  [class.bg-white/20]="activeTab() !== tab.id">
                  {{ tab.count() }}
                </span>
              }
            </button>
          }
        </div>
      </header>

      <main class="p-6 space-y-6">
        
        <!-- ============ OVERVIEW TAB ============ -->
        @if(activeTab() === 'overview') {
          <!-- KPI Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            @for(kpi of kpis(); track kpi.label) {
              <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all group">
                <div class="flex items-center justify-between mb-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" [style.background]="kpi.bgColor">
                    <span [innerHTML]="getIcon(kpi.icon)" class="w-5 h-5" [style.color]="kpi.color"></span>
                  </div>
                  @if(kpi.change) {
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                      [class.bg-green-900/50]="kpi.change > 0"
                      [class.text-green-400]="kpi.change > 0"
                      [class.bg-red-900/50]="kpi.change < 0"
                      [class.text-red-400]="kpi.change < 0">
                      {{ kpi.change > 0 ? '+' : '' }}{{ kpi.change }}%
                    </span>
                  }
                </div>
                <div class="text-2xl font-bold text-white mb-1">{{ kpi.value }}</div>
                <div class="text-xs text-gray-500">{{ kpi.label }}</div>
              </div>
            }
          </div>

          <!-- Activity Feed + Online Users -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Activity Feed -->
            <div class="lg:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              <div class="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 class="font-bold text-white flex items-center gap-2">
                  <span [innerHTML]="getIcon('Activity')" class="w-5 h-5 text-indigo-400"></span>
                  آخر الأنشطة
                </h3>
                <span class="text-xs text-gray-500">Real-time</span>
              </div>
              <div class="max-h-96 overflow-y-auto">
                @for(activity of recentActivities(); track activity.id) {
                  <div class="p-4 border-b border-white/5 hover:bg-white/5 transition-colors flex items-start gap-4">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      [style.background]="getActivityColor(activity.type)">
                      <span [innerHTML]="getIcon(getActivityIcon(activity.type))" class="w-5 h-5 text-white"></span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-white">{{ activity.user }}</span>
                        <span class="text-xs text-gray-500">{{ activity.action }}</span>
                      </div>
                      <p class="text-sm text-gray-400 truncate">{{ activity.details }}</p>
                      <span class="text-xs text-gray-600">{{ activity.timestamp | date:'HH:mm - yyyy/MM/dd' }}</span>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                      [ngClass]="getActivityBadgeClass(activity.type)">
                      {{ activity.type }}
                    </span>
                  </div>
                }
                @if(recentActivities().length === 0) {
                  <div class="p-12 text-center text-gray-600">
                    <span [innerHTML]="getIcon('Inbox')" class="w-12 h-12 mx-auto mb-4 opacity-50"></span>
                    <p>لا توجد أنشطة حديثة</p>
                  </div>
                }
              </div>
            </div>

            <!-- Online Users -->
            <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              <div class="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 class="font-bold text-white flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                  المتصلون الآن
                </h3>
                <span class="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded-full">
                  {{ onlineUsers().length }} متصل
                </span>
              </div>
              <div class="max-h-96 overflow-y-auto p-4 space-y-3">
                @for(user of onlineUsers(); track user.id) {
                  <div class="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                    <div class="relative">
                      <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        [style.background]="user.avatarColor || '#4B5842'">
                        {{ user.name?.charAt(0) || '?' }}
                      </div>
                      <span class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-gray-900"></span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-white truncate">{{ user.name }}</div>
                      <div class="text-xs text-gray-500">{{ user.role }}</div>
                    </div>
                  </div>
                }
                @if(onlineUsers().length === 0) {
                  <div class="text-center text-gray-600 py-8">
                    لا يوجد متصلون حالياً
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Task Distribution Chart -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Tasks by Status -->
            <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 class="font-bold text-white mb-6 flex items-center gap-2">
                <span [innerHTML]="getIcon('LayoutGrid')" class="w-5 h-5 text-blue-400"></span>
                توزيع المهام حسب الحالة
              </h3>
              <div class="space-y-4">
                @for(status of tasksByStatus(); track status.name) {
                  <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-400">{{ status.name }}</span>
                      <span class="text-white font-bold">{{ status.count }}</span>
                    </div>
                    <div class="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-500"
                        [style.width.%]="status.percentage"
                        [style.background]="status.color">
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Tasks by User -->
            <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 class="font-bold text-white mb-6 flex items-center gap-2">
                <span [innerHTML]="getIcon('Users')" class="w-5 h-5 text-purple-400"></span>
                المهام حسب المستخدم
              </h3>
              <div class="space-y-3">
                @for(user of tasksByUser(); track user.name) {
                  <div class="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      [style.background]="user.color">
                      {{ user.name?.charAt(0) || '?' }}
                    </div>
                    <div class="flex-1">
                      <div class="flex justify-between mb-1">
                        <span class="text-white font-medium">{{ user.name }}</span>
                        <span class="text-gray-400 text-sm">{{ user.total }} مهمة</span>
                      </div>
                      <div class="flex gap-1 h-2">
                        <div class="rounded-full bg-green-500" [style.flex]="user.done"></div>
                        <div class="rounded-full bg-blue-500" [style.flex]="user.inProgress"></div>
                        <div class="rounded-full bg-gray-600" [style.flex]="user.pending"></div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ============ USERS TAB ============ -->
        @if(activeTab() === 'users') {
          <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div class="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 class="font-bold text-white">جميع المستخدمين وأنشطتهم</h3>
              <input type="text" placeholder="بحث..."
                class="bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500">
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-right">
                <thead class="bg-white/5 text-xs text-gray-400">
                  <tr>
                    <th class="p-4">المستخدم</th>
                    <th class="p-4">الدور</th>
                    <th class="p-4">الحالة</th>
                    <th class="p-4">المهام النشطة</th>
                    <th class="p-4">المهام المكتملة</th>
                    <th class="p-4">آخر نشاط</th>
                  </tr>
                </thead>
                <tbody>
                  @for(user of allUsers(); track user.id) {
                    <tr class="border-t border-white/5 hover:bg-white/5 transition-colors">
                      <td class="p-4">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                            [style.background]="user.avatarColor || '#4B5842'">
                            {{ user.name?.charAt(0) || '?' }}
                          </div>
                          <div>
                            <div class="font-medium text-white">{{ user.name }}</div>
                            <div class="text-xs text-gray-500">{{ user.email }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="p-4">
                        <span class="text-xs font-bold px-2 py-1 rounded-full"
                          [ngClass]="getRoleBadgeClass(user.role)">
                          {{ permissions.getRoleLabel(user.role) }}
                        </span>
                      </td>
                      <td class="p-4">
                        @if(isUserOnline(user.id)) {
                          <span class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span class="text-green-400 text-sm">متصل</span>
                          </span>
                        } @else {
                          <span class="text-gray-500 text-sm">غير متصل</span>
                        }
                      </td>
                      <td class="p-4 text-center">
                        <span class="text-blue-400 font-bold">{{ getUserActiveTasks(user.id) }}</span>
                      </td>
                      <td class="p-4 text-center">
                        <span class="text-green-400 font-bold">{{ getUserCompletedTasks(user.id) }}</span>
                      </td>
                      <td class="p-4 text-xs text-gray-500">
                        {{ user.lastSeen | date:'yyyy/MM/dd HH:mm' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ============ TASKS TAB ============ -->
        @if(activeTab() === 'tasks') {
          <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div class="p-4 border-b border-white/10 flex flex-wrap gap-4 items-center justify-between">
              <h3 class="font-bold text-white">جميع المهام</h3>
              <div class="flex gap-2">
                @for(filter of taskFilters; track filter.value) {
                  <button (click)="taskFilter.set(filter.value)"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    [class.bg-white]="taskFilter() === filter.value"
                    [class.text-gray-900]="taskFilter() === filter.value"
                    [class.bg-white/10]="taskFilter() !== filter.value"
                    [class.text-gray-400]="taskFilter() !== filter.value">
                    {{ filter.label }}
                  </button>
                }
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-right">
                <thead class="bg-white/5 text-xs text-gray-400">
                  <tr>
                    <th class="p-4">المهمة</th>
                    <th class="p-4">المسؤول</th>
                    <th class="p-4">الحالة</th>
                    <th class="p-4">الأولوية</th>
                    <th class="p-4">تاريخ الإنشاء</th>
                    <th class="p-4">تاريخ الاستحقاق</th>
                  </tr>
                </thead>
                <tbody>
                  @for(task of filteredTasks(); track task.id) {
                    <tr class="border-t border-white/5 hover:bg-white/5 transition-colors">
                      <td class="p-4">
                        <div class="font-medium text-white">{{ task.title }}</div>
                        <div class="text-xs text-gray-500 truncate max-w-xs">{{ task.description }}</div>
                      </td>
                      <td class="p-4 text-gray-400">{{ task.owner || 'غير محدد' }}</td>
                      <td class="p-4">
                        <span class="text-xs font-bold px-2 py-1 rounded-full"
                          [ngClass]="getStatusBadgeClass(task.status)">
                          {{ getStatusLabel(task.status) }}
                        </span>
                      </td>
                      <td class="p-4">
                        <span class="text-xs font-bold px-2 py-1 rounded-full"
                          [ngClass]="getPriorityBadgeClass(task.priority)">
                          {{ task.priority }}
                        </span>
                      </td>
                      <td class="p-4 text-xs text-gray-500">-</td>
                      <td class="p-4 text-xs" [class.text-red-400]="isOverdue(task)" [class.text-gray-500]="!isOverdue(task)">
                        {{ task.dueDate | date:'yyyy/MM/dd' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ============ CONTENT TAB ============ -->
        @if(activeTab() === 'content') {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Documents -->
            <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              <div class="p-4 border-b border-white/10">
                <h3 class="font-bold text-white flex items-center gap-2">
                  <span [innerHTML]="getIcon('FileText')" class="w-5 h-5 text-blue-400"></span>
                  المستندات الحديثة
                </h3>
              </div>
              <div class="max-h-80 overflow-y-auto">
                @for(doc of recentDocuments(); track doc.id) {
                  <div class="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-medium text-white">{{ doc.title }}</span>
                      <span class="text-xs px-2 py-0.5 rounded-full"
                        [ngClass]="doc.status === 'published' ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-400'">
                        {{ doc.status }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500">{{ doc.category }} • {{ doc.created_at | date:'yyyy/MM/dd' }}</div>
                  </div>
                }
                @if(recentDocuments().length === 0) {
                  <div class="p-8 text-center text-gray-600">لا توجد مستندات</div>
                }
              </div>
            </div>

            <!-- Assets -->
            <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              <div class="p-4 border-b border-white/10">
                <h3 class="font-bold text-white flex items-center gap-2">
                  <span [innerHTML]="getIcon('Image')" class="w-5 h-5 text-purple-400"></span>
                  الأصول الحديثة
                </h3>
              </div>
              <div class="max-h-80 overflow-y-auto">
                @for(asset of recentAssets(); track asset.id) {
                  <div class="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-medium text-white">{{ asset.name }}</span>
                      <span class="text-xs text-gray-500">{{ asset.type }}</span>
                    </div>
                    <div class="text-xs text-gray-500">{{ asset.project }} • {{ asset.status }}</div>
                  </div>
                }
                @if(recentAssets().length === 0) {
                  <div class="p-8 text-center text-gray-600">لا توجد أصول</div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ============ FINANCE TAB ============ -->
        @if(activeTab() === 'finance') {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-gradient-to-br from-green-900/30 to-green-950/50 border border-green-800/30 rounded-2xl p-6">
              <div class="text-green-400 text-sm mb-2">إجمالي الدخل</div>
              <div class="text-3xl font-bold text-white">{{ totalIncome() | number }}</div>
              <div class="text-xs text-green-500 mt-1">ر.س</div>
            </div>
            <div class="bg-gradient-to-br from-red-900/30 to-red-950/50 border border-red-800/30 rounded-2xl p-6">
              <div class="text-red-400 text-sm mb-2">إجمالي المصروفات</div>
              <div class="text-3xl font-bold text-white">{{ totalExpenses() | number }}</div>
              <div class="text-xs text-red-500 mt-1">ر.س</div>
            </div>
            <div class="bg-gradient-to-br from-blue-900/30 to-blue-950/50 border border-blue-800/30 rounded-2xl p-6">
              <div class="text-blue-400 text-sm mb-2">صافي الرصيد</div>
              <div class="text-3xl font-bold text-white">{{ netBalance() | number }}</div>
              <div class="text-xs text-blue-500 mt-1">ر.س</div>
            </div>
          </div>

          <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div class="p-4 border-b border-white/10">
              <h3 class="font-bold text-white">آخر المعاملات</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-right">
                <thead class="bg-white/5 text-xs text-gray-400">
                  <tr>
                    <th class="p-4">النوع</th>
                    <th class="p-4">الفئة</th>
                    <th class="p-4">الوصف</th>
                    <th class="p-4">المبلغ</th>
                    <th class="p-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  @for(tx of recentTransactions(); track tx.id) {
                    <tr class="border-t border-white/5 hover:bg-white/5 transition-colors">
                      <td class="p-4">
                        <span class="text-xs font-bold px-2 py-1 rounded-full"
                          [class.bg-green-900/50]="tx.type === 'Income'"
                          [class.text-green-400]="tx.type === 'Income'"
                          [class.bg-red-900/50]="tx.type === 'Expense'"
                          [class.text-red-400]="tx.type === 'Expense'">
                          {{ tx.type === 'Income' ? 'دخل' : 'مصروف' }}
                        </span>
                      </td>
                      <td class="p-4 text-gray-400">{{ tx.category }}</td>
                      <td class="p-4 text-white">{{ tx.description }}</td>
                      <td class="p-4 font-bold"
                        [class.text-green-400]="tx.type === 'Income'"
                        [class.text-red-400]="tx.type === 'Expense'">
                        {{ tx.type === 'Income' ? '+' : '-' }}{{ tx.amount | number }}
                      </td>
                      <td class="p-4 text-xs text-gray-500">{{ tx.date | date:'yyyy/MM/dd' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ============ TIMELINE TAB ============ -->
        @if(activeTab() === 'timeline') {
          <div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 class="font-bold text-white mb-6 flex items-center gap-2">
              <span [innerHTML]="getIcon('Clock')" class="w-5 h-5 text-indigo-400"></span>
              الجدول الزمني للأنشطة
            </h3>
            <div class="space-y-0 relative">
              <!-- Timeline Line -->
              <div class="absolute right-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500"></div>
              
              @for(event of timelineEvents(); track event.id; let i = $index) {
                <div class="relative pr-12 pb-8 last:pb-0">
                  <!-- Dot -->
                  <div class="absolute right-3 w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center"
                    [style.background]="getTimelineColor(event.type)">
                    <span class="w-2 h-2 rounded-full bg-white"></span>
                  </div>
                  
                  <!-- Content -->
                  <div class="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all">
                    <div class="flex items-center gap-3 mb-2">
                      <span class="font-bold text-white">{{ event.user }}</span>
                      <span class="text-xs px-2 py-0.5 rounded-full"
                        [ngClass]="getActivityBadgeClass(event.type)">
                        {{ event.type }}
                      </span>
                    </div>
                    <p class="text-gray-400 text-sm mb-2">{{ event.details }}</p>
                    <span class="text-xs text-gray-600">{{ event.timestamp | date:'yyyy/MM/dd HH:mm' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

      </main>
    </div>
  `
})
export class MonitoringComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private dataService = inject(DataService);
  private userService = inject(UserService);
  permissions = inject(PermissionsService);

  activeTab = signal<ViewTab>('overview');
  lastUpdate = new Date();
  taskFilter = signal<string>('all');

  tabs = [
    { id: 'overview' as ViewTab, label: 'نظرة عامة', icon: 'Activity' as keyof typeof Icons, count: null },
    { id: 'users' as ViewTab, label: 'المستخدمين', icon: 'Users' as keyof typeof Icons, count: () => this.allUsers().length },
    { id: 'tasks' as ViewTab, label: 'المهام', icon: 'Layers' as keyof typeof Icons, count: () => this.allTasks().length },
    { id: 'content' as ViewTab, label: 'المحتوى', icon: 'FileText' as keyof typeof Icons, count: null },
    { id: 'finance' as ViewTab, label: 'المالية', icon: 'DollarSign' as keyof typeof Icons, count: null },
    { id: 'timeline' as ViewTab, label: 'الجدول الزمني', icon: 'Clock' as keyof typeof Icons, count: null }
  ];

  taskFilters = [
    { value: 'all', label: 'الكل' },
    { value: 'todo', label: 'قيد الانتظار' },
    { value: 'in_progress', label: 'قيد التنفيذ' },
    { value: 'done', label: 'مكتملة' },
    { value: 'overdue', label: 'متأخرة' }
  ];

  // Data sources
  allUsers = this.userService.allUsers;
  allTasks = this.dataService.tasks;
  auditLogs = this.dataService.auditLogs;

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.lastUpdate = new Date();
    this.userService.loadUsers();
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name] || '');
  }

  // Computed Data
  kpis = computed(() => [
    { label: 'إجمالي المستخدمين', value: this.allUsers().length, icon: 'Users' as keyof typeof Icons, color: '#818cf8', bgColor: '#312e81', change: 12 },
    { label: 'المهام النشطة', value: this.allTasks().filter(t => t.status !== 'Done').length, icon: 'Layers' as keyof typeof Icons, color: '#60a5fa', bgColor: '#1e3a8a', change: 5 },
    { label: 'المهام المكتملة', value: this.allTasks().filter(t => t.status === 'Done').length, icon: 'Check' as keyof typeof Icons, color: '#34d399', bgColor: '#064e3b', change: 18 },
    { label: 'المتصلون الآن', value: this.onlineUsers().length, icon: 'Activity' as keyof typeof Icons, color: '#a78bfa', bgColor: '#4c1d95', change: null },
    { label: 'المستندات', value: this.recentDocuments().length, icon: 'FileText' as keyof typeof Icons, color: '#f472b6', bgColor: '#831843', change: null },
    { label: 'المعاملات', value: this.recentTransactions().length, icon: 'DollarSign' as keyof typeof Icons, color: '#fbbf24', bgColor: '#78350f', change: null }
  ]);

  onlineUsers = computed(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.allUsers().filter(u => {
      if (!u.lastSeen) return false;
      return new Date(u.lastSeen) > fiveMinutesAgo;
    });
  });

  isUserOnline(userId: string): boolean {
    const user = this.allUsers().find(u => u.id === userId);
    if (!user?.lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(user.lastSeen) > fiveMinutesAgo;
  }

  recentActivities = computed(() => {
    return this.auditLogs().slice(0, 20).map(log => ({
      id: log.id,
      user: log.user,
      action: log.action,
      type: log.action,
      details: log.details,
      timestamp: log.timestamp
    }));
  });

  tasksByStatus = computed(() => {
    const tasks = this.allTasks();
    const total = tasks.length || 1;
    const statuses = [
      { name: 'قيد الانتظار', key: 'Todo', color: '#6b7280' },
      { name: 'قيد التنفيذ', key: 'Doing', color: '#3b82f6' },
      { name: 'مكتملة', key: 'Done', color: '#22c55e' }
    ];
    return statuses.map(s => ({
      name: s.name,
      count: tasks.filter(t => t.status === s.key).length,
      percentage: (tasks.filter(t => t.status === s.key).length / total) * 100,
      color: s.color
    }));
  });

  tasksByUser = computed(() => {
    const tasks = this.allTasks();
    const users = this.allUsers();
    return users.slice(0, 5).map(u => {
      const userTasks = tasks.filter(t => t.owner === u.name);
      return {
        name: u.name,
        color: u.avatarColor || '#4B5842',
        total: userTasks.length,
        done: userTasks.filter(t => t.status === 'Done').length,
        inProgress: userTasks.filter(t => t.status === 'Doing').length,
        pending: userTasks.filter(t => t.status === 'Todo').length
      };
    });
  });

  filteredTasks = computed(() => {
    const filter = this.taskFilter();
    let tasks = this.allTasks();
    
    if (filter === 'overdue') {
      return tasks.filter(t => this.isOverdue(t));
    }
    if (filter === 'todo') {
      return tasks.filter(t => t.status === 'Todo');
    }
    if (filter === 'in_progress') {
      return tasks.filter(t => t.status === 'Doing');
    }
    if (filter === 'done') {
      return tasks.filter(t => t.status === 'Done');
    }
    return tasks;
  });

  recentDocuments = computed(() => {
    return this.dataService.documents?.() || [];
  });

  recentAssets = computed(() => {
    return this.dataService.assets?.() || [];
  });

  recentTransactions = computed(() => {
    return this.dataService.transactions?.() || [];
  });

  totalIncome = computed(() => {
    return this.recentTransactions()
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  });

  totalExpenses = computed(() => {
    return this.recentTransactions()
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  });

  netBalance = computed(() => {
    return this.totalIncome() - this.totalExpenses();
  });

  timelineEvents = computed(() => {
    return this.auditLogs().slice(0, 30).map(log => ({
      id: log.id,
      user: log.user,
      type: log.action,
      details: `${log.entityType}: ${log.details}`,
      timestamp: log.timestamp
    }));
  });

  getUserActiveTasks(userId: string): number {
    const user = this.allUsers().find(u => u.id === userId);
    if (!user) return 0;
    return this.allTasks().filter(t => 
      t.owner === user.name && t.status !== 'Done'
    ).length;
  }

  getUserCompletedTasks(userId: string): number {
    const user = this.allUsers().find(u => u.id === userId);
    if (!user) return 0;
    return this.allTasks().filter(t => 
      t.owner === user.name && t.status === 'Done'
    ).length;
  }

  isOverdue(task: any): boolean {
    if (!task.dueDate || task.status === 'Done') return false;
    return new Date(task.dueDate) < new Date();
  }

  // Styling helpers
  getActivityColor(type: string): string {
    switch(type) {
      case 'Create': return '#3b82f6';
      case 'Update': return '#f59e0b';
      case 'Delete': return '#ef4444';
      case 'Login': return '#22c55e';
      case 'Logout': return '#6b7280';
      default: return '#8b5cf6';
    }
  }

  getActivityIcon(type: string): keyof typeof Icons {
    switch(type) {
      case 'Create': return 'Plus';
      case 'Update': return 'Edit';
      case 'Delete': return 'Trash';
      case 'Login': return 'User';
      case 'Logout': return 'User';
      default: return 'Activity';
    }
  }

  getActivityBadgeClass(type: string): string {
    switch(type) {
      case 'Create': return 'bg-blue-900/50 text-blue-400';
      case 'Update': return 'bg-yellow-900/50 text-yellow-400';
      case 'Delete': return 'bg-red-900/50 text-red-400';
      case 'Login': return 'bg-green-900/50 text-green-400';
      case 'Logout': return 'bg-gray-800 text-gray-400';
      default: return 'bg-purple-900/50 text-purple-400';
    }
  }

  getTimelineColor(type: string): string {
    switch(type) {
      case 'Create': return '#3b82f6';
      case 'Update': return '#f59e0b';
      case 'Delete': return '#ef4444';
      case 'Login': return '#22c55e';
      default: return '#8b5cf6';
    }
  }

  getRoleBadgeClass(role: string): string {
    const normalized = role?.toLowerCase().replace(/[^a-z_]/g, '_') || '';
    if (normalized.includes('system') && normalized.includes('admin')) {
      return 'bg-red-900/50 text-red-400';
    }
    if (normalized === 'admin') {
      return 'bg-purple-900/50 text-purple-400';
    }
    if (normalized === 'member') {
      return 'bg-blue-900/50 text-blue-400';
    }
    return 'bg-gray-800 text-gray-400';
  }

  getStatusBadgeClass(status: string): string {
    switch(status) {
      case 'Done': return 'bg-green-900/50 text-green-400';
      case 'Doing': return 'bg-blue-900/50 text-blue-400';
      case 'Todo': return 'bg-gray-800 text-gray-400';
      default: return 'bg-gray-800 text-gray-400';
    }
  }

  getStatusLabel(status: string): string {
    switch(status) {
      case 'Done': return 'مكتمل';
      case 'Doing': return 'قيد التنفيذ';
      case 'Todo': return 'قيد الانتظار';
      default: return status;
    }
  }

  getPriorityBadgeClass(priority: string): string {
    switch(priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-900/50 text-red-400';
      case 'high': return 'bg-orange-900/50 text-orange-400';
      case 'medium': return 'bg-yellow-900/50 text-yellow-400';
      case 'low': return 'bg-gray-800 text-gray-400';
      default: return 'bg-gray-800 text-gray-400';
    }
  }
}
