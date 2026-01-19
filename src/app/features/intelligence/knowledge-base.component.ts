
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, KnowledgeArticle } from '../../core/services/state/data.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { ToastService } from '../../core/services/state/toast.service';

type ViewMode = 'view' | 'edit' | 'create' | 'empty';

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col space-y-6 animate-fade-in">
      <header>
         <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand flex items-center gap-3">
           <span [innerHTML]="getIcon('BookOpen')"></span>
           مركز المعرفة (Knowledge Base)
         </h2>
         <p class="text-wushai-olive mt-2">المصدر الموثوق لتوثيق المشروع والمعلومات الهامة.</p>
      </header>

      <div class="flex-1 flex gap-8 min-h-0">
        <!-- Articles Sidebar -->
        <aside class="w-1/4 bg-white dark:bg-wushai-black dark:border-wushai-olive border border-wushai-sand rounded-2xl shadow-sm p-4 flex flex-col">
           <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-wushai-dark dark:text-wushai-sand">المقالات</h3>
              <button (click)="createNew()" class="bg-wushai-olive text-white p-2 rounded-lg hover:bg-wushai-dark transition-colors">
                 <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span>
              </button>
           </div>
           <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
              @for(article of articles(); track article.id) {
                 <div (click)="selectArticle(article)" 
                      class="p-3 rounded-lg cursor-pointer transition-colors"
                      [class.bg-wushai-sand]="selectedArticle()?.id === article.id"
                      [class.dark:bg-wushai-deep]="selectedArticle()?.id === article.id"
                      [class.hover:bg-gray-50]="selectedArticle()?.id !== article.id"
                      [class.dark:hover:bg-wushai-deep/50]="selectedArticle()?.id !== article.id">
                    <p class="font-bold text-sm text-wushai-dark dark:text-wushai-sand truncate">{{ article.title }}</p>
                    <p class="text-xs text-gray-400 mt-1">Updated {{ article.updatedAt | date:'shortDate' }}</p>
                 </div>
              }
              @if(articles().length === 0) {
                 <div class="text-center text-xs text-gray-400 p-4">لا توجد مقالات.</div>
              }
           </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 bg-white dark:bg-wushai-black dark:border-wushai-olive border border-wushai-sand rounded-2xl shadow-sm overflow-hidden flex flex-col">
           @switch(mode()) {
              @case('view') {
                 <div class="flex-1 flex flex-col min-h-0">
                    <!-- View Header -->
                    <div class="p-6 border-b border-wushai-sand dark:border-wushai-olive flex justify-between items-center bg-gray-50 dark:bg-wushai-deep/20">
                       <div>
                          <h2 class="text-2xl font-bold text-wushai-dark dark:text-wushai-sand">{{ selectedArticle()?.title }}</h2>
                          <p class="text-xs text-gray-500 mt-1">
                             آخر تحديث في {{ selectedArticle()?.updatedAt | date:'medium' }}
                          </p>
                       </div>
                       <div class="flex gap-2">
                          <button (click)="setMode('edit')" class="bg-wushai-olive hover:bg-wushai-dark text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
                             <span [innerHTML]="getIcon('Edit')"></span> تعديل
                          </button>
                          <button (click)="deleteArticle()" class="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
                             <span [innerHTML]="getIcon('Trash')"></span>
                          </button>
                       </div>
                    </div>
                    <!-- View Content -->
                    <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
                       <article class="prose dark:prose-invert max-w-none" [innerHTML]="renderedContent()"></article>
                    </div>
                 </div>
              }
              @case('edit') { @defer { <ng-container *ngTemplateOutlet="editorTemplate"></ng-container> } }
              @case('create') { @defer { <ng-container *ngTemplateOutlet="editorTemplate"></ng-container> } }
              @case('empty') {
                 <div class="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-8">
                    <span [innerHTML]="getIcon('BookOpen')" class="w-16 h-16 opacity-30 mb-4"></span>
                    <h3 class="font-bold text-lg">مرحباً بك في مركز المعرفة</h3>
                    <p>اختر مقالاً من القائمة للبدء، أو قم بإنشاء مقال جديد.</p>
                 </div>
              }
           }
        </main>
      </div>
    </div>
    
    <!-- Editor Template -->
    <ng-template #editorTemplate>
      <div class="flex-1 flex flex-col min-h-0 animate-fade-in">
         <div class="p-6 border-b border-wushai-sand dark:border-wushai-olive bg-gray-50 dark:bg-wushai-deep/20">
             <input #titleInput type="text" placeholder="عنوان المقال..." [value]="selectedArticle()?.title || ''"
                    class="w-full bg-transparent text-2xl font-bold text-wushai-dark dark:text-wushai-sand outline-none border-none p-0">
         </div>
         <div class="flex-1 p-2">
             <textarea #contentInput placeholder="اكتب محتوى المقال هنا... (يدعم الماركداون)"
                       class="w-full h-full bg-transparent outline-none border-none resize-none p-6 text-base font-mono leading-relaxed"
                       >{{ selectedArticle()?.content || '' }}</textarea>
         </div>
         <div class="p-4 border-t border-wushai-sand dark:border-wushai-olive flex justify-end gap-4 bg-gray-50 dark:bg-wushai-deep/20">
            <button (click)="cancelEdit()" class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-6 py-2 rounded-lg text-sm transition-colors">إلغاء</button>
            <button (click)="saveArticle(titleInput.value, contentInput.value)" class="bg-wushai-dark hover:bg-wushai-black text-white font-bold px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
               <span [innerHTML]="getIcon('Check')"></span> حفظ
            </button>
         </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #EBE5D9; border-radius: 4px; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #3E3230; }
  `]
})
export class KnowledgeBaseComponent {
  private dataService = inject(DataService);
  private sanitizer = inject(DomSanitizer);
  private toastService = inject(ToastService);

  articles = this.dataService.knowledgeArticles;
  selectedArticle = signal<KnowledgeArticle | null>(null);
  mode = signal<ViewMode>('empty');

  constructor() {
    // Select the first article on load if available
    if (this.articles().length > 0) {
      this.selectArticle(this.articles()[0]);
    }
  }

  renderedContent = computed(() => {
    const content = this.selectedArticle()?.content || '';
    // Basic Markdown to HTML
    let html = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>') // Basic lists, needs improvement for multi-line
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  selectArticle(article: KnowledgeArticle) {
    this.selectedArticle.set(article);
    this.setMode('view');
  }

  setMode(newMode: ViewMode) {
    this.mode.set(newMode);
  }

  createNew() {
    this.selectedArticle.set(null); // Clear selection
    this.setMode('create');
  }

  cancelEdit() {
    if (this.selectedArticle()) {
      this.setMode('view');
    } else {
      this.setMode('empty');
    }
  }

  saveArticle(title: string, content: string) {
    if (!title.trim() || !content.trim()) {
      this.toastService.show('العنوان والمحتوى مطلوبان', 'error');
      return;
    }
    const user = this.dataService.currentUser();
    if (!user) return; // Should not happen

    if (this.mode() === 'create') {
      const newArticle: KnowledgeArticle = {
        id: `KB-${Date.now()}`,
        title,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorId: user.id
      };
      this.dataService.addKnowledgeArticle(newArticle);
      this.selectArticle(newArticle);
      this.toastService.show('تم إنشاء المقال بنجاح', 'success');
    } else if (this.mode() === 'edit' && this.selectedArticle()) {
      this.dataService.updateKnowledgeArticle(this.selectedArticle()!.id, { title, content });
      // The signal will update automatically via the service
      this.setMode('view');
      this.toastService.show('تم حفظ التغييرات', 'success');
    }
  }

  deleteArticle() {
    if (this.selectedArticle() && confirm('هل أنت متأكد من حذف هذا المقال؟')) {
      this.dataService.deleteKnowledgeArticle(this.selectedArticle()!.id);
      this.selectedArticle.set(null);
      this.setMode('empty');
      this.toastService.show('تم حذف المقال', 'info');
    }
  }
}
