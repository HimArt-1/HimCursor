import { Component, signal, effect, inject, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InventoryService, Product, Order, OrderItem, PRODUCT_CATEGORIES } from '../../core/services/domain/inventory.service';
import { Icons } from '../../shared/ui/icons';
import { FormsModule } from '@angular/forms';
import { PrintService } from '../../core/services/utils/print.service';

@Component({
    selector: 'app-booth',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="h-screen flex flex-col bg-[#fdfaf6] text-[#2c1810]">
        <!-- Header -->
        <header class="h-16 bg-white border-b border-[#e5e1da] px-6 flex items-center justify-between shadow-sm z-30">
            <div class="flex items-center gap-4">
                <button (click)="goBack()" class="p-2 hover:bg-[#f8f6f1] rounded-full transition-all">
                    <div [innerHTML]="getIcon('ChevronLeft')" class="w-6 h-6"></div>
                </button>
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-[#7A4E2D] rounded-xl flex items-center justify-center text-white shadow-lg">
                        <div [innerHTML]="getIcon('ShoppingCart')" class="w-6 h-6"></div>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold tracking-tight">واجهة البوث</h1>
                        <p class="text-[10px] text-[#a09c94] uppercase tracking-widest font-bold">WASHA CONTROL SYSTEM</p>
                    </div>
                </div>
            </div>

            <div class="flex flex-1 max-w-xl mx-8">
                <div class="relative w-full group">
                    <input 
                        #skuInput
                        type="search" 
                        [(ngModel)]="searchQuery"
                        (keyup.enter)="handleSearch()"
                        placeholder="ابحث بالاسم أو امسح الباركود..."
                        class="w-full bg-[#f8f6f1] border-2 border-transparent focus:border-[#7A4E2D] focus:bg-white rounded-2xl py-3 pr-12 pl-4 outline-none transition-all shadow-inner text-right"
                    />
                    <div class="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A4E2D] group-focus-within:scale-110 transition-transform">
                        <div [innerHTML]="getIcon('Search')" class="w-5 h-5"></div>
                    </div>
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <div [innerHTML]="getIcon('Barcode')" class="w-6 h-6 text-[#a09c94]"></div>
                        <span class="text-[10px] font-bold text-[#a09c94]">SCANNER READY</span>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <!-- View Mode Toggle -->
                <div class="flex bg-[#f8f6f1] p-1 rounded-xl border border-[#e5e1da]">
                    <button 
                        (click)="viewMode.set('grid')"
                        [class.bg-white]="viewMode() === 'grid'"
                        [class.shadow-sm]="viewMode() === 'grid'"
                        [class.text-[#7A4E2D]]="viewMode() === 'grid'"
                        class="p-2 rounded-lg transition-all text-[#a09c94] hover:text-[#7A4E2D]"
                        title="عرض شبكة"
                    >
                        <div [innerHTML]="getIcon('LayoutGrid')" class="w-5 h-5"></div>
                    </button>
                    <button 
                        (click)="viewMode.set('list')"
                        [class.bg-white]="viewMode() === 'list'"
                        [class.shadow-sm]="viewMode() === 'list'"
                        [class.text-[#7A4E2D]]="viewMode() === 'list'"
                        class="p-2 rounded-lg transition-all text-[#a09c94] hover:text-[#7A4E2D]"
                        title="عرض قائمة"
                    >
                        <div [innerHTML]="getIcon('LayoutList')" class="w-5 h-5"></div>
                    </button>
                </div>

                <div class="h-8 w-px bg-[#e5e1da]"></div>

                <div class="flex items-center gap-3">
                    <div class="text-right hidden xl:block">
                        <p class="text-xs text-[#a09c94] font-medium">الكاشير النشط</p>
                        <p class="text-sm font-bold text-[#7A4E2D]">أدمن وشّى</p>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7A4E2D] to-[#9c6a45] p-0.5 shadow-md">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Washa" class="w-full h-full rounded-full border-2 border-white" alt="avatar" />
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 flex overflow-hidden">
            <!-- Left Side: Product Browser -->
            <section class="flex-1 flex flex-col overflow-hidden">
                <!-- Category Tabs -->
                <div class="bg-white border-b border-[#e5e1da] px-6 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar z-20 shadow-sm">
                    <button 
                        (click)="activeCategory.set('الكل')"
                        [class.bg-[#7A4E2D]]="activeCategory() === 'الكل'"
                        [class.text-white]="activeCategory() === 'الكل'"
                        [class.border-[#7A4E2D]]="activeCategory() === 'الكل'"
                        class="px-5 py-2 rounded-full border border-[#e5e1da] text-sm font-bold transition-all whitespace-nowrap hover:border-[#7A4E2D] hover:text-[#7A4E2D]"
                        [class.hover:text-white]="activeCategory() === 'الكل'"
                    >
                        الكل
                    </button>
                    @for (cat of availableCategories(); track cat) {
                    <button 
                        (click)="activeCategory.set(cat)"
                        [class.bg-[#7A4E2D]]="activeCategory() === cat"
                        [class.text-white]="activeCategory() === cat"
                        [class.border-[#7A4E2D]]="activeCategory() === cat"
                        class="px-5 py-2 rounded-full border border-[#e5e1da] text-sm font-bold transition-all whitespace-nowrap hover:border-[#7A4E2D] hover:text-[#7A4E2D]"
                        [class.hover:text-white]="activeCategory() === cat"
                    >
                        {{ cat }}
                    </button>
                    }
                </div>

                <!-- Products Display Area -->
                <div class="flex-1 overflow-y-auto p-6 scroll-smooth bg-[#fdfaf6]">
                    @if (filteredProducts().length === 0) {
                        <div class="h-full flex flex-col items-center justify-center opacity-40 select-none text-center">
                            <div [innerHTML]="getIcon('Search')" class="w-20 h-20 mb-4 text-[#7A4E2D]"></div>
                            <p class="font-bold text-xl">لا توجد منتجات مطابقة</p>
                            <p class="text-sm mt-1">جرب تغيير التصنيف أو مسح الباركود</p>
                        </div>
                    }

                    @if (viewMode() === 'grid') {
                        <!-- Grid View -->
                        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            @for (product of filteredProducts(); track product.id) {
                            <div 
                                (click)="addToCart(product)"
                                class="group bg-white border border-[#e5e1da] rounded-2xl p-4 cursor-pointer hover:border-[#7A4E2D] hover:shadow-xl transition-all relative overflow-hidden active:scale-95 shadow-sm"
                            >
                                <div class="aspect-square bg-[#fdfaf6] rounded-xl mb-3 flex items-center justify-center group-hover:bg-[#fff9f2] transition-colors relative overflow-hidden">
                                    @if (product.imageUrl) {
                                        <img [src]="product.imageUrl" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    } @else {
                                        <div [innerHTML]="getIcon('Image')" class="w-12 h-12 text-[#e5e1da] group-hover:text-[#7A4E2D] transition-colors"></div>
                                    }
                                    <div class="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold text-[#7A4E2D] border border-[#7A4E2D30] shadow-sm">
                                        SKU: {{product.sku}}
                                    </div>
                                    @if (product.stock <= product.minStock) {
                                        <div class="absolute bottom-2 left-2 px-2 py-1 bg-red-500 text-white rounded-lg text-[9px] font-black animate-pulse">
                                            مخزون منخفض
                                        </div>
                                    }
                                </div>
                                <h3 class="font-bold text-sm mb-1 line-clamp-1 group-hover:text-[#7A4E2D] transition-colors">{{product.name}}</h3>
                                <div class="flex items-center justify-between mt-auto">
                                    <span class="text-[#7A4E2D] font-black text-lg">{{product.price}} <small class="font-normal text-[10px]">ر.س</small></span>
                                    <span class="text-[10px] px-2 py-1 rounded-md" [ngClass]="product.stock <= product.minStock ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'">
                                        مخزون: {{product.stock}}
                                    </span>
                                </div>
                                
                                <!-- Hover Action -->
                                <div class="absolute inset-0 bg-[#7A4E2D]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <div class="bg-white p-3 rounded-full shadow-lg translate-y-4 group-hover:translate-y-0 transition-transform">
                                        <div [innerHTML]="getIcon('Plus')" class="w-6 h-6 text-[#7A4E2D]"></div>
                                    </div>
                                </div>
                            </div>
                            }
                        </div>
                    } @else {
                        <!-- List View (Compact) -->
                        <div class="space-y-2 max-w-5xl mx-auto">
                            @for (product of filteredProducts(); track product.id) {
                            <div 
                                (click)="addToCart(product)"
                                class="flex items-center gap-4 bg-white border border-[#e5e1da] p-3 rounded-xl cursor-pointer hover:border-[#7A4E2D] hover:shadow-md transition-all active:scale-[0.99] group"
                            >
                                <div class="w-12 h-12 bg-[#fdfaf6] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#e5e1da]">
                                    @if (product.imageUrl) {
                                        <img [src]="product.imageUrl" class="w-full h-full object-cover" />
                                    } @else {
                                        <div [innerHTML]="getIcon('Image')" class="w-5 h-5 text-[#e5e1da]"></div>
                                    }
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-bold text-sm truncate uppercase tracking-tight">{{product.name}}</h3>
                                        <span class="text-[10px] text-[#a09c94] font-mono">#{{product.sku}}</span>
                                    </div>
                                    <span class="text-[10px] text-[#a09c94] font-bold">{{product.category}}</span>
                                </div>
                                <div class="text-right flex items-center gap-6">
                                    <div class="hidden sm:block">
                                        <p class="text-[10px] text-[#a09c94] font-bold uppercase">المخزون</p>
                                        <p class="text-xs font-black" [ngClass]="product.stock <= product.minStock ? 'text-red-500' : 'text-green-600'">
                                            {{product.stock}} {{ product.stock <= product.minStock ? '(منخفض!)' : '' }}
                                        </p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] text-[#a09c94] font-bold uppercase text-left">السعر</p>
                                        <p class="text-base font-black text-[#7A4E2D]">{{product.price}} <small class="text-[10px]">ر.س</small></p>
                                    </div>
                                    <div class="p-2 bg-[#f8f6f1] rounded-lg text-[#7A4E2D] group-hover:bg-[#7A4E2D] group-hover:text-white transition-colors">
                                        <div [innerHTML]="getIcon('Plus')" class="w-5 h-5"></div>
                                    </div>
                                </div>
                            </div>
                            }
                        </div>
                    }
                </div>
            </section>

            <!-- Right Side: Cart Sidebar -->
            <aside class="w-[400px] bg-white border-r border-[#e5e1da] flex flex-col shadow-2xl z-40">
                <div class="p-6 border-b border-[#e5e1da] flex items-center justify-between bg-[#fdfaf6]">
                    <div class="flex items-center gap-3">
                        <div [innerHTML]="getIcon('ShoppingCart')" class="w-6 h-6 text-[#7A4E2D]"></div>
                        <h2 class="font-bold text-lg">سلة المشتريات</h2>
                    </div>
                    <span class="px-3 py-1 bg-[#7A4E2D] text-white text-xs font-bold rounded-full shadow-md">
                        {{cart().length}} منتجات
                    </span>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    @if (cart().length === 0) {
                        <div class="h-full flex flex-col items-center justify-center opacity-30 select-none">
                            <div [innerHTML]="getIcon('ShoppingCart')" class="w-20 h-20 mb-4 text-[#7A4E2D]"></div>
                            <p class="font-bold text-lg">السلة فارغة</p>
                            <p class="text-sm mt-1">ابدأ بإضافة منتجات للبيع</p>
                        </div>
                    } @else {
                        @for (item of cart(); track item.productId) {
                        <div class="flex items-center gap-4 bg-[#fdfaf6] p-4 rounded-2xl border border-transparent hover:border-[#7A4E2D30] transition-all group animate-in fade-in slide-in-from-left-4 shadow-sm hover:shadow-md">
                            <div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center border border-white shadow-sm overflow-hidden flex-shrink-0">
                                @if (item.imageUrl) {
                                    <img [src]="item.imageUrl" class="w-full h-full object-cover" />
                                } @else {
                                    <div [innerHTML]="getIcon('Image')" class="w-6 h-6 text-[#e5e1da]"></div>
                                }
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-bold text-sm truncate mb-1">{{item.productName}}</h4>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2 bg-white rounded-lg p-1 border border-[#e5e1da] shadow-inner">
                                        <button (click)="updateQty(item, -1)" class="w-6 h-6 flex items-center justify-center hover:bg-red-50 text-red-500 rounded transition-colors">-</button>
                                        <span class="w-6 text-center text-xs font-bold">{{item.quantity}}</span>
                                        <button (click)="updateQty(item, 1)" class="w-6 h-6 flex items-center justify-center hover:bg-green-50 text-green-500 rounded transition-colors">+</button>
                                    </div>
                                    <span class="font-bold text-[#7A4E2D] text-sm">{{(item.price * item.quantity).toFixed(2)}} ر.س</span>
                                </div>
                            </div>
                            <button (click)="removeFromCart(item)" class="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 text-red-400 rounded-lg">
                                <div [innerHTML]="getIcon('Trash')" class="w-4 h-4"></div>
                            </button>
                        </div>
                        }
                    }
                </div>

                <!-- Footer Summary -->
                <div class="p-6 bg-[#fdfaf6] border-t border-[#e5e1da] shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                    <div class="space-y-3 mb-6">
                        <div class="flex justify-between text-[#a09c94] text-sm font-medium">
                            <span>المجموع الفرعي</span>
                            <span>{{subtotal().toFixed(2)}} ر.س</span>
                        </div>
                        <div class="flex justify-between text-[#a09c94] text-sm font-medium">
                            <span>الضريبة (15%)</span>
                            <span>{{tax().toFixed(2)}} ر.س</span>
                        </div>
                        <div class="flex justify-between items-center bg-white p-4 rounded-xl border-2 border-[#7A4E2D20] shadow-xl -mx-2">
                            <span class="font-bold text-lg text-[#7A4E2D]">الإجمالي النهائي</span>
                            <span class="font-black text-2xl text-[#7A4E2D]">{{total().toFixed(2)}} ر.س</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <button 
                            (click)="completeOrder('thermal')"
                            [disabled]="cart().length === 0"
                            class="flex flex-col items-center justify-center gap-2 bg-white border-2 border-[#7A4E2D10] py-4 rounded-2xl hover:border-[#7A4E2D] hover:bg-[#fffdfb] transition-all disabled:opacity-50 group active:scale-95 shadow-sm"
                        >
                            <div [innerHTML]="getIcon('Printer')" class="w-6 h-6 text-[#7A4E2D] group-hover:scale-110 transition-transform"></div>
                            <span class="font-bold text-xs">حرارية (80mm)</span>
                        </button>
                        <button 
                            (click)="completeOrder('pdf')"
                            [disabled]="cart().length === 0"
                            class="flex flex-col items-center justify-center gap-2 bg-white border-2 border-[#7A4E2D10] py-4 rounded-2xl hover:border-[#7A4E2D] hover:bg-[#fffdfb] transition-all disabled:opacity-50 group active:scale-95 shadow-sm"
                        >
                            <div [innerHTML]="getIcon('File')" class="w-6 h-6 text-[#7A4E2D] group-hover:scale-110 transition-transform"></div>
                            <span class="font-bold text-xs">فاتورة PDF</span>
                        </button>
                    </div>

                    <button 
                        (click)="completeOrder('whatsapp')"
                        [disabled]="cart().length === 0"
                        class="w-full mt-3 flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-[#25D36640] hover:scale-[1.01] transition-all disabled:opacity-50 group active:scale-95"
                    >
                        <div [innerHTML]="getIcon('WhatsApp')" class="w-6 h-6 fill-white"></div>
                        <span>إرسال عبر الواتساب</span>
                    </button>
                    
                    <button 
                        (click)="clearCart()"
                        class="w-full mt-3 py-2 text-[#a09c94] text-[10px] font-bold hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
                    >
                        إلغاء السلة بالكامل
                    </button>
                </div>
            </aside>
        </main>
        
        <!-- Post-Order Actions Modal -->
        @if (lastOrder()) {
            <div class="fixed inset-0 bg-[#2c1810]/70 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div class="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95">
                    <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#7A4E2D] to-[#9c6a45]"></div>
                    <div class="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <div [innerHTML]="getIcon('Check')" class="w-12 h-12"></div>
                    </div>
                    <h2 class="text-3xl font-black mb-2 text-[#7A4E2D]">تم الطلب بنجاح!</h2>
                    <p class="text-[#a09c94] mb-8 font-medium">رقم العملية: # {{lastOrder()?.orderNumber}}</p>
                    
                    <div class="grid grid-cols-1 gap-3">
                        <button (click)="printLastOrder('pdf')" class="flex items-center justify-center gap-3 w-full bg-[#fdfaf6] py-5 rounded-[24px] font-bold text-[#7A4E2D] hover:bg-[#7A4E2D] hover:text-white transition-all group border-2 border-[#7A4E2D10]">
                             <div [innerHTML]="getIcon('File')" class="w-6 h-6 group-hover:rotate-12 transition-transform"></div>
                             تحميل الفاتورة PDF
                        </button>
                        <button (click)="printLastOrder('whatsapp')" class="flex items-center justify-center gap-3 w-full bg-[#E9FBEF] py-5 rounded-[24px] font-bold text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all group border-2 border-[#25D36610]">
                             <div [innerHTML]="getIcon('WhatsApp')" class="w-6 h-6 group-hover:scale-110 transition-transform"></div>
                             مشاركة عبر واتساب
                        </button>
                        <button (click)="closeOrderModal()" class="w-full mt-6 py-4 text-[#a09c94] font-black border-2 border-transparent hover:border-[#e5e1da] rounded-2xl transition-all uppercase tracking-widest text-xs">
                            إغلاق والبدء بطلب جديد
                        </button>
                    </div>
                </div>
            </div>
        }
    </div>
    `,
    styles: [`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e1da; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #7A4E2D30; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        :host { display: block; }
        
        .line-clamp-1 {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    `]
})
export class BoothComponent {
    private inventoryService = inject(InventoryService);
    private printService = inject(PrintService);
    private sanitizer = inject(DomSanitizer);
    private location = inject(Location);

    @ViewChild('skuInput') skuInput!: ElementRef<HTMLInputElement>;

    searchQuery = '';
    activeCategory = signal<string>('الكل');
    viewMode = signal<'grid' | 'list'>('grid');
    cart = signal<any[]>([]);
    lastOrder = signal<Order | null>(null);

    // Dynamic Categories from available products
    availableCategories = computed(() => {
        const prodCategories = this.inventoryService.products()
            .map(p => p.category)
            .filter((v, i, a) => a.indexOf(v) === i && !!v);
        return prodCategories.sort();
    });

    // Filtered products computed from inventory service + current filters
    filteredProducts = computed(() => {
        const query = this.searchQuery.toLowerCase().trim();
        const activeCat = this.activeCategory();
        let products = this.inventoryService.products().filter(p => p.isActive);
        
        // Category Filter
        if (activeCat !== 'الكل') {
            products = products.filter(p => p.category === activeCat);
        }

        // Search Filter
        if (query) {
            products = products.filter(p => 
                p.name.toLowerCase().includes(query) || 
                p.sku.toLowerCase().includes(query) ||
                (p.category && p.category.toLowerCase().includes(query))
            );
        }

        return products;
    });

    subtotal = computed(() => this.cart().reduce((acc, item) => acc + (item.price * item.quantity), 0));
    tax = computed(() => this.subtotal() * 0.15);
    total = computed(() => this.subtotal() + this.tax());

    constructor() {
        // Auto-focus barcode input
        effect(() => {
            if (this.skuInput) {
                this.skuInput.nativeElement.focus();
            }
        });
    }

    getIcon(name: keyof typeof Icons): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
    }

    goBack() {
        this.location.back();
    }

    handleSearch() {
        if (!this.searchQuery) return;
        const query = this.searchQuery.trim();
        
        // Exact SKU Match (Force Add to Cart)
        const product = this.inventoryService.getProductBySku(query);
        if (product) {
            this.addToCart(product);
            this.searchQuery = '';
        }
    }

    addToCart(product: Product) {
        if (product.stock <= 0) {
            alert(`⚠️ المنتج "${product.name}" غير متوفر في المخزون`);
            return;
        }

        this.cart.update(current => {
            const existing = current.find(i => i.productId === product.id);
            if (existing) {
                return current.map(i => i.productId === product.id 
                    ? { ...i, quantity: i.quantity + 1 } 
                    : i
                );
            }
            return [...current, {
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity: 1,
                imageUrl: product.imageUrl
            }];
        });
    }

    removeFromCart(item: any) {
        this.cart.update(current => current.filter(i => i.productId !== item.productId));
    }

    updateQty(item: any, delta: number) {
        this.cart.update(current => {
            return current.map(i => {
                if (i.productId === item.productId) {
                    const newQty = i.quantity + delta;
                    if (newQty <= 0) return null;
                    return { ...i, quantity: newQty };
                }
                return i;
            }).filter(Boolean);
        });
    }

    clearCart() {
        if (this.cart().length > 0 && confirm('هل أنت متأكد من إلغاء السلة بالكامل؟')) {
            this.cart.set([]);
        }
    }

    async completeOrder(type: 'thermal' | 'pdf' | 'whatsapp') {
        if (this.cart().length === 0) return;

        // Map to InventoryService OrderItem model
        const orderItems: OrderItem[] = this.cart().map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.price * item.quantity
        }));

        // Use InventoryService to create order and deduct stock
        const order = await this.inventoryService.createOrder({
            items: orderItems,
            subtotal: this.subtotal(),
            tax: this.tax(),
            total: this.total(),
            customerName: 'عميل البوث',
            notes: `تم البيع عبر واجهة البوث (${type})`
        });

        if (!order) return;

        this.lastOrder.set(order);

        // Immediate Action
        if (type === 'thermal') {
            const html = this.printService.generateThermalHtml(order);
            this.printService.print(html);
        } else if (type === 'pdf') {
            const html = this.printService.generatePdfHtml(order);
            this.printService.print(html);
        } else if (type === 'whatsapp') {
            this.printService.shareViaWhatsApp(order);
        }

        // Reset Cart
        this.cart.set([]);
    }

    printLastOrder(type: 'pdf' | 'whatsapp') {
        const order = this.lastOrder();
        if (!order) return;
        
        if (type === 'pdf') {
            const html = this.printService.generatePdfHtml(order);
            this.printService.print(html);
        } else if (type === 'whatsapp') {
            this.printService.shareViaWhatsApp(order);
        }
    }

    closeOrderModal() {
        this.lastOrder.set(null);
        setTimeout(() => this.skuInput?.nativeElement.focus(), 100);
    }
}
