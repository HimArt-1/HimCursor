import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { ToastService } from '../../core/services/state/toast.service';
import { KnowledgeService, Document, DocumentVersion } from '../../core/services/domain/knowledge.service';

type ViewMode = 'list' | 'view' | 'edit' | 'create' | 'versions';

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col space-y-6 animate-fade-in">
      <!-- Header -->
      <header class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-3">
            <span [innerHTML]="getIcon('BookOpen')"></span>
            مركز المعرفة
          </h2>
          <p class="text-wushai-olive mt-2">{{ documents().length }} مستند • توثيق شامل للمشروع</p>
        </div>
        <div class="flex gap-3">
          <button (click)="createNew()" 
            class="bg-wushai-dark hover:bg-wushai-black text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl">
            <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span>
            مستند جديد
          </button>
        </div>
      </header>

      <!-- Search & Filters -->
      <div class="flex flex-col md:flex-row gap-4">
        <div class="relative flex-1">
          <span class="absolute right-4 top-3 text-gray-400" [innerHTML]="getIcon('Search')"></span>
          <input type="text" 
            placeholder="بحث في المستندات..." 
            (input)="onSearch($any($event.target).value)"
            class="w-full pr-12 pl-4 py-3 rounded-xl border border-wushai-sand dark:border-wushai-olive focus:outline-none focus:border-wushai-olive dark:focus:border-wushai-lilac bg-white dark:bg-wushai-surface dark:text-white shadow-sm text-sm">
        </div>
        <select (change)="filterCategory.set($any($event.target).value)"
          class="bg-white dark:bg-wushai-surface border border-wushai-sand dark:border-wushai-olive text-gray-700 dark:text-white py-3 px-4 rounded-xl text-sm font-medium shadow-sm">
          @for (cat of categories(); track cat) {
            <option [value]="cat">{{ cat === 'All' ? 'كل الفئات' : cat }}</option>
          }
        </select>
        <select (change)="filterStatus.set($any($event.target).value)"
          class="bg-white dark:bg-wushai-surface border border-wushai-sand dark:border-wushai-olive text-gray-700 dark:text-white py-3 px-4 rounded-xl text-sm font-medium shadow-sm">
          <option value="all">كل الحالات</option>
          <option value="published">منشور</option>
          <option value="draft">مسودة</option>
          <option value="archived">مؤرشف</option>
        </select>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex gap-6 min-h-0">
        
        <!-- Documents List -->
        <aside class="w-80 bg-white dark:bg-wushai-surface border border-wushai-sand dark:border-wushai-olive rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <!-- Pinned Section -->
          @if (pinnedDocs().length > 0) {
            <div class="p-4 border-b border-wushai-sand dark:border-wushai-olive">
              <p class="text-xs font-bold text-wushai-olive uppercase tracking-wider mb-3 flex items-center gap-2">
                <span [innerHTML]="getIcon('Star')" class="w-3 h-3"></span> مثبت
              </p>
              @for (doc of pinnedDocs(); track doc.id) {
                <div (click)="selectDocument(doc)" 
                  class="p-3 rounded-xl cursor-pointer transition-all mb-2"
                  [class.bg-wushai-olive]="selectedDocument()?.id === doc.id"
                  [class.text-white]="selectedDocument()?.id === doc.id"
                  [class.hover:bg-wushai-sand]="selectedDocument()?.id !== doc.id"
                  [class.dark:hover:bg-wushai-deep]="selectedDocument()?.id !== doc.id">
                  <p class="font-bold text-sm truncate">{{ doc.title }}</p>
                  <p class="text-xs opacity-70 mt-1">{{ doc.category }}</p>
                </div>
              }
            </div>
          }
          
          <!-- All Documents -->
          <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <p class="text-xs font-bold text-wushai-olive uppercase tracking-wider mb-3">المستندات</p>
            @for (doc of filteredDocuments(); track doc.id) {
              <div (click)="selectDocument(doc)" 
                class="p-3 rounded-xl cursor-pointer transition-all mb-2 border border-transparent"
                [class.bg-wushai-sand]="selectedDocument()?.id === doc.id"
                [class.dark:bg-wushai-deep]="selectedDocument()?.id === doc.id"
                [class.border-wushai-olive]="selectedDocument()?.id === doc.id"
                [class.hover:bg-gray-50]="selectedDocument()?.id !== doc.id"
                [class.dark:hover:bg-wushai-black]="selectedDocument()?.id !== doc.id">
                <div class="flex items-start justify-between">
                  <p class="font-bold text-sm text-wushai-dark dark:text-white truncate flex-1">{{ doc.title }}</p>
                  @if (doc.status === 'draft') {
                    <span class="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">مسودة</span>
                  }
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                  <span>{{ doc.category }}</span>
                  <span>•</span>
                  <span>{{ doc.viewCount }} مشاهدة</span>
                </p>
                @if (doc.tags.length > 0) {
                  <div class="flex flex-wrap gap-1 mt-2">
                    @for (tag of doc.tags.slice(0, 3); track tag) {
                      <span class="text-[10px] bg-wushai-light dark:bg-wushai-black text-wushai-olive px-2 py-0.5 rounded-full">#{{ tag }}</span>
                    }
                  </div>
                }
              </div>
            }
            @if (filteredDocuments().length === 0) {
              <div class="text-center py-8 text-gray-400">
                <span [innerHTML]="getIcon('FileText')" class="w-12 h-12 opacity-30 mx-auto block mb-3"></span>
                <p class="text-sm">لا توجد مستندات</p>
              </div>
            }
          </div>
        </aside>

        <!-- Document Viewer/Editor -->
        <main class="flex-1 bg-white dark:bg-wushai-surface border border-wushai-sand dark:border-wushai-olive rounded-2xl shadow-sm overflow-hidden flex flex-col">
          @switch (mode()) {
            @case ('list') {
              <div class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <span [innerHTML]="getIcon('BookOpen')" class="w-20 h-20 opacity-20 mb-4"></span>
                <h3 class="font-bold text-xl mb-2">مركز المعرفة</h3>
                <p class="text-sm">اختر مستنداً للعرض أو أنشئ مستنداً جديداً</p>
              </div>
            }
            @case ('view') {
              <div class="flex-1 flex flex-col min-h-0">
                <!-- Document Header -->
                <div class="p-6 border-b border-wushai-sand dark:border-wushai-olive bg-gradient-to-r from-wushai-light to-white dark:from-wushai-deep dark:to-wushai-surface">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-2">
                        <span class="text-xs bg-wushai-olive/20 text-wushai-olive px-3 py-1 rounded-full font-bold">{{ selectedDocument()?.category }}</span>
                        @if (selectedDocument()?.isPinned) {
                          <span [innerHTML]="getIcon('Star')" class="w-4 h-4 text-yellow-500"></span>
                        }
                      </div>
                      <h1 class="text-2xl font-bold text-wushai-dark dark:text-white">{{ selectedDocument()?.title }}</h1>
                      <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-4">
                        <span class="flex items-center gap-1">
                          <span [innerHTML]="getIcon('User')" class="w-3 h-3"></span>
                          {{ selectedDocument()?.authorName || 'Unknown' }}
                        </span>
                        <span class="flex items-center gap-1">
                          <span [innerHTML]="getIcon('Clock')" class="w-3 h-3"></span>
                          {{ selectedDocument()?.updatedAt | date:'medium' }}
                        </span>
                        <span class="flex items-center gap-1">
                          <span [innerHTML]="getIcon('Eye')" class="w-3 h-3"></span>
                          {{ selectedDocument()?.viewCount }} مشاهدة
                        </span>
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button (click)="togglePin()" class="p-2 rounded-lg hover:bg-wushai-sand dark:hover:bg-wushai-deep transition-colors" [title]="selectedDocument()?.isPinned ? 'إلغاء التثبيت' : 'تثبيت'">
                        <span [innerHTML]="getIcon('Star')" class="w-5 h-5" [class.text-yellow-500]="selectedDocument()?.isPinned" [class.text-gray-400]="!selectedDocument()?.isPinned"></span>
                      </button>
                      <button (click)="showVersions()" class="p-2 rounded-lg hover:bg-wushai-sand dark:hover:bg-wushai-deep transition-colors text-gray-500" title="سجل الإصدارات">
                        <span [innerHTML]="getIcon('Clock')" class="w-5 h-5"></span>
                      </button>
                      <button (click)="setMode('edit')" class="bg-wushai-olive hover:bg-wushai-dark text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                        <span [innerHTML]="getIcon('Edit')" class="w-4 h-4"></span> تعديل
                      </button>
                      <button (click)="deleteDocument()" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                        <span [innerHTML]="getIcon('Trash')" class="w-5 h-5"></span>
                      </button>
                    </div>
                  </div>
                  @if (selectedDocument()?.tags && selectedDocument()!.tags.length > 0) {
                    <div class="flex flex-wrap gap-2 mt-4">
                      @for (tag of selectedDocument()!.tags; track tag) {
                        <span class="text-xs bg-wushai-sand dark:bg-wushai-black text-wushai-olive px-3 py-1 rounded-full">#{{ tag }}</span>
                      }
                    </div>
                  }
                </div>
                
                <!-- Document Content -->
                <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <article class="prose prose-lg dark:prose-invert max-w-none prose-headings:text-wushai-dark dark:prose-headings:text-white prose-a:text-wushai-olive" [innerHTML]="renderedContent()"></article>
                </div>

                <!-- AI Suggestions -->
                @if (aiSuggestions().length > 0) {
                  <div class="p-4 border-t border-wushai-sand dark:border-wushai-olive bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                    <p class="text-xs font-bold text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
                      <span [innerHTML]="getIcon('Bot')" class="w-4 h-4"></span> مستندات ذات صلة (AI)
                    </p>
                    <div class="flex gap-3 overflow-x-auto pb-2">
                      @for (doc of aiSuggestions(); track doc.id) {
                        <button (click)="selectDocument(doc)" class="flex-shrink-0 bg-white dark:bg-wushai-surface px-4 py-2 rounded-lg text-sm font-medium hover:shadow-md transition-all border border-purple-100 dark:border-purple-800">
                          {{ doc.title }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
            @case ('edit') {
              <ng-container *ngTemplateOutlet="editorTemplate"></ng-container>
            }
            @case ('create') {
              <ng-container *ngTemplateOutlet="editorTemplate"></ng-container>
            }
            @case ('versions') {
              <div class="flex-1 flex flex-col">
                <div class="p-6 border-b border-wushai-sand dark:border-wushai-olive bg-wushai-light dark:bg-wushai-deep flex items-center justify-between">
                  <div>
                    <h2 class="text-xl font-bold text-wushai-dark dark:text-white">سجل الإصدارات</h2>
                    <p class="text-sm text-gray-500">{{ selectedDocument()?.title }}</p>
                  </div>
                  <button (click)="setMode('view')" class="text-gray-500 hover:text-gray-700">
                    <span [innerHTML]="getIcon('X')" class="w-6 h-6"></span>
                  </button>
                </div>
                <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  @for (version of versions(); track version.id) {
                    <div class="p-4 border border-wushai-sand dark:border-wushai-olive rounded-xl mb-4 hover:shadow-md transition-all">
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-wushai-dark dark:text-white">الإصدار {{ version.versionNumber }}</span>
                        <span class="text-xs text-gray-500">{{ version.createdAt | date:'medium' }}</span>
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">{{ version.changeSummary }}</p>
                      <button (click)="restoreVersion(version)" class="text-sm text-wushai-olive hover:text-wushai-dark font-bold">
                        استعادة هذا الإصدار
                      </button>
                    </div>
                  }
                  @if (versions().length === 0) {
                    <div class="text-center py-8 text-gray-400">
                      <p>لا يوجد سجل إصدارات</p>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </main>
      </div>
    </div>

    <!-- Editor Template -->
    <ng-template #editorTemplate>
      <div class="flex-1 flex flex-col min-h-0">
        <!-- Editor Header -->
        <div class="p-4 border-b border-wushai-sand dark:border-wushai-olive bg-wushai-light dark:bg-wushai-deep">
          <input #titleInput type="text" 
            placeholder="عنوان المستند..." 
            [value]="selectedDocument()?.title || ''"
            class="w-full bg-transparent text-2xl font-bold text-wushai-dark dark:text-white outline-none">
        </div>
        
        <!-- Editor Toolbar -->
        <div class="px-4 py-2 border-b border-wushai-sand dark:border-wushai-olive flex items-center gap-4 bg-gray-50 dark:bg-wushai-black">
          <select #categorySelect [value]="selectedDocument()?.category || 'General'"
            class="bg-white dark:bg-wushai-surface border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm">
            <option value="General">عام</option>
            <option value="Technical">تقني</option>
            <option value="Process">عمليات</option>
            <option value="Guide">دليل</option>
            <option value="Policy">سياسة</option>
          </select>
          <input #tagsInput type="text" 
            placeholder="الوسوم (مفصولة بفاصلة)"
            [value]="selectedDocument()?.tags?.join(', ') || ''"
            class="flex-1 bg-white dark:bg-wushai-surface border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm">
          <select #statusSelect [value]="selectedDocument()?.status || 'draft'"
            class="bg-white dark:bg-wushai-surface border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm">
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
            <option value="archived">مؤرشف</option>
          </select>
        </div>

        <!-- Editor Content -->
        <div class="flex-1 flex min-h-0">
          <!-- Markdown Editor -->
          <div class="flex-1 flex flex-col border-r border-wushai-sand dark:border-wushai-olive">
            <div class="px-4 py-2 bg-gray-50 dark:bg-wushai-black border-b border-gray-200 dark:border-gray-700">
              <span class="text-xs font-bold text-gray-500">Markdown</span>
            </div>
            <textarea #contentInput 
              placeholder="اكتب هنا... (يدعم Markdown)"
              class="flex-1 w-full p-6 bg-white dark:bg-wushai-surface outline-none resize-none font-mono text-sm leading-relaxed dark:text-white"
              (input)="updatePreview($any($event.target).value)"
              >{{ selectedDocument()?.content || '' }}</textarea>
          </div>
          
          <!-- Live Preview -->
          <div class="flex-1 flex flex-col">
            <div class="px-4 py-2 bg-gray-50 dark:bg-wushai-black border-b border-gray-200 dark:border-gray-700">
              <span class="text-xs font-bold text-gray-500">معاينة</span>
            </div>
            <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <article class="prose dark:prose-invert max-w-none" [innerHTML]="previewHtml()"></article>
            </div>
          </div>
        </div>

        <!-- Editor Footer -->
        <div class="p-4 border-t border-wushai-sand dark:border-wushai-olive flex items-center justify-between bg-gray-50 dark:bg-wushai-black">
          <div class="flex items-center gap-4">
            <input #changeSummary type="text" placeholder="وصف التغييرات (اختياري)" 
              class="bg-white dark:bg-wushai-surface border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm w-64">
            <button (click)="generateSummary(contentInput.value)" class="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
              <span [innerHTML]="getIcon('Bot')" class="w-4 h-4"></span> توليد ملخص AI
            </button>
          </div>
          <div class="flex items-center gap-3">
            <button (click)="cancelEdit()" class="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-wushai-deep font-bold text-sm transition-colors">
              إلغاء
            </button>
            <button (click)="saveDocument(titleInput.value, contentInput.value, categorySelect.value, tagsInput.value, statusSelect.value, changeSummary.value)" 
              class="bg-wushai-dark hover:bg-wushai-black text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-lg">
              <span [innerHTML]="getIcon('Check')" class="w-4 h-4"></span> حفظ
            </button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; }
    .prose h1 { font-size: 1.75rem; margin-top: 1.5rem; }
    .prose h2 { font-size: 1.5rem; margin-top: 1.25rem; }
    .prose h3 { font-size: 1.25rem; margin-top: 1rem; }
    .prose code { background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; }
    .dark .prose code { background: #1f2937; }
  `]
})
export class KnowledgeBaseComponent implements OnInit {
  private knowledgeService = inject(KnowledgeService);
  private sanitizer = inject(DomSanitizer);
  private toastService = inject(ToastService);

  documents = this.knowledgeService.documents;
  selectedDocument = this.knowledgeService.selectedDocument;
  aiSuggestions = this.knowledgeService.aiSuggestions;
  categories = this.knowledgeService.categories;
  pinnedDocs = this.knowledgeService.pinnedDocs;

  mode = signal<ViewMode>('list');
  filterCategory = signal('All');
  filterStatus = signal('all');
  searchQuery = signal('');
  versions = signal<DocumentVersion[]>([]);
  previewHtml = signal<SafeHtml>('');

  filteredDocuments = computed(() => {
    let docs = this.documents();
    
    const cat = this.filterCategory();
    if (cat !== 'All') {
      docs = docs.filter(d => d.category === cat);
    }
    
    const status = this.filterStatus();
    if (status !== 'all') {
      docs = docs.filter(d => d.status === status);
    }
    
    const query = this.searchQuery().toLowerCase();
    if (query) {
      docs = docs.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.content.toLowerCase().includes(query) ||
        d.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    return docs;
  });

  renderedContent = computed(() => {
    const content = this.selectedDocument()?.content || '';
    return this.sanitizer.bypassSecurityTrustHtml(this.markdownToHtml(content));
  });

  ngOnInit() {
    this.knowledgeService.loadDocuments();
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  async selectDocument(doc: Document) {
    await this.knowledgeService.getDocument(doc.id);
    this.setMode('view');
    // Get AI suggestions
    this.knowledgeService.getAiSuggestions(doc.title + ' ' + doc.content.substring(0, 500));
  }

  setMode(newMode: ViewMode) {
    this.mode.set(newMode);
  }

  createNew() {
    this.knowledgeService.selectedDocument.set(null);
    this.previewHtml.set('');
    this.setMode('create');
  }

  cancelEdit() {
    if (this.selectedDocument()) {
      this.setMode('view');
    } else {
      this.setMode('list');
    }
  }

  async saveDocument(title: string, content: string, category: string, tagsStr: string, status: string, changeSummary: string) {
    if (!title.trim()) {
      this.toastService.show('العنوان مطلوب', 'error');
      return;
    }

    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

    if (this.mode() === 'create') {
      const newDoc = await this.knowledgeService.createDocument({
        title,
        content,
        category,
        tags,
        status: status as any
      });
      if (newDoc) {
        this.selectDocument(newDoc);
        this.toastService.show('تم إنشاء المستند', 'success');
      }
    } else if (this.mode() === 'edit' && this.selectedDocument()) {
      const success = await this.knowledgeService.updateDocument(
        this.selectedDocument()!.id,
        { title, content, category, tags, status: status as any },
        changeSummary
      );
      if (success) {
        this.setMode('view');
      }
    }
  }

  async deleteDocument() {
    if (this.selectedDocument() && confirm('هل أنت متأكد من حذف هذا المستند؟')) {
      const success = await this.knowledgeService.deleteDocument(this.selectedDocument()!.id);
      if (success) {
        this.knowledgeService.selectedDocument.set(null);
        this.setMode('list');
      }
    }
  }

  async togglePin() {
    if (!this.selectedDocument()) return;
    await this.knowledgeService.updateDocument(
      this.selectedDocument()!.id,
      { isPinned: !this.selectedDocument()!.isPinned }
    );
  }

  async showVersions() {
    if (!this.selectedDocument()) return;
    const vers = await this.knowledgeService.getVersions(this.selectedDocument()!.id);
    this.versions.set(vers);
    this.setMode('versions');
  }

  async restoreVersion(version: DocumentVersion) {
    if (confirm('هل تريد استعادة هذا الإصدار؟')) {
      await this.knowledgeService.restoreVersion(this.selectedDocument()!.id, version);
      this.setMode('view');
      this.toastService.show('تم استعادة الإصدار', 'success');
    }
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    if (query.trim()) {
      this.knowledgeService.search(query);
    }
  }

  updatePreview(content: string) {
    this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(this.markdownToHtml(content)));
  }

  async generateSummary(content: string) {
    this.toastService.show('جاري توليد الملخص...', 'info');
    const summary = await this.knowledgeService.generateSummary(content);
    // You could set this to a signal and display it
    this.toastService.show('تم توليد الملخص', 'success');
  }

  private markdownToHtml(md: string): string {
    return md
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">$1</code>')
      .replace(/```([^`]+)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4"><code>$1</code></pre>')
      .replace(/^\- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>')
      .replace(/^\> (.*$)/gm, '<blockquote class="border-r-4 border-wushai-olive pr-4 my-4 text-gray-600 dark:text-gray-400">$1</blockquote>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-wushai-olive hover:underline" target="_blank">$1</a>')
      .replace(/\n\n/g, '</p><p class="my-3">')
      .replace(/\n/g, '<br>');
  }
}
