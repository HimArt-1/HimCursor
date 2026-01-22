
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService, Asset } from '../../core/services/state/data.service'; // Ensure Asset is imported
import { AssetsService } from '../../core/services/domain/assets.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';

@Component({
   selector: 'app-assets',
   standalone: true,
   imports: [CommonModule, FormsModule],
   template: `
    <div class="h-full flex flex-col space-y-6 animate-fade-in pb-10">
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 class="text-3xl font-bold text-wushai-dark dark:text-wushai-sand">أصول وشّى (Brand Assets)</h2>
           <p class="text-wushai-olive mt-2">الهوية البصرية، الملفات، والأدلة الإرشادية.</p>
        </div>
        
        <div class="flex items-center gap-4">
           <!-- Filter Tabs -->
           <div class="flex bg-white dark:bg-wushai-black border border-wushai-sand rounded-xl p-1 shadow-sm">
             @for(type of ['All', 'Image', 'Font', 'Guide', 'Mockup']; track type) {
               <button (click)="activeFilter.set(type)" 
                  class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
                  [ngClass]="activeFilter() === type ? 'bg-wushai-olive text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-wushai-deep/50'">
                  {{ type }}
               </button>
             }
           </div>

           <button (click)="triggerFileInput()" 
              class="bg-wushai-dark hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
              <span [innerHTML]="getIcon('Plus')"></span> رفع ملف
           </button>
           <input type="file" #fileInput hidden (change)="handleFileUpload($event)" accept="image/*,.pdf,.ttf,.otf">
        </div>
      </header>

      <!-- Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (asset of filteredAssets(); track asset.id) {
          <div class="group bg-white dark:bg-wushai-black dark:border-wushai-olive rounded-2xl border border-wushai-sand overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 relative">
            <!-- Delete Button -->
            <button (click)="deleteAsset(asset.id, $event)" class="absolute top-2 right-2 z-20 p-1.5 bg-white/80 dark:bg-black/50 rounded-full text-red-500 hover:text-red-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-all">
                <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
            </button>

            <div class="h-40 bg-wushai-sand/20 dark:bg-wushai-olive/10 flex items-center justify-center relative overflow-hidden"
                 (click)="previewAsset(asset)">
               @if(asset.type === 'Image' || asset.type === 'Mockup') {
                 <img [src]="asset.url" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="">
               } @else {
                 <div class="flex flex-col items-center gap-2">
                   <div class="text-wushai-olive opacity-50 scale-150" [innerHTML]="getIcon(getIconForType(asset.type))"></div>
                   <span class="text-xs font-mono text-gray-500 mt-2">{{ asset.type }} File</span>
                 </div>
               }
               <!-- Overlay Action -->
               <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button class="p-2 bg-white rounded-full text-wushai-dark hover:scale-110 transition-transform shadow-lg" title="Open Studio">
                    <span class="w-4 h-4" [innerHTML]="getIcon('Edit')"></span>
                  </button>
               </div>
            </div>
            
            <div class="p-4">
               <div class="flex justify-between items-start">
                 <h3 class="font-bold text-wushai-dark dark:text-wushai-sand truncate pr-2 text-sm">{{ asset.title }}</h3>
                 <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-wushai-light dark:bg-wushai-olive dark:text-wushai-light text-wushai-olive border border-wushai-sand">{{ asset.type }}</span>
               </div>
               <div class="mt-3 flex items-center justify-between">
                  <p class="text-xs text-wushai-olive dark:text-wushai-sand/70 flex items-center gap-1 bg-gray-50 dark:bg-wushai-deep px-2 py-1 rounded-full">
                    <span class="w-1.5 h-1.5 rounded-full bg-wushai-brown"></span> {{ asset.tag }}
                  </p>
                  <span class="text-[10px] text-gray-400 font-mono">{{ asset.size || 'Unknown' }}</span>
               </div>
            </div>
          </div>
        }
        
        <!-- Add New Placeholder Card -->
        <button (click)="triggerFileInput()" class="rounded-2xl border-2 border-dashed border-wushai-sand dark:border-wushai-olive hover:border-wushai-olive hover:bg-wushai-light/50 dark:hover:bg-wushai-olive/10 transition-all flex flex-col items-center justify-center h-full min-h-[250px] group text-gray-400 hover:text-wushai-olive">
           <div class="p-4 rounded-full bg-gray-50 dark:bg-wushai-deep group-hover:scale-110 transition-transform mb-3">
             <span [innerHTML]="getIcon('Plus')"></span>
           </div>
           <span class="font-bold text-sm">رفع أصل جديد</span>
           <span class="text-xs mt-1 text-gray-400">Max 2MB</span>
        </button>
      </div>

      <!-- Studio / Preview Modal -->
      @if (selectedAsset()) {
         <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in" (click)="closeModal()">
            <button class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors" (click)="closeModal()">
               <span [innerHTML]="getIcon('X')" class="w-8 h-8"></span>
            </button>
            
            <div class="max-w-6xl w-full flex flex-col md:flex-row gap-6 items-center justify-center h-full max-h-[90vh]" (click)="$event.stopPropagation()">
               
               <!-- Image Canvas Area -->
               <div class="flex-1 w-full h-full flex items-center justify-center bg-gray-900/50 rounded-2xl border border-gray-700 overflow-hidden relative">
                  @if(selectedAsset()?.type === 'Image' || selectedAsset()?.type === 'Mockup') {
                     <img [src]="selectedAsset()?.url" 
                          class="max-w-full max-h-full object-contain transition-all duration-300"
                          [style.filter]="getFilters()"
                          [style.transform]="getTransform()"
                          alt="">
                     
                     <!-- Studio Badge -->
                     <div class="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-2 border border-white/10">
                        <span [innerHTML]="getIcon('Edit')" class="w-3 h-3"></span> Studio Mode
                     </div>
                  } @else {
                      <div class="flex flex-col items-center">
                         <div class="text-white scale-150 mb-4" [innerHTML]="getIcon(getIconForType(selectedAsset()!.type))"></div>
                         <p class="text-white font-bold">Preview not available for this type</p>
                      </div>
                  }
               </div>

               <!-- Controls Sidebar (Only for Images) -->
               @if(selectedAsset()?.type === 'Image' || selectedAsset()?.type === 'Mockup') {
                   <div class="w-full md:w-80 bg-white dark:bg-wushai-black rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
                      <div class="border-b pb-4">
                         <h3 class="font-bold text-wushai-dark dark:text-white mb-1">{{ selectedAsset()?.title }}</h3>
                         <p class="text-xs text-gray-500">Image Adjustment</p>
                      </div>

                      <div class="space-y-4">
                         <div>
                            <div class="flex justify-between text-xs font-bold text-gray-500 mb-2">
                               <span>Brightness</span>
                               <span>{{ editState.brightness }}%</span>
                            </div>
                            <input type="range" min="0" max="200" [(ngModel)]="editState.brightness" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-wushai-olive">
                         </div>

                         <div>
                            <div class="flex justify-between text-xs font-bold text-gray-500 mb-2">
                               <span>Contrast</span>
                               <span>{{ editState.contrast }}%</span>
                            </div>
                            <input type="range" min="0" max="200" [(ngModel)]="editState.contrast" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-wushai-olive">
                         </div>

                         <div>
                            <div class="flex justify-between text-xs font-bold text-gray-500 mb-2">
                               <span>Grayscale</span>
                               <span>{{ editState.grayscale }}%</span>
                            </div>
                            <input type="range" min="0" max="100" [(ngModel)]="editState.grayscale" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-wushai-olive">
                         </div>
                      </div>

                      <div class="grid grid-cols-2 gap-3 pt-4 border-t">
                         <button (click)="rotate(90)" class="flex items-center justify-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-bold transition-colors">
                            <span [innerHTML]="getIcon('Rotate')"></span> Rotate
                         </button>
                         <button (click)="resetEdit()" class="flex items-center justify-center gap-2 p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-bold transition-colors">
                            Reset
                         </button>
                      </div>
                      
                      <button (click)="closeModal()" class="w-full bg-wushai-dark text-white py-3 rounded-xl font-bold shadow-lg mt-auto">
                         Done
                      </button>
                   </div>
               }
            </div>
         </div>
      }
    </div>
  `
})
export class AssetsComponent {
   private assetsService = inject(DataService);
   private sanitizer = inject(DomSanitizer);

