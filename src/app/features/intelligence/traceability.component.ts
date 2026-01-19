
import { Component, inject, computed, signal, ViewChild, ElementRef, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, TraceStatus, EntityType, Objective, Requirement, Design, TestCase, Priority } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import * as d3 from 'd3';

@Component({
  selector: 'app-traceability',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col h-full space-y-6">
      <header class="flex justify-between items-start">
        <div>
           <h2 class="text-3xl font-bold text-wushai-dark">مصفوفة التتبع (Traceability Matrix)</h2>
           <p class="text-wushai-olive mt-2">نظام صارم لضمان تغطية جميع المتطلبات واختبارها.</p>
        </div>

        <!-- Preflight Status Badge -->
        <div class="flex flex-col items-end">
           <div class="px-6 py-3 rounded-xl border flex items-center gap-3 shadow-sm transition-all"
                [ngClass]="{
                  'bg-green-50 border-green-200 text-green-800': report().status === 'Verified',
                  'bg-red-50 border-red-200 text-red-800': report().status === 'Blocked',
                  'bg-yellow-50 border-yellow-200 text-yellow-800': report().status === 'WithGaps'
                }">
                <div class="flex flex-col">
                  <span class="text-xs font-bold opacity-70 uppercase tracking-wider">Preflight Status</span>
                  <span class="text-lg font-bold flex items-center gap-2">
                    @if(report().status === 'Verified') {
                      <span [innerHTML]="getIcon('Check')"></span> Verified Report
                    } @else if(report().status === 'Blocked') {
                      <span [innerHTML]="getIcon('X')"></span> Blocked
                    } @else {
                      <span [innerHTML]="getIcon('Alert')"></span> With Gaps
                    }
                  </span>
                </div>
           </div>
        </div>
      </header>

      <!-- Action Buttons Row -->
      <div class="flex flex-wrap gap-4">
        <button (click)="openModal('Objective')"
          class="bg-wushai-dark hover:bg-wushai-deep text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span> هدف جديد (Objective)
        </button>
        <button (click)="openModal('Requirement')"
          class="bg-wushai-olive hover:bg-wushai-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span> متطلب جديد (Requirement)
        </button>
        <button (click)="openModal('Design')"
          class="bg-wushai-brown hover:bg-wushai-deep text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span> تصميم جديد (Design)
        </button>
        <button (click)="openModal('TestCase')"
          class="bg-wushai-lavender hover:bg-purple-300 text-wushai-deep px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span> اختبار جديد (Test Case)
        </button>
      </div>

      <!-- View Switcher & Search Toolbar -->
      <div class="flex flex-col md:flex-row items-center justify-between border-b border-wushai-sand gap-4 py-2">
        <div class="flex items-center gap-6 w-full md:w-auto">
            <button (click)="switchView('Matrix')"
            class="pb-3 px-2 font-bold transition-all border-b-2 text-sm flex items-center gap-2"
            [class.border-wushai-dark]="viewMode() === 'Matrix'"
            [class.text-wushai-dark]="viewMode() === 'Matrix'"
            [class.border-transparent]="viewMode() !== 'Matrix'"
            [class.text-gray-400]="viewMode() !== 'Matrix'">
            <span [innerHTML]="getIcon('List')" class="w-4 h-4"></span>
            Matrix View
            </button>
            
            <button (click)="switchView('Graph')"
            class="pb-3 px-2 font-bold transition-all border-b-2 text-sm flex items-center gap-2"
            [class.border-wushai-dark]="viewMode() === 'Graph'"
            [class.text-wushai-dark]="viewMode() === 'Graph'"
            [class.border-transparent]="viewMode() !== 'Graph'"
            [class.text-gray-400]="viewMode() !== 'Graph'">
            <span [innerHTML]="getIcon('Activity')" class="w-4 h-4"></span>
            Neural Map
            </button>

            <button (click)="switchView('Audit')"
            class="pb-3 px-2 font-bold transition-all border-b-2 text-sm flex items-center gap-2"
            [class.border-wushai-dark]="viewMode() === 'Audit'"
            [class.text-wushai-dark]="viewMode() === 'Audit'"
            [class.border-transparent]="viewMode() !== 'Audit'"
            [class.text-gray-400]="viewMode() !== 'Audit'">
            <span [innerHTML]="getIcon('Clock')" class="w-4 h-4"></span>
            Audit Log
            <span class="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">{{ logs().length }}</span>
            </button>
        </div>

        <div class="flex items-center gap-4 w-full md:w-auto">
            <!-- Search Bar -->
            <div class="relative flex-1 md:w-64">
                <input type="text" [placeholder]="viewMode() === 'Matrix' ? 'بحث في المتطلبات...' : 'بحث...'"
                  (input)="updateFilter($event)"
                  class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-wushai-olive text-sm bg-white shadow-sm">
                <span class="absolute left-3 top-2.5 text-gray-400 w-4 h-4" [innerHTML]="getIcon('Search')"></span>
            </div>

            <button class="text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                [disabled]="report().status === 'Blocked'"
                (click)="exportToCSV()"
                [ngClass]="report().status === 'Blocked' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-wushai-dark text-white hover:bg-wushai-black'">
                تصدير (CSV)
            </button>
        </div>
      </div>

      <!-- Alert Box for Errors (Only in Matrix View) -->
      @if (viewMode() === 'Matrix' && report().status !== 'Verified') {
        <div class="bg-white border rounded-xl p-4 shadow-sm animate-pulse-once"
             [ngClass]="report().status === 'Blocked' ? 'border-red-200' : 'border-yellow-200'">
          <h4 class="font-bold mb-2 flex items-center gap-2"
              [ngClass]="report().status === 'Blocked' ? 'text-red-700' : 'text-yellow-700'">
            <span [innerHTML]="getIcon('Alert')"></span>
            يجب معالجة الملاحظات التالية:
          </h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            @for (err of report().errors; track err) {
              <li class="text-red-600 font-medium">{{ err }}</li>
            }
            @for (warn of report().warnings; track warn) {
              <li class="text-yellow-600">{{ warn }}</li>
            }
          </ul>
        </div>
      }

      @if (viewMode() === 'Matrix') {
        <!-- Hierarchical Matrix View -->
        <div class="flex-1 overflow-auto space-y-4">
          <!-- Objectives Loop -->
          @for(obj of objectives(); track obj.id) {
            @let reqsForObj = getFilteredRequirementsForObjective(obj.id);
            @if(reqsForObj.length > 0) {
              <details open class="bg-white dark:bg-wushai-black rounded-xl border border-wushai-sand dark:border-wushai-olive shadow-sm transition-all duration-300">
                <summary class="p-4 cursor-pointer flex justify-between items-center group">
                   <div class="flex items-center gap-4">
                      <div class="flex-shrink-0 text-blue-500">
                        <span [innerHTML]="getIcon('Target')"></span>
                      </div>
                      <div>
                         <h4 class="font-bold text-wushai-dark dark:text-wushai-sand">
                           <span class="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded-md text-blue-700 dark:text-blue-400">{{ obj.id }}</span>
                           {{ obj.title }}
                         </h4>
                         <p class="text-xs text-gray-500 mt-1">{{ obj.description }}</p>
                      </div>
                   </div>
                   <div class="flex items-center gap-4">
                      <span class="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{{ reqsForObj.length }} Requirements</span>
                   </div>
                </summary>
                <div class="border-t border-wushai-sand dark:border-wushai-olive overflow-x-auto">
                   <table class="w-full text-right text-sm">
                      <thead class="bg-wushai-light/50 dark:bg-wushai-deep/20 text-xs">
                         <tr>
                            <th class="p-3 font-bold text-wushai-deep">Requirement Details</th>
                            <th class="p-3 font-bold text-wushai-deep">Acceptance Criteria</th>
                            <th class="p-3 font-bold text-wushai-deep">Test Case</th>
                            <th class="p-3 font-bold text-wushai-deep w-28">Status</th>
                            <th class="p-3 font-bold text-wushai-deep w-32">Actions</th>
                         </tr>
                      </thead>
                      <tbody>
                         @for(req of reqsForObj; track req.id) {
                           <tr class="border-t border-wushai-light dark:border-wushai-olive/30 last:border-0 group">
                             <td class="p-3 align-top">
                               <div class="font-bold text-wushai-dark dark:text-wushai-sand">{{ req.title }}</div>
                               <div class="text-xs text-gray-500 mt-1 font-mono text-wushai-olive">{{ req.id }}</div>
                             </td>
                             <td class="p-3 align-top text-xs text-gray-600 dark:text-gray-400">
                                @if (req.acceptanceCriteria) { {{ req.acceptanceCriteria }} } 
                                @else { <span class="text-red-500 font-bold">MISSING</span> }
                             </td>
                             <td class="p-3 align-top">
                               @if (req.testCaseIds.length > 0) {
                                 @for (tcId of req.testCaseIds; track tcId) {
                                   <div class="flex items-center gap-1 text-xs mb-1">
                                      <span class="font-mono text-gray-500">{{ tcId }}</span>
                                      <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                   </div>
                                 }
                               } @else {
                                 <span class="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded border border-yellow-200 font-bold">
                                    GAP
                                 </span>
                               }
                             </td>
                             <td class="p-3 align-top">
                               @if (getReqStatus(req) === 'Valid') {
                                 <span class="text-green-600 font-bold text-xs flex items-center gap-1">
                                   <span [innerHTML]="getIcon('Check')" class="w-4 h-4"></span> Valid
                                 </span>
                               } @else if (getReqStatus(req) === 'Gap') {
                                 <span class="text-yellow-600 font-bold text-xs flex items-center gap-1">
                                   <span [innerHTML]="getIcon('Alert')" class="w-4 h-4"></span> Gap
                                 </span>
                               } @else {
                                 <span class="text-red-600 font-bold text-xs flex items-center gap-1">
                                   <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span> Invalid
                                 </span>
                               }
                             </td>
                             <td class="p-3 align-top">
                               <div class="flex items-center justify-center gap-2">
                                  <button (click)="openImpactAnalysis(req)" class="text-wushai-olive hover:text-wushai-dark bg-wushai-sand/30 hover:bg-wushai-sand p-1.5 rounded transition-colors text-xs font-bold" title="تحليل التأثير">
                                    Impact
                                  </button>
                                  <button (click)="openModal('Requirement', req)" class="text-gray-400 hover:text-blue-600 transition-colors p-1" title="تعديل">
                                    <span [innerHTML]="getIcon('Edit')" class="w-4 h-4"></span>
                                  </button>
                                  <button (click)="deleteRequirement(req.id)" class="text-gray-400 hover:text-red-600 transition-colors p-1" title="حذف">
                                    <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
                                  </button>
                               </div>
                             </td>
                           </tr>
                         }
                      </tbody>
                   </table>
                </div>
              </details>
            }
          }
          <!-- Orphaned Requirements Section -->
          @let orphanedReqs = filteredOrphanedRequirements();
          @if (orphanedReqs.length > 0) {
            <details open class="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30">
               <summary class="p-4 cursor-pointer flex justify-between items-center font-bold text-red-700 dark:text-red-300">
                  <div class="flex items-center gap-3">
                     <span [innerHTML]="getIcon('Alert')"></span>
                     <span>متطلبات يتيمة (غير مرتبطة بهدف)</span>
                  </div>
                  <span class="px-2 py-1 bg-red-200/50 text-red-800 rounded-full text-xs">{{ orphanedReqs.length }} items</span>
               </summary>
               <div class="border-t border-red-200 dark:border-red-900/30 overflow-x-auto">
                  <table class="w-full text-right text-sm">
                     <thead class="bg-red-100/30 dark:bg-red-900/10 text-xs">
                        <tr>
                          <th class="p-3 font-bold text-red-800">Requirement Details</th>
                          <th class="p-3 font-bold text-red-800">Acceptance Criteria</th>
                          <th class="p-3 font-bold text-red-800">Test Case</th>
                          <th class="p-3 font-bold text-red-800 w-28">Status</th>
                          <th class="p-3 font-bold text-red-800 w-32">Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                       @for(req of orphanedReqs; track req.id) {
                         <tr class="border-t border-red-200/30 dark:border-red-900/20 last:border-0 group">
                           <td class="p-3 align-top">
                             <div class="font-bold text-wushai-dark dark:text-wushai-sand">{{ req.title }}</div>
                             <div class="text-xs text-gray-500 mt-1 font-mono text-wushai-olive">{{ req.id }}</div>
                           </td>
                           <td class="p-3 align-top text-xs text-gray-600 dark:text-gray-400">
                              @if (req.acceptanceCriteria) { {{ req.acceptanceCriteria }} } 
                              @else { <span class="text-red-500 font-bold">MISSING</span> }
                           </td>
                           <td class="p-3 align-top">
                             @if (req.testCaseIds.length > 0) {
                               @for (tcId of req.testCaseIds; track tcId) {
                                 <div class="flex items-center gap-1 text-xs mb-1">
                                    <span class="font-mono text-gray-500">{{ tcId }}</span>
                                    <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                 </div>
                               }
                             } @else {
                               <span class="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded border border-yellow-200 font-bold">
                                  GAP
                               </span>
                             }
                           </td>
                           <td class="p-3 align-top">
                              <span class="text-red-600 font-bold text-xs flex items-center gap-1">
                                 <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span> Invalid
                              </span>
                           </td>
                           <td class="p-3 align-top">
                             <div class="flex items-center justify-center gap-2">
                                <button (click)="openModal('Requirement', req)" class="text-gray-400 hover:text-blue-600 transition-colors p-1" title="تعديل">
                                  <span [innerHTML]="getIcon('Edit')" class="w-4 h-4"></span>
                                </button>
                                <button (click)="deleteRequirement(req.id)" class="text-gray-400 hover:text-red-600 transition-colors p-1" title="حذف">
                                  <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
                                </button>
                             </div>
                           </td>
                         </tr>
                       }
                     </tbody>
                  </table>
               </div>
            </details>
          }
        </div>
      } @else if (viewMode() === 'Graph') {
         <!-- Neural Map View -->
         <div class="flex-1 border border-wushai-sand rounded-xl shadow-sm bg-gray-50 dark:bg-wushai-black overflow-hidden relative bg-dot-pattern">
            <div #graphContainer class="w-full h-full"></div>
            
            <div class="absolute top-4 left-4 bg-white/90 dark:bg-black/50 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 backdrop-blur-sm text-xs space-y-2 z-20">
               <div class="font-bold mb-1 text-wushai-dark dark:text-wushai-sand">Legend</div>
               <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300"><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#3b82f6"></circle></svg> Objective</div>
               <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300"><svg width="12" height="12"><rect x="1" y="1" width="10" height="10" fill="#a855f7"></rect></svg> Requirement</div>
               <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300"><svg width="12" height="12"><path d="M6 0 L12 10 L0 10 Z" fill="#5A3E2B"></path></svg> Design</div>
               <div class="flex items-center gap-2 text-gray-700 dark:text-gray-300"><svg width="12" height="12"><path d="M6 0 L12 6 L6 12 L0 6 Z" fill="#22c55e"></path></svg> Test Case</div>
            </div>
            
            @if(filteredRequirements().length === 0) {
                <div class="absolute inset-0 flex items-center justify-center text-gray-400">No data to map</div>
            }
         </div>
      } @else {
        <!-- Audit Log View -->
        <div class="flex-1 flex flex-col bg-white border border-wushai-sand rounded-xl shadow-sm overflow-hidden">
          <div class="p-4 bg-gray-50 border-b border-wushai-sand text-xs text-gray-500">
             Showing {{ filteredLogs().length }} events
          </div>
          <div class="flex-1 overflow-auto">
            <table class="w-full text-right text-sm">
               <thead class="bg-gray-50 sticky top-0">
                 <tr>
                   <th class="px-6 py-3 border-b text-gray-600 font-medium">Timestamp</th>
                   <th class="px-6 py-3 border-b text-gray-600 font-medium">User</th>
                   <th class="px-6 py-3 border-b text-gray-600 font-medium">Action</th>
                   <th class="px-6 py-3 border-b text-gray-600 font-medium">Entity</th>
                   <th class="px-6 py-3 border-b text-gray-600 font-medium">Details</th>
                 </tr>
               </thead>
               <tbody>
                 @for (log of filteredLogs(); track log.id) {
                   <tr class="hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-100">
                     <td class="px-6 py-3 font-mono text-xs text-gray-500 whitespace-nowrap" dir="ltr">
                       {{ log.timestamp | date:'medium' }}
                     </td>
                     <td class="px-6 py-3 font-medium text-wushai-dark">{{ log.user }}</td>
                     <td class="px-6 py-3">
                        <span class="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider"
                          [ngClass]="{
                            'bg-green-100 text-green-700': log.action === 'Create',
                            'bg-blue-100 text-blue-700': log.action === 'Update',
                            'bg-red-100 text-red-700': log.action === 'Delete'
                          }">
                          {{ log.action }}
                        </span>
                     </td>
                     <td class="px-6 py-3">
                        <div class="flex flex-col">
                           <span class="font-bold text-xs text-gray-700">{{ log.entityType }}</span>
                           <span class="font-mono text-[10px] text-gray-400">{{ log.entityId }}</span>
                        </div>
                     </td>
                     <td class="px-6 py-3 text-gray-600">{{ log.details }}</td>
                   </tr>
                 }
               </tbody>
            </table>
            @if (filteredLogs().length === 0) {
              <div class="p-12 text-center text-gray-500">
                 No logs found matching your criteria.
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Impact Analysis Modal -->
    @if (impactReq()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-wushai-dark/80 backdrop-blur-sm animate-fade-in"
           (click)="closeImpactModal()">
         <div class="bg-wushai-light w-full max-w-5xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative" (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="p-6 border-b border-wushai-sand bg-white flex justify-between items-center z-10">
               <div>
                  <h3 class="text-2xl font-bold text-wushai-dark flex items-center gap-3">
                    <span [innerHTML]="getIcon('Shield')" class="text-wushai-olive"></span>
                    تحليل التأثير (Impact Analysis)
                  </h3>
                  <p class="text-sm text-gray-500 mt-1">تتبع التبعيات والعلاقات للمتطلب <span class="font-mono bg-gray-100 px-1 rounded">{{ impactReq()?.id }}</span></p>
               </div>
               <button (click)="closeImpactModal()" class="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 flex items-center justify-center transition-all">
                  <span [innerHTML]="getIcon('X')"></span>
               </button>
            </div>

            <!-- Graph Area -->
            <div class="flex-1 overflow-auto p-8 relative bg-dot-pattern flex items-center justify-center min-w-full">
               
               <div class="flex flex-col md:flex-row items-center gap-12 md:gap-20">
                  
                  <!-- 1. Upstream: Objectives -->
                  <div class="flex flex-col gap-4 items-center">
                     <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Upstream (Objectives)</span>
                     @for(obj of getImpactObjectives(impactReq()!); track obj.id) {
                        <div class="w-64 p-4 rounded-xl bg-white border-2 border-blue-200 shadow-sm relative group hover:-translate-y-1 transition-transform">
                           <div class="absolute -right-10 top-1/2 w-10 h-0.5 bg-blue-200 hidden md:block"></div>
                           <div class="flex justify-between items-start mb-1">
                              <span class="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{{ obj.id }}</span>
                              <span class="text-[10px] text-gray-400">{{ obj.owner }}</span>
                           </div>
                           <p class="font-bold text-sm text-gray-800 line-clamp-2">{{ obj.title }}</p>
                        </div>
                     }
                  </div>

                  <!-- 2. Focus: Requirement -->
                  <div class="flex flex-col gap-4 items-center relative z-10">
                     <span class="text-xs font-bold text-wushai-olive uppercase tracking-widest mb-2">Focus (Requirement)</span>
                     <div class="w-72 p-6 rounded-2xl bg-wushai-dark text-white shadow-2xl ring-4 ring-wushai-sand/50 transform scale-105">
                        <div class="flex justify-between items-start mb-3">
                           <span class="text-xs font-bold bg-wushai-olive px-2 py-1 rounded-md">{{ impactReq()?.id }}</span>
                           <span [class]="'text-[10px] font-bold px-1.5 py-0.5 rounded border ' + getPriorityClass(impactReq()!.priority)">{{ impactReq()?.priority }}</span>
                        </div>
                        <p class="font-bold text-lg mb-2 leading-tight">{{ impactReq()?.title }}</p>
                        <p class="text-sm text-gray-300 opacity-80 line-clamp-3 mb-4">{{ impactReq()?.description }}</p>
                        <div class="pt-4 border-t border-white/10 flex justify-between items-center text-xs text-gray-400">
                           <span>Owner: {{ impactReq()?.owner }}</span>
                           <span>{{ impactReq()?.status }}</span>
                        </div>
                     </div>
                  </div>

                  <!-- 3. Downstream: Designs & Tests -->
                  <div class="flex flex-col gap-8">
                     
                     <!-- Designs -->
                     <div class="flex flex-col gap-4 items-center">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Downstream (Designs)</span>
                        @if (impactReq()?.designIds?.length === 0) {
                           <div class="w-64 p-4 rounded-xl border-2 border-dashed border-gray-300 text-center text-gray-400 text-sm">
                              No Designs Linked
                           </div>
                        }
                        @for(des of getImpactDesigns(impactReq()!); track des.id) {
                           <div class="w-64 p-4 rounded-xl bg-white border-2 border-purple-200 shadow-sm relative group hover:-translate-y-1 transition-transform">
                              <div class="absolute -left-10 top-1/2 w-10 h-0.5 bg-purple-200 hidden md:block"></div>
                              <div class="flex items-center gap-2 mb-1">
                                 <span class="text-[10px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{{ des.id }}</span>
                              </div>
                              <p class="font-bold text-sm text-gray-800 truncate">{{ des.title }}</p>
                              <a [href]="des.url" target="_blank" class="text-xs text-blue-500 hover:underline mt-1 block truncate">{{ des.url }}</a>
                           </div>
                        }
                     </div>

                     <!-- Test Cases -->
                     <div class="flex flex-col gap-4 items-center">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Downstream (Tests)</span>
                         @if (impactReq()?.testCaseIds?.length === 0) {
                           <div class="w-64 p-4 rounded-xl border-2 border-dashed border-red-200 bg-red-50 text-center text-red-500 text-sm font-bold">
                              Missing Coverage!
                           </div>
                        }
                        @for(tc of getImpactTests(impactReq()!); track tc.id) {
                           <div class="w-64 p-4 rounded-xl bg-white border-2 shadow-sm relative group hover:-translate-y-1 transition-transform"
                                [ngClass]="tc.status === 'Pass' ? 'border-green-200' : 'border-red-200'">
                              <div class="absolute -left-10 top-1/2 w-10 h-0.5 hidden md:block" [ngClass]="tc.status === 'Pass' ? 'bg-green-200' : 'bg-red-200'"></div>
                              <div class="flex justify-between items-start mb-1">
                                 <span class="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    [ngClass]="tc.status === 'Pass' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">{{ tc.id }}</span>
                                 <span class="text-[10px] font-bold" [ngClass]="tc.status === 'Pass' ? 'text-green-600' : 'text-red-600'">{{ tc.status }}</span>
                              </div>
                              <p class="font-bold text-sm text-gray-800">{{ tc.title }}</p>
                           </div>
                        }
                     </div>

                  </div>
               </div>

            </div>
         </div>
      </div>
    }

    <!-- Create/Edit Modals Overlay -->
    @if (activeModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-wushai-sand overflow-hidden flex flex-col max-h-[90vh]">
          
          <!-- Modal Header -->
          <div class="p-4 border-b border-wushai-sand flex justify-between items-center bg-wushai-light">
             <h3 class="font-bold text-lg text-wushai-deep">
               @if(editingEntity()) { تعديل } @else { إضافة } 
               @switch(activeModal()) {
                 @case('Objective') { هدف (Objective) }
                 @case('Requirement') { متطلب (Requirement) }
                 @case('Design') { تصميم (Design) }
                 @case('TestCase') { اختبار (Test Case) }
               }
             </h3>
             <button (click)="closeModal()" class="text-gray-500 hover:text-red-600 transition-colors">
               <span [innerHTML]="getIcon('X')"></span>
             </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto space-y-4">
            
            @if(activeModal() === 'Objective') {
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">العنوان</label>
                <input #objTitle type="text" [value]="editingEntity()?.title || ''" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none" placeholder="مثال: زيادة المبيعات...">
              </div>
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">الوصف</label>
                <textarea #objDesc rows="3" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none" placeholder="شرح الهدف...">{{ editingEntity()?.description || '' }}</textarea>
              </div>
              <div>
                 <label class="block text-sm font-bold text-wushai-olive mb-1">المالك</label>
                 <input #objOwner type="text" [value]="editingEntity()?.owner || ''" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none" placeholder="اسم المالك">
              </div>
              <button (click)="saveObjective(objTitle.value, objDesc.value, objOwner.value)" 
                 class="w-full bg-wushai-dark text-white py-2 rounded-lg font-bold hover:bg-wushai-deep mt-2">
                 {{ editingEntity() ? 'حفظ التعديلات' : 'حفظ الهدف' }}
              </button>
            }

            @if(activeModal() === 'Requirement') {
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">عنوان المتطلب</label>
                <input #reqTitle type="text" [value]="editingEntity()?.title || ''" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none" placeholder="مثال: تسجيل الدخول برقم الجوال">
              </div>
              
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">الوصف</label>
                <textarea #reqDesc rows="2" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none" placeholder="تفاصيل إضافية...">{{ editingEntity()?.description || '' }}</textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-bold text-wushai-olive mb-1">المالك</label>
                    <input #reqOwner type="text" [value]="editingEntity()?.owner || ''" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none" placeholder="اسم المالك">
                  </div>
                  <div>
                    <label class="block text-sm font-bold text-wushai-olive mb-1">الأولوية</label>
                    <select #reqPriority [value]="editingEntity()?.priority || 'Medium'" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none bg-white">
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                  </div>
              </div>

              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">معايير القبول (Acceptance Criteria)</label>
                <textarea #reqAC rows="3" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none" placeholder="يجب أن يتم...">{{ editingEntity()?.acceptanceCriteria || '' }}</textarea>
              </div>
              <div>
                <label class="block text-sm font-bold text-wushai-olive mb-1">Objective ID (Primary)</label>
                <select #reqObjId [value]="editingEntity()?.objectiveIds?.[0] || ''" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none bg-white">
                  @for(obj of objectives(); track obj.id) {
                    <option [value]="obj.id">{{ obj.id }} - {{ obj.title }}</option>
                  }
                </select>
              </div>
              <button (click)="saveRequirement(reqTitle.value, reqDesc.value, reqOwner.value, reqPriority.value, reqAC.value, reqObjId.value)" 
                 class="w-full bg-wushai-dark text-white py-2 rounded-lg font-bold hover:bg-wushai-deep mt-2">
                 {{ editingEntity() ? 'حفظ التعديلات' : 'حفظ المتطلب' }}
              </button>
            }

            @if(activeModal() === 'Design') {
              <div>
                 <label class="block text-sm font-bold text-wushai-olive mb-1">عنوان التصميم</label>
                 <input #desTitle type="text" [value]="editingEntity()?.title || ''" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none">
              </div>
              <div>
                 <label class="block text-sm font-bold text-wushai-olive mb-1">رابط (Figma/Drive)</label>
                 <input #desUrl type="text" [value]="editingEntity()?.url || ''" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none" placeholder="https://...">
              </div>
              <button (click)="saveDesign(desTitle.value, desUrl.value)" 
                 class="w-full bg-wushai-dark text-white py-2 rounded-lg font-bold hover:bg-wushai-deep mt-2">
                 {{ editingEntity() ? 'حفظ التعديلات' : 'حفظ التصميم' }}
              </button>
            }

            @if(activeModal() === 'TestCase') {
              <div>
                 <label class="block text-sm font-bold text-wushai-olive mb-1">عنوان الاختبار</label>
                 <input #tcTitle type="text" [value]="editingEntity()?.title || ''" class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-wushai-olive outline-none">
              </div>
              <div class="flex items-center gap-4 mt-2">
                 <label class="flex items-center gap-2">
                   <input #tcPass type="radio" name="status" value="Pass" [checked]="editingEntity()?.status === 'Pass' || !editingEntity()"> <span class="text-green-600 font-bold">ناجح</span>
                 </label>
                 <label class="flex items-center gap-2">
                   <input #tcFail type="radio" name="status" value="Fail" [checked]="editingEntity()?.status === 'Fail'"> <span class="text-red-600 font-bold">فاشل</span>
                 </label>
                 <label class="flex items-center gap-2">
                   <input #tcNotRun type="radio" name="status" value="NotRun" [checked]="editingEntity()?.status === 'NotRun'"> <span class="text-gray-500">لم يعمل</span>
                 </label>
              </div>
              <button (click)="saveTestCase(tcTitle.value, tcPass.checked ? 'Pass' : tcFail.checked ? 'Fail' : 'NotRun')" 
                 class="w-full bg-wushai-dark text-white py-2 rounded-lg font-bold hover:bg-wushai-deep mt-4">
                 {{ editingEntity() ? 'حفظ التعديلات' : 'حفظ الاختبار' }}
              </button>
            }

          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-pulse-once {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1);
    }
    .bg-dot-pattern {
      background-image: radial-gradient(theme(colors.gray.300) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .dark .bg-dot-pattern {
      background-image: radial-gradient(theme(colors.gray.700) 1px, transparent 1px);
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .8; }
    }
  `]
})
export class TraceabilityComponent {
  private dataService = inject(DataService);
  private sanitizer = inject(DomSanitizer);

  viewMode = signal<'Matrix' | 'Audit' | 'Graph'>('Matrix');
  filterText = signal('');
  activeModal = signal<EntityType | null>(null);
  editingEntity = signal<any>(null);
  impactReq = signal<Requirement | null>(null); // For Impact Analysis

  requirements = this.dataService.requirements;
  objectives = this.dataService.objectives;
  designs = this.dataService.designs;
  testCases = this.dataService.testCases;
  report = this.dataService.preflightReport;
  logs = this.dataService.auditLogs;

  @ViewChild('graphContainer') graphContainer!: ElementRef;

  // Search logic for both views
  filteredLogs = computed(() => {
    const text = this.filterText().toLowerCase();
    return this.logs().filter(log =>
      log.user.toLowerCase().includes(text) ||
      log.entityId.toLowerCase().includes(text) ||
      log.details.toLowerCase().includes(text) ||
      log.entityType.toLowerCase().includes(text)
    );
  });

  filteredRequirements = computed(() => {
    const text = this.filterText().toLowerCase().trim();
    if (!text) return this.requirements();

    return this.requirements().filter(req =>
      req.title.toLowerCase().includes(text) ||
      req.id.toLowerCase().includes(text) ||
      req.description.toLowerCase().includes(text) ||
      req.owner.toLowerCase().includes(text) ||
      req.status.toLowerCase().includes(text)
    );
  });

  filteredOrphanedRequirements = computed(() => {
    return this.filteredRequirements().filter(r => !r.objectiveIds || r.objectiveIds.length === 0);
  });

  getFilteredRequirementsForObjective(objectiveId: string): Requirement[] {
    return this.filteredRequirements().filter(req => req.objectiveIds.includes(objectiveId));
  }

  switchView(mode: 'Matrix' | 'Audit' | 'Graph') {
    this.viewMode.set(mode);
    if (mode === 'Graph') {
      setTimeout(() => this.renderGraph(), 100);
    }
  }

  renderGraph() {
    if (!this.graphContainer) return;
    const element = this.graphContainer.nativeElement;
    d3.select(element).selectAll('*').remove();

    const width = element.offsetWidth || 800;
    const height = element.offsetHeight || 600;

    // --- Data Preparation ---
    const nodes: any[] = [];
    const links: any[] = [];
    const nodeIds = new Set<string>();

    const addNode = (node: any) => {
      if (!nodeIds.has(node.id)) {
        nodes.push(node);
        nodeIds.add(node.id);
      }
    };

    this.objectives().forEach(obj => {
      addNode({ id: obj.id, group: 'Objective', label: obj.title, data: obj });
    });

    this.designs().forEach(des => {
      addNode({ id: des.id, group: 'Design', label: des.title, data: des });
    });

    this.testCases().forEach(tc => {
      addNode({ id: tc.id, group: 'TestCase', label: tc.title, data: tc });
    });

    this.filteredRequirements().forEach(req => {
      addNode({ id: req.id, group: 'Requirement', label: req.title, data: req });

      req.objectiveIds.forEach(objId => {
        if (nodeIds.has(objId)) links.push({ source: objId, target: req.id });
      });

      req.designIds.forEach(desId => {
        if (nodeIds.has(desId)) links.push({ source: req.id, target: desId });
      });

      req.testCaseIds.forEach(tcId => {
        if (nodeIds.has(tcId)) links.push({ source: req.id, target: tcId });
      });
    });

    if (nodes.length === 0) return;

    // --- D3 Setup ---
    const svg = d3.select(element).append('svg')
      .attr('width', width)
      .attr('height', height)
      .call(d3.zoom<any, any>().on("zoom", (event) => g.attr("transform", event.transform)))
      .append('g');

    const g = svg.append('g');

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40));

    // --- Render Elements ---
    const link = g.append("g")
      .attr("stroke", "currentColor")
      .attr("class", "text-gray-300 dark:text-gray-700")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1.5);

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Shapes for nodes
    const symbol = d3.symbol().size(d => (d as any).group === 'Objective' ? 1200 : (d as any).group === 'Requirement' ? 800 : 500);
    node.append('path')
      .attr('d', d => symbol.type(this.getSymbolForNode(d))())
      .attr('fill', d => this.getColorForNode(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Tooltips
    node.append("title").text((d: any) => `${d.group}: ${d.label}`);

    // Labels
    node.append("text")
      .text((d: any) => d.id)
      .attr('y', 2)
      .attr('x', 0)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .attr('fill', 'white')
      .style('pointer-events', 'none');

    // --- Simulation Ticker ---
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // --- Drag Functions ---
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event: any, d: any) {
      d.fx = event.x; d.fy = event.y;
    }
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    }
  }

  getSymbolForNode(node: any): d3.SymbolType {
    switch (node.group) {
      case 'Objective': return d3.symbolCircle;
      case 'Requirement': return d3.symbolSquare;
      case 'Design': return d3.symbolTriangle;
      case 'TestCase': return d3.symbolDiamond;
      default: return d3.symbolCircle;
    }
  }

  getColorForNode(node: any): string {
    switch (node.group) {
      case 'Objective': return '#3b82f6'; // blue-500
      case 'Requirement': return '#a855f7'; // purple-500
      case 'Design': return '#5A3E2B'; // wushai-brown
      case 'TestCase':
        switch (node.data.status) {
          case 'Pass': return '#22c55e'; // green-500
          case 'Fail': return '#ef4444'; // red-500
          default: return '#6b7280'; // gray-500
        }
      default: return '#ccc';
    }
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  getReqStatus(req: any): 'Valid' | 'Gap' | 'Invalid' {
    if (!req.objectiveIds?.length || !req.acceptanceCriteria) return 'Invalid';
    if (!req.testCaseIds?.length) return 'Gap';
    return 'Valid';
  }

  getPriorityClass(priority: string) {
    switch (priority) {
      case 'High': return 'bg-red-50 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700';
    }
  }

  updateFilter(event: any) {
    this.filterText.set(event.target.value);
  }

  // --- Impact Analysis Helpers ---
  openImpactAnalysis(req: Requirement) {
    this.impactReq.set(req);
  }

  closeImpactModal() {
    this.impactReq.set(null);
  }

  getImpactObjectives(req: Requirement) {
    return this.objectives().filter(o => req.objectiveIds.includes(o.id));
  }

  getImpactDesigns(req: Requirement) {
    return this.designs().filter(d => req.designIds?.includes(d.id));
  }

  getImpactTests(req: Requirement) {
    return this.testCases().filter(t => req.testCaseIds?.includes(t.id));
  }

  // --- Modal Helpers ---
  openModal(type: EntityType, entity: any = null) {
    this.editingEntity.set(entity);
    this.activeModal.set(type);
  }

  closeModal() {
    this.activeModal.set(null);
    this.editingEntity.set(null);
  }

  // --- Actions ---

  deleteRequirement(id: string) {
    if (confirm('هل أنت متأكد من حذف هذا المتطلب؟ لا يمكن التراجع عن هذه العملية.')) {
      this.dataService.deleteRequirement(id);
    }
  }

  // --- CRUD Logic (Unified) ---

  saveObjective(title: string, description: string, owner: string) {
    if (!title) return;
    if (this.editingEntity()) {
      this.dataService.updateObjective(this.editingEntity().id, { title, description, owner });
    } else {
      const newObj: Objective = {
        id: `OBJ-${Date.now().toString().slice(-4)}`,
        title,
        description,
        owner: owner || 'Unassigned',
        status: 'Draft'
      };
      this.dataService.addObjective(newObj);
    }
    this.closeModal();
  }

  saveRequirement(title: string, desc: string, owner: string, priority: string, ac: string, objId: string) {
    if (!title || !objId) return;

    if (this.editingEntity()) {
      this.dataService.updateRequirement(this.editingEntity().id, {
        title,
        description: desc,
        owner,
        priority: priority as Priority,
        acceptanceCriteria: ac,
        objectiveIds: [objId]
      });
    } else {
      const newReq: Requirement = {
        id: `REQ-${Date.now().toString().slice(-4)}`,
        title,
        description: desc || 'Added via UI',
        source: 'User Input',
        owner: owner || 'Me',
        priority: (priority as Priority) || 'Medium',
        status: 'Draft',
        acceptanceCriteria: ac,
        objectiveIds: [objId],
        testCaseIds: [],
        designIds: []
      };
      this.dataService.addRequirement(newReq);
    }
    this.closeModal();
  }

  saveDesign(title: string, url: string) {
    if (!title) return;
    if (this.editingEntity()) {
      this.dataService.updateDesign(this.editingEntity().id, { title, url });
    } else {
      const newDes: Design = {
        id: `DES-${Date.now().toString().slice(-4)}`,
        title,
        url,
        status: 'Draft'
      };
      this.dataService.addDesign(newDes);
    }
    this.closeModal();
  }

  saveTestCase(title: string, status: 'Pass' | 'Fail' | 'NotRun') {
    if (!title) return;
    if (this.editingEntity()) {
      this.dataService.updateTestCase(this.editingEntity().id, { title, status });
    } else {
      const newTC: TestCase = {
        id: `TC-${Date.now().toString().slice(-4)}`,
        title,
        status
      };
      this.dataService.addTestCase(newTC);
    }
    this.closeModal();
  }

  exportToCSV() {
    if (this.report().status === 'Blocked') return;

    const data = this.requirements();
    const headers = ['Req ID', 'Title', 'Description', 'Objectives', 'Acceptance Criteria', 'Test Cases', 'Status'];

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';

    const csvContent = BOM + [
      headers.join(','),
      ...data.map(req => {
        const status = this.getReqStatus(req);
        const row = [
          req.id,
          req.title,
          req.description,
          req.objectiveIds.join('; '),
          req.acceptanceCriteria,
          req.testCaseIds.join('; '),
          status
        ];
        return row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traceability_matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
