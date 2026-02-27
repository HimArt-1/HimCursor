import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DataService } from '../../core/services/state/data.service';
import { RequestService } from '../../core/services/domain/request.service';
import { Icons } from '../../shared/ui/icons';
import { SharedRequest, RequestType, RequestStatus } from '../../core/types';
import { ConfettiService } from '../../core/services/state/confetti.service';

const REQUEST_TYPES: RequestType[] = ['تصميم', 'برمجة', 'محتوى', 'تسويق', 'إداري', 'أخرى'];
const REQUEST_STATUSES: RequestStatus[] = ['جديد', 'قيد التنفيذ', 'مكتمل'];

@Component({
    selector: 'app-requests',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-wushai-sidebar-dark dark:to-[#1a1625] p-4 md:p-8">

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl md:text-4xl font-black bg-gradient-to-r from-wushai-cocoa via-wushai-cocoa to-fuchsia-500 bg-clip-text text-transparent">
            الطلبات المشتركة
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">أنشئ طلبات وشاركها مع الفريق</p>
        </div>
        <button (click)="openCreateModal()" class="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-wushai-cocoa to-wushai-cocoa hover:from-wushai-cocoa hover:to-wushai-cocoa text-white font-bold rounded-xl shadow-lg shadow-wushai-cocoa/25 transition-all duration-300 hover:shadow-wushai-cocoa/40 hover:-translate-y-0.5 active:translate-y-0">
          <span [innerHTML]="getIcon('Plus')" class="w-5 h-5"></span>
          <span>طلب جديد</span>
        </button>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-3 gap-3 md:gap-4 mb-8">
        <div class="bg-white dark:bg-wushai-surface/50 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-500/20 shadow-sm">
          <div class="text-2xl md:text-3xl font-black text-blue-500">{{ countByStatus('جديد') }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">طلبات جديدة</div>
        </div>
        <div class="bg-white dark:bg-wushai-surface/50 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-500/20 shadow-sm">
          <div class="text-2xl md:text-3xl font-black text-amber-500">{{ countByStatus('قيد التنفيذ') }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">قيد التنفيذ</div>
        </div>
        <div class="bg-white dark:bg-wushai-surface/50 rounded-2xl p-4 border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm">
          <div class="text-2xl md:text-3xl font-black text-emerald-500">{{ countByStatus('مكتمل') }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">مكتملة</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-2 mb-6">
        <button (click)="filterStatus.set(null)" [class]="filterStatus() === null ? 'bg-wushai-cocoa text-white' : 'bg-white dark:bg-wushai-surface/50 text-gray-600 dark:text-gray-300'" class="px-4 py-2 rounded-xl text-sm font-bold transition-all border border-gray-200/50 dark:border-white/10 hover:shadow-md">
          الكل
        </button>
        @for (status of statuses; track status) {
          <button (click)="filterStatus.set(status)" [class]="filterStatus() === status ? 'bg-wushai-cocoa text-white' : 'bg-white dark:bg-wushai-surface/50 text-gray-600 dark:text-gray-300'" class="px-4 py-2 rounded-xl text-sm font-bold transition-all border border-gray-200/50 dark:border-white/10 hover:shadow-md">
            {{ status }}
          </button>
        }
      </div>

      <!-- Loading State -->
      @if (requestService.loading()) {
        <div class="flex items-center justify-center py-20">
          <div class="w-10 h-10 border-4 border-wushai-cocoa/30 border-t-wushai-cocoa rounded-full animate-spin"></div>
        </div>
      }

      <!-- Empty State -->
      @if (!requestService.loading() && filteredRequests().length === 0) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-20 h-20 rounded-3xl bg-wushai-cocoa/10 dark:bg-wushai-cocoa/20 flex items-center justify-center mb-4">
            <span [innerHTML]="getIcon('Inbox')" class="w-10 h-10 text-wushai-cocoa"></span>
          </div>
          <h3 class="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">لا توجد طلبات</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">ابدأ بإنشاء طلب جديد لمشاركته مع الفريق</p>
        </div>
      }

      <!-- Request Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        @for (req of filteredRequests(); track req.id) {
          <div (click)="openDetailModal(req)" class="group cursor-pointer bg-white dark:bg-wushai-surface/60 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-wushai-cocoa/10 dark:hover:shadow-wushai-cocoa/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <!-- Card Header with Status Stripe -->
            <div class="h-1.5 w-full" [class]="req.status === 'مكتمل' ? 'bg-gradient-to-r from-emerald-400 to-green-500' : req.status === 'قيد التنفيذ' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-400 to-wushai-cocoa'"></div>

            <div class="p-5">
              <!-- Type badge + Status -->
              <div class="flex items-center justify-between mb-3">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" [class]="requestService.getTypeColor(req.type)">
                  {{ requestService.getTypeIcon(req.type) }} {{ req.type }}
                </span>
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border" [class]="requestService.getStatusColor(req.status)">
                  {{ req.status }}
                </span>
              </div>

              <!-- Title -->
              <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-2 line-clamp-1 group-hover:text-wushai-cocoa dark:group-hover:text-wushai-sand transition-colors">
                {{ req.title }}
              </h3>

              <!-- Description preview -->
              @if (req.description) {
                <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">{{ req.description }}</p>
              }

              <!-- Footer -->
              <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-gradient-to-br from-wushai-cocoa to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {{ req.requesterName?.charAt(0) || '?' }}
                  </div>
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ req.requesterName || 'مستخدم' }}</span>
                </div>
                <div class="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                  @if (req.attachments.length > 0) {
                    <span class="flex items-center gap-1">
                      <span [innerHTML]="getIcon('Paperclip')" class="w-3.5 h-3.5"></span>
                      {{ req.attachments.length }}
                    </span>
                  }
                  <span>{{ requestService.formatTimeAgo(req.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- ===================== CREATE MODAL ===================== -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" (click)="closeCreateModal()">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-[#1C1612] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="sticky top-0 z-10 bg-white dark:bg-[#1C1612] p-6 pb-4 border-b border-gray-100 dark:border-white/10 rounded-t-3xl">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-gray-800 dark:text-white">طلب جديد</h2>
                <button (click)="closeCreateModal()" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                  <span [innerHTML]="getIcon('X')" class="w-5 h-5 text-gray-400"></span>
                </button>
              </div>
            </div>

            <div class="p-6 space-y-5">
              <!-- Title -->
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">عنوان الطلب *</label>
                <input #createTitle type="text" placeholder="مثال: تصميم شعار جديد..." class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-wushai-cocoa focus:border-transparent outline-none transition-all">
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">وصف الطلب *</label>
                <textarea #createDesc rows="3" placeholder="اشرح تفاصيل الطلب..." class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-wushai-cocoa focus:border-transparent outline-none transition-all resize-none"></textarea>
              </div>

              <!-- Type -->
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نوع الطلب</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (type of types; track type) {
                    <button (click)="selectedType.set(type)" [class]="selectedType() === type ? 'ring-2 ring-wushai-cocoa border-wushai-cocoa dark:border-wushai-sand bg-purple-50 dark:bg-wushai-cocoa/20' : 'border-gray-200 dark:border-white/10 hover:border-wushai-sand'" class="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-bold text-gray-700 dark:text-gray-300 transition-all">
                      {{ requestService.getTypeIcon(type) }} {{ type }}
                    </button>
                  }
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
                <textarea #createNotes rows="2" placeholder="ملاحظات إضافية..." class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-wushai-cocoa focus:border-transparent outline-none transition-all resize-none"></textarea>
              </div>

              <!-- File Upload -->
              <div>
                <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">المرفقات</label>
                <div (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onFileDrop($event)" class="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-wushai-sand dark:hover:border-wushai-cocoa hover:bg-purple-50/50 dark:hover:bg-wushai-cocoa/5 transition-all group">
                  <span [innerHTML]="getIcon('Upload')" class="w-8 h-8 text-gray-400 group-hover:text-wushai-cocoa mx-auto mb-2"></span>
                  <p class="text-sm text-gray-500 dark:text-gray-400 group-hover:text-wushai-cocoa dark:group-hover:text-wushai-sand">اسحب الملفات هنا أو اضغط للاختيار</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">صور • مستندات • ملفات مضغوطة</p>
                </div>
                <input #fileInput type="file" multiple class="hidden" (change)="onFileSelect($event)">

                <!-- Selected files list -->
                @if (selectedFiles().length > 0) {
                  <div class="mt-3 space-y-2">
                    @for (file of selectedFiles(); track file.name; let i = $index) {
                      <div class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <span [innerHTML]="getIcon('Paperclip')" class="w-4 h-4 text-gray-400 flex-shrink-0"></span>
                          <span class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ file.name }}</span>
                          <span class="text-xs text-gray-400 flex-shrink-0">{{ requestService.formatFileSize(file.size) }}</span>
                        </div>
                        <button (click)="removeFile(i)" class="p-1 text-red-400 hover:text-red-500 transition-colors flex-shrink-0">
                          <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="sticky bottom-0 bg-white dark:bg-[#1C1612] p-6 pt-4 border-t border-gray-100 dark:border-white/10 rounded-b-3xl">
              <div class="flex gap-3">
                <button (click)="closeCreateModal()" class="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  إلغاء
                </button>
                <button (click)="submitCreate(createTitle.value, createDesc.value, createNotes.value)" [disabled]="submitting()" class="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-wushai-cocoa to-wushai-cocoa hover:from-wushai-cocoa hover:to-wushai-cocoa text-white font-bold shadow-lg shadow-wushai-cocoa/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (submitting()) {
                    <span class="flex items-center justify-center gap-2">
                      <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      جاري الإرسال...
                    </span>
                  } @else {
                    إرسال الطلب
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ===================== DETAIL MODAL ===================== -->
      @if (showDetailModal() && selectedRequest()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" (click)="closeDetailModal()">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div class="relative bg-white dark:bg-[#1C1612] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <!-- Detail Header -->
            <div class="sticky top-0 z-10 bg-white dark:bg-[#1C1612] rounded-t-3xl">
              <div class="h-2 w-full rounded-t-3xl" [class]="selectedRequest()!.status === 'مكتمل' ? 'bg-gradient-to-r from-emerald-400 to-green-500' : selectedRequest()!.status === 'قيد التنفيذ' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-400 to-wushai-cocoa'"></div>
              <div class="p-6 pb-4 border-b border-gray-100 dark:border-white/10">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" [class]="requestService.getTypeColor(selectedRequest()!.type)">
                        {{ requestService.getTypeIcon(selectedRequest()!.type) }} {{ selectedRequest()!.type }}
                      </span>
                      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border" [class]="requestService.getStatusColor(selectedRequest()!.status)">
                        {{ selectedRequest()!.status }}
                      </span>
                    </div>
                    <h2 class="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{{ selectedRequest()!.title }}</h2>
                  </div>
                  <button (click)="closeDetailModal()" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0">
                    <span [innerHTML]="getIcon('X')" class="w-5 h-5 text-gray-400"></span>
                  </button>
                </div>
              </div>
            </div>

            <div class="p-6 space-y-6">
              <!-- Description -->
              @if (selectedRequest()!.description) {
                <div>
                  <h4 class="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">الوصف</h4>
                  <p class="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{{ selectedRequest()!.description }}</p>
                </div>
              }

              <!-- Notes -->
              @if (selectedRequest()!.notes) {
                <div class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                  <h4 class="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">📝 ملاحظات</h4>
                  <p class="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap">{{ selectedRequest()!.notes }}</p>
                </div>
              }

              <!-- Requester Info -->
              <div class="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl p-4">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-wushai-cocoa to-pink-500 flex items-center justify-center text-white font-bold shadow-sm">
                  {{ selectedRequest()!.requesterName?.charAt(0) || '?' }}
                </div>
                <div>
                  <p class="text-sm font-bold text-gray-700 dark:text-gray-200">{{ selectedRequest()!.requesterName || 'مستخدم' }}</p>
                  <p class="text-xs text-gray-400">طالب المهمة • {{ requestService.formatTimeAgo(selectedRequest()!.createdAt) }}</p>
                </div>
              </div>

              <!-- Input Attachments -->
              @if (getInputAttachments().length > 0) {
                <div>
                  <h4 class="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                    <span [innerHTML]="getIcon('Paperclip')" class="w-4 h-4"></span>
                    المرفقات ({{ getInputAttachments().length }})
                  </h4>
                  <div class="space-y-2">
                    @for (att of getInputAttachments(); track att.id) {
                      <a [href]="att.fileUrl" target="_blank" class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all group">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                          <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg" [class]="isImageType(att.fileType) ? 'bg-pink-100 dark:bg-pink-500/20' : 'bg-blue-100 dark:bg-blue-500/20'">
                            {{ isImageType(att.fileType) ? '🖼️' : '📄' }}
                          </div>
                          <div class="min-w-0">
                            <p class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{{ att.fileName }}</p>
                            <p class="text-xs text-gray-400">{{ requestService.formatFileSize(att.fileSize) }}</p>
                          </div>
                        </div>
                        <span [innerHTML]="getIcon('Download')" class="w-5 h-5 text-gray-400 group-hover:text-wushai-cocoa transition-colors flex-shrink-0"></span>
                      </a>
                    }
                  </div>
                </div>
              }

              <!-- Assignee / Action Section -->
              @if (selectedRequest()!.status === 'جديد') {
                <button (click)="acceptRequest()" [disabled]="submitting()" class="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-wushai-olive hover:from-blue-500 hover:to-wushai-olive text-white font-bold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50">
                  @if (submitting()) {
                    <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  } @else {
                    <span [innerHTML]="getIcon('Check')" class="w-5 h-5"></span>
                  }
                  قبول وتنفيذ الطلب
                </button>
              }

              @if (selectedRequest()!.status === 'قيد التنفيذ') {
                <div class="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-5 space-y-4">
                  <h4 class="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <span [innerHTML]="getIcon('CheckCircle')" class="w-5 h-5"></span>
                    إكمال الطلب
                  </h4>

                  <!-- Output Notes -->
                  <div>
                    <label class="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1.5">ملاحظات التنفيذ</label>
                    <textarea #outputNotes rows="2" placeholder="اكتب ملاحظاتك حول التنفيذ..." class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"></textarea>
                  </div>

                  <!-- Output Link -->
                  <div>
                    <label class="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1.5">رابط المخرجات</label>
                    <div class="flex items-center gap-2">
                      <span [innerHTML]="getIcon('LinkIcon')" class="w-5 h-5 text-gray-400 flex-shrink-0"></span>
                      <input #outputLink type="url" placeholder="https://drive.google.com/..." class="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all">
                    </div>
                  </div>

                  <!-- Output Files -->
                  <div>
                    <label class="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-1.5">رفع مخرجات</label>
                    <div (click)="outputFileInput.click()" class="border-2 border-dashed border-emerald-300 dark:border-emerald-500/30 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all">
                      <span [innerHTML]="getIcon('Upload')" class="w-6 h-6 text-emerald-500 mx-auto mb-1"></span>
                      <p class="text-xs text-gray-500 dark:text-gray-400">اضغط لاختيار ملفات المخرجات</p>
                    </div>
                    <input #outputFileInput type="file" multiple class="hidden" (change)="onOutputFileSelect($event)">
                    @if (outputFiles().length > 0) {
                      <div class="mt-2 space-y-1.5">
                        @for (file of outputFiles(); track file.name; let i = $index) {
                          <div class="flex items-center justify-between px-3 py-2 bg-white dark:bg-white/5 rounded-lg text-sm">
                            <span class="truncate text-gray-700 dark:text-gray-300">{{ file.name }}</span>
                            <button (click)="removeOutputFile(i)" class="text-red-400 hover:text-red-500 flex-shrink-0">
                              <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <button (click)="submitComplete(outputNotes.value, outputLink.value)" [disabled]="submitting()" class="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50">
                    @if (submitting()) {
                      <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      جاري الإكمال...
                    } @else {
                      ✅ تم الإنجاز
                    }
                  </button>
                </div>
              }

              <!-- Completed Output Section -->
              @if (selectedRequest()!.status === 'مكتمل') {
                <div class="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-5 space-y-3">
                  <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span [innerHTML]="getIcon('CheckCircle')" class="w-5 h-5"></span>
                    تم الإنجاز
                  </div>

                  @if (selectedRequest()!.assigneeName) {
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                      <span class="font-bold">المنفذ:</span> {{ selectedRequest()!.assigneeName }}
                    </p>
                  }

                  @if (selectedRequest()!.outputNotes) {
                    <p class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      <span class="font-bold">ملاحظات:</span> {{ selectedRequest()!.outputNotes }}
                    </p>
                  }

                  @if (selectedRequest()!.outputLink) {
                    <a [href]="selectedRequest()!.outputLink" target="_blank" class="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-bold">
                      <span [innerHTML]="getIcon('LinkIcon')" class="w-4 h-4"></span>
                      رابط المخرجات
                    </a>
                  }

                  <!-- Output Attachments -->
                  @if (getOutputAttachments().length > 0) {
                    <div class="space-y-2 pt-2">
                      <p class="text-sm font-bold text-gray-600 dark:text-gray-300">📦 مخرجات التنفيذ:</p>
                      @for (att of getOutputAttachments(); track att.id) {
                        <a [href]="att.fileUrl" target="_blank" class="flex items-center gap-3 px-3 py-2 bg-white dark:bg-white/5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all">
                          <span>{{ isImageType(att.fileType) ? '🖼️' : '📄' }}</span>
                          <span class="text-sm text-gray-700 dark:text-gray-200 truncate">{{ att.fileName }}</span>
                          <span [innerHTML]="getIcon('Download')" class="w-4 h-4 text-gray-400 mr-auto"></span>
                        </a>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Delete Button (for requester) -->
              @if (selectedRequest()!.requesterId === currentUserId()) {
                <button (click)="deleteRequest()" [disabled]="submitting()" class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold transition-all disabled:opacity-50">
                  <span [innerHTML]="getIcon('Trash')" class="w-5 h-5"></span>
                  حذف الطلب
                </button>
              }
            </div>
          </div>
        </div>
      }

    </div>
  `,
    styles: [`
    .line-clamp-1 {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class RequestsComponent {
    private sanitizer = inject(DomSanitizer);
    private dataService = inject(DataService);
    private confettiService = inject(ConfettiService);
    requestService = inject(RequestService);

    readonly types = REQUEST_TYPES;
    readonly statuses = REQUEST_STATUSES;

    // State
    readonly filterStatus = signal<RequestStatus | null>(null);
    readonly showCreateModal = signal(false);
    readonly showDetailModal = signal(false);
    readonly selectedRequest = signal<SharedRequest | null>(null);
    readonly selectedType = signal<RequestType>('أخرى');
    readonly selectedFiles = signal<File[]>([]);
    readonly outputFiles = signal<File[]>([]);
    readonly submitting = signal(false);

    readonly currentUserId = computed(() => this.dataService.currentUser()?.id || '');

    readonly filteredRequests = computed(() => {
        const status = this.filterStatus();
        const all = this.requestService.requests();
        if (!status) return all;
        return all.filter(r => r.status === status);
    });

    constructor() {
        this.requestService.loadRequests();
    }

    getIcon(name: keyof typeof Icons): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
    }

    countByStatus(status: RequestStatus): number {
        return this.requestService.requests().filter(r => r.status === status).length;
    }

    // --- Create Modal ---
    openCreateModal() {
        this.showCreateModal.set(true);
        this.selectedType.set('أخرى');
        this.selectedFiles.set([]);
    }

    closeCreateModal() {
        this.showCreateModal.set(false);
        this.selectedFiles.set([]);
    }

    onFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.selectedFiles.update(files => [...files, ...Array.from(input.files!)]);
        }
    }

    onFileDrop(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer?.files) {
            this.selectedFiles.update(files => [...files, ...Array.from(event.dataTransfer!.files)]);
        }
    }

    removeFile(index: number) {
        this.selectedFiles.update(files => files.filter((_, i) => i !== index));
    }

    async submitCreate(title: string, description: string, notes: string) {
        if (!title.trim() || !description.trim()) return;
        this.submitting.set(true);
        try {
            await this.requestService.createRequest(
                title.trim(), description.trim(), this.selectedType(), notes.trim(), this.selectedFiles()
            );
            this.closeCreateModal();
        } finally {
            this.submitting.set(false);
        }
    }

    // --- Detail Modal ---
    openDetailModal(req: SharedRequest) {
        this.selectedRequest.set(req);
        this.showDetailModal.set(true);
        this.outputFiles.set([]);
    }

    closeDetailModal() {
        this.showDetailModal.set(false);
        this.selectedRequest.set(null);
        this.outputFiles.set([]);
    }

    getInputAttachments() {
        return (this.selectedRequest()?.attachments || []).filter(a => a.kind === 'input');
    }

    getOutputAttachments() {
        return (this.selectedRequest()?.attachments || []).filter(a => a.kind === 'output');
    }

    isImageType(mimeType: string): boolean {
        return mimeType.startsWith('image/');
    }

    // --- Actions ---
    async acceptRequest() {
        if (!this.selectedRequest()) return;
        this.submitting.set(true);
        try {
            const success = await this.requestService.assignRequest(this.selectedRequest()!.id);
            if (success) {
                // Refresh selected request
                const updated = this.requestService.requests().find(r => r.id === this.selectedRequest()!.id);
                if (updated) this.selectedRequest.set(updated);
            }
        } finally {
            this.submitting.set(false);
        }
    }

    onOutputFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.outputFiles.update(files => [...files, ...Array.from(input.files!)]);
        }
    }

    removeOutputFile(index: number) {
        this.outputFiles.update(files => files.filter((_, i) => i !== index));
    }

    async submitComplete(outputNotes: string, outputLink: string) {
        if (!this.selectedRequest()) return;
        this.submitting.set(true);
        try {
            const success = await this.requestService.completeRequest(
                this.selectedRequest()!.id, outputNotes.trim(), outputLink.trim(), this.outputFiles()
            );
            if (success) {
                this.confettiService.launch(80);
                const updated = this.requestService.requests().find(r => r.id === this.selectedRequest()!.id);
                if (updated) this.selectedRequest.set(updated);
            }
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteRequest() {
        if (!this.selectedRequest()) return;
        if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
        this.submitting.set(true);
        try {
            const success = await this.requestService.deleteRequest(this.selectedRequest()!.id);
            if (success) this.closeDetailModal();
        } finally {
            this.submitting.set(false);
        }
    }
}