   assets = this.assetsService.assets;

   showModal = signal(false);
   isDragging = signal(false);

   activeFilter = signal('All');
   searchQuery = signal('');

   selectedAsset = signal<Asset | null>(null);

   // Editing State
   editState = {
      brightness: 100,
      contrast: 100,
      grayscale: 0,
      rotate: 0
   };

   // Computed Filtered Assets
   filteredAssets = computed(() => {
      let data = this.assets();
      if (this.activeFilter() !== 'All') {
         data = data.filter(a => a.type === this.activeFilter());
      }
      if (this.searchQuery()) {
         const q = this.searchQuery().toLowerCase();
         data = data.filter(a => a.title.toLowerCase().includes(q) || a.tag?.toLowerCase().includes(q));
      }
      return data;
   });

   getIcon(name: keyof typeof Icons): SafeHtml {
      return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
   }

   getIconForType(type: string): string {
      switch (type) {
         case 'Image': return 'Image';
         case 'Mockup': return 'Image';
         case 'Font': return 'Code';
         case 'Guide': return 'List';
         default: return 'Code';
      }
   }

   // Drag & Drop
   onDragOver(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging.set(true);
   }

   onDragLeave(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging.set(false);
   }

   onDrop(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging.set(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
         this.handleFiles(e.dataTransfer.files);
      }
   }

   handleFiles(files: FileList) {
      Array.from(files).forEach(file => {
         if (file.size > 2 * 1024 * 1024) {
            alert(`الملف ${file.name} كبير جداً. الحد الأقصى هو 2 ميجابايت.`);
            return;
         }

         const reader = new FileReader();
         reader.onload = (e) => {
            const result = e.target?.result as string;
            this.assetsService.addAsset({
               id: `AST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
               title: file.name,
               type: this.mapFileType(file.type, file.name),
               url: result,
               tag: 'Upload',
               size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
            });
         };
         reader.readAsDataURL(file);
      });
   }

   mapFileType(mime: string, filename: string): 'Image' | 'Font' | 'Guide' | 'Mockup' {
      if (mime.startsWith('image/')) return 'Image';
      if (filename.endsWith('.ttf') || filename.endsWith('.otf')) return 'Font';
      if (mime === 'application/pdf') return 'Guide';
      return 'Guide';
   }

   triggerFileInput() {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) input.click();
   }

   handleFileUpload(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
         this.handleFiles(input.files);
      }
   }

   deleteAsset(id: string, event: Event) {
      event.stopPropagation();
      if (confirm('هل أنت متأكد من حذف هذا الملف؟')) {
         this.assetsService.deleteAsset(id);
      }
   }

   previewAsset(asset: Asset) {
      this.selectedAsset.set(asset);
      this.resetEdit();
   }

   closeModal() {
      this.selectedAsset.set(null);
   }

   // --- Studio Logic ---
   getFilters() {
      return `brightness(${this.editState.brightness}%) contrast(${this.editState.contrast}%) grayscale(${this.editState.grayscale}%)`;
   }

   getTransform() {
      return `rotate(${this.editState.rotate}deg)`;
   }

   rotate(deg: number) {
      this.editState.rotate = (this.editState.rotate + deg) % 360;
   }

   resetEdit() {
      this.editState = { brightness: 100, contrast: 100, grayscale: 0, rotate: 0 };
   }
}

