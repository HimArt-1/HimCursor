import {
    Component,
    signal,
    effect,
    inject,
    computed,
    ElementRef,
    ViewChild,
    OnInit,
    OnDestroy,
    afterNextRender
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InventoryService, Product, Order, OrderItem } from '../../core/services/domain/inventory.service';
import { Icons } from '../../shared/ui/icons';
import { FormsModule } from '@angular/forms';
import { PrintService } from '../../core/services/utils/print.service';
import { BarcodeScannerComponent } from '../../shared/ui/barcode-scanner.component';
import { AuthService } from '../../core/services/domain/auth.service';

interface BoothCartLine {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

interface HeldCartSnapshot {
    id: string;
    savedAt: string;
    cart: BoothCartLine[];
    customerName: string;
    customerPhone: string;
}

@Component({
    selector: 'app-booth',
    standalone: true,
    imports: [CommonModule, FormsModule, BarcodeScannerComponent],
    host: {
        '(document:keydown)': 'onDocumentKeydown($event)'
    },
    template: `
    <div class="h-screen flex flex-col bg-[#f8f6f2] text-[#2c1810] selection:bg-[#7A4E2D20] selection:text-[#7A4E2D]">
        <!-- Glassmorphism Background Decoration -->
        <div class="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7A4E2D] opacity-[0.03] blur-[100px] pointer-events-none rounded-full"></div>
        <div class="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7A4E2D] opacity-[0.03] blur-[100px] pointer-events-none rounded-full"></div>

        <!-- Header -->
        <header class="h-20 bg-white/80 backdrop-blur-xl border-b border-[#7A4E2D10] px-8 flex items-center justify-between shadow-[0_4px_20px_rgba(122,78,45,0.05)] z-30">
            <div class="flex items-center gap-6">
                <button (click)="goBack()" class="w-12 h-12 flex items-center justify-center hover:bg-[#7A4E2D10] text-[#7A4E2D] rounded-2xl transition-all active:scale-90 border border-transparent hover:border-[#7A4E2D20]">
                    <div [innerHTML]="getIcon('ChevronLeft')" class="w-7 h-7"></div>
                </button>
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-[#7A4E2D] to-[#5d3c22] rounded-2xl flex items-center justify-center text-white shadow-[0_10px_20px_rgba(122,78,45,0.3)] rotate-3">
                        <div [innerHTML]="getIcon('ShoppingCart')" class="w-6 h-6"></div>
                    </div>
                    <div>
                        <h1 class="text-2xl font-black tracking-tight bg-gradient-to-r from-[#2c1810] to-[#7A4E2D] bg-clip-text text-transparent">كاشير وشّى</h1>
                        <p class="text-[9px] text-[#a09c94] uppercase tracking-[0.3em] font-black opacity-60">واجهة بيع سريعة · F2 للبحث</p>
                    </div>
                </div>
            </div>

            <div class="flex flex-1 max-w-2xl mx-12">
                <div class="relative w-full group">
                    <input 
                        #skuInput
                        type="search" 
                        [(ngModel)]="searchQuery"
                        (keyup.enter)="handleSearch()"
                        placeholder="ابحث بالاسم أو امسح الباركود..."
                        class="w-full bg-[#fdfaf6] border-2 border-[#7A4E2D08] focus:border-[#7A4E2D] focus:bg-white rounded-[24px] py-4 pr-14 pl-4 outline-none transition-all shadow-inner text-right font-medium placeholder:text-[#a09c94/40]"
                    />
                    <div class="absolute right-5 top-1/2 -translate-y-1/2 text-[#7A4E2D] group-focus-within:scale-110 transition-transform">
                        <div [innerHTML]="getIcon('Search')" class="w-6 h-6 opacity-40"></div>
                    </div>
                    <div (click)="showScanner.set(true)" 
                        class="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-[#7A4E2D10] hover:bg-[#7A4E2D] hover:text-white group/scan px-4 py-2 rounded-xl transition-all active:scale-95 z-10 pointer-events-auto overflow-hidden">
                        <div [innerHTML]="getIcon('Barcode')" class="w-5 h-5 text-[#7A4E2D] group-hover/scan:text-white transition-colors"></div>
                        <span class="text-[10px] font-black tracking-tighter transition-colors">مسح باركود</span>
                        <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/scan:translate-x-[100%] transition-transform duration-500 skew-x-12"></div>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <button type="button"
                        (click)="cartPanelOpen.set(true)"
                        class="lg:hidden relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7A4E2D] text-white shadow-lg shadow-[#7A4E2D]/25 active:scale-95 transition-transform">
                    <div [innerHTML]="getIcon('ShoppingCart')" class="w-5 h-5"></div>
                    <span class="text-xs font-black">السلة</span>
                    @if (cart().length > 0) {
                        <span class="absolute -top-1.5 -end-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-emerald-500 text-[10px] font-black flex items-center justify-center border-2 border-white">{{ cart().length }}</span>
                    }
                </button>
                <!-- View Mode Toggle -->
                <div class="flex bg-[#fdfaf6] p-1.5 rounded-2xl border border-[#7A4E2D08] shadow-inner">
                    <button 
                        (click)="viewMode.set('grid')"
                        [class.bg-white]="viewMode() === 'grid'"
                        [class.shadow-md]="viewMode() === 'grid'"
                        [class.text-[#7A4E2D]]="viewMode() === 'grid'"
                        class="px-4 py-2 rounded-xl transition-all text-[#a09c94] hover:text-[#7A4E2D] flex items-center gap-2"
                    >
                        <div [innerHTML]="getIcon('LayoutGrid')" class="w-5 h-5"></div>
                        <span class="text-[10px] font-bold">شبكة</span>
                    </button>
                    <button 
                        (click)="viewMode.set('list')"
                        [class.bg-white]="viewMode() === 'list'"
                        [class.shadow-md]="viewMode() === 'list'"
                        [class.text-[#7A4E2D]]="viewMode() === 'list'"
                        class="px-4 py-2 rounded-xl transition-all text-[#a09c94] hover:text-[#7A4E2D] flex items-center gap-2"
                    >
                        <div [innerHTML]="getIcon('LayoutList')" class="w-5 h-5"></div>
                        <span class="text-[10px] font-bold">قائمة</span>
                    </button>
                </div>

                <div class="h-10 w-px bg-gradient-to-b from-transparent via-[#7A4E2D10] to-transparent"></div>

                <div class="flex items-center gap-4">
                    <div class="text-right hidden 2xl:block">
                        <p class="text-[9px] text-[#a09c94] font-black uppercase tracking-widest opacity-60">الجلسة النشطة</p>
                        <p class="text-sm font-black text-[#7A4E2D]">{{ cashierDisplayName() || 'كاشير وشّى' }}</p>
                    </div>
                    <div class="relative group">
                        <div class="w-12 h-12 rounded-[18px] bg-gradient-to-tr from-[#7A4E2D] to-[#9c6a45] p-0.5 shadow-[0_8px_16px_rgba(122,78,45,0.2)] group-hover:rotate-12 transition-transform duration-500">
                            <img [src]="cashierAvatarUrl()" class="w-full h-full rounded-[16px] border-2 border-white object-cover" alt="" />
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="flex-1 flex overflow-hidden">
            <!-- Left Side: Product Browser -->
            <section class="flex-1 flex flex-col overflow-hidden relative">
                <!-- Category Tabs -->
                <div class="bg-white/40 backdrop-blur-md border-b border-[#7A4E2D08] px-8 py-4 flex items-center gap-3 overflow-x-auto no-scrollbar z-20">
                    <button 
                        (click)="activeCategory.set('الكل')"
                        [class]="activeCategory() === 'الكل' ? 'bg-[#7A4E2D] text-white shadow-[0_8px_15px_rgba(122,78,45,0.2)]' : 'bg-white text-[#a09c94] hover:text-[#7A4E2D] hover:border-[#7A4E2D40]'"
                        class="px-8 py-3 rounded-2xl border-2 border-transparent text-sm font-black transition-all whitespace-nowrap active:scale-95"
                    >
                        الكل
                    </button>
                    @for (cat of availableCategories(); track cat) {
                    <button 
                        (click)="activeCategory.set(cat)"
                        [class]="activeCategory() === cat ? 'bg-[#7A4E2D] text-white shadow-[0_8px_15px_rgba(122,78,45,0.2)]' : 'bg-white text-[#a09c94] hover:text-[#7A4E2D] hover:border-[#7A4E2D40]'"
                        class="px-8 py-3 rounded-2xl border-2 border-transparent text-sm font-black transition-all whitespace-nowrap active:scale-95"
                    >
                        {{ cat }}
                    </button>
                    }
                </div>

                @if (pinnedProducts().length > 0) {
                    <div class="bg-[#fffdf9] border-b border-[#7A4E2D08] px-8 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar z-10">
                        <span class="text-[10px] font-black text-[#7A4E2D] shrink-0 tracking-wide">إضافة سريعة</span>
                        @for (p of pinnedProducts(); track p.id) {
                            <button type="button"
                                (click)="addToCart(p)"
                                class="shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border-2 border-[#7A4E2D12] hover:border-[#7A4E2D] hover:shadow-md transition-all active:scale-95">
                                <span class="text-xs font-black text-[#2c1810] truncate max-w-[140px]">{{ p.name }}</span>
                                <span class="text-[10px] font-black text-[#7A4E2D]">{{ p.price }} ر.س</span>
                            </button>
                        }
                    </div>
                }

                <!-- Products Display Area -->
                <div class="flex-1 overflow-y-auto p-8 scroll-smooth custom-scrollbar">
                    @if (filteredProducts().length === 0) {
                        <div class="h-full flex flex-col items-center justify-center text-center">
                            <div class="w-32 h-32 bg-[#7A4E2D08] rounded-[40px] flex items-center justify-center mb-6 rotate-12">
                                <div [innerHTML]="getIcon('Search')" class="w-12 h-12 text-[#7A4E2D] opacity-40"></div>
                            </div>
                            <h3 class="font-black text-2xl text-[#2c1810]">لم نجد ما تبحث عنه</h3>
                            <p class="text-[#a09c94] mt-2 max-w-xs font-medium">جرب البحث بكلمة مغايرة أو تأكد من اختيار القسم الصحيح</p>
                        </div>
                    }

                    @if (viewMode() === 'grid') {
                        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            @for (product of filteredProducts(); track product.id) {
                            <div 
                                (click)="addToCart(product)"
                                class="product-card group bg-white border border-[#7A4E2D08] rounded-[32px] p-5 cursor-pointer hover:shadow-[0_20px_40px_rgba(122,78,45,0.08)] transition-all duration-500 relative overflow-hidden active:scale-95 flex flex-col"
                            >
                                <div class="aspect-square bg-[#fdfaf6] rounded-[24px] mb-5 flex items-center justify-center group-hover:bg-[#fff9f2] transition-colors relative overflow-hidden">
                                    <button type="button"
                                        (click)="togglePin(product.id, $event)"
                                        class="absolute top-3 left-3 z-20 w-9 h-9 rounded-xl flex items-center justify-center border transition-all shadow-sm"
                                        [class.bg-amber-100]="isPinned(product.id)"
                                        [class.border-amber-300]="isPinned(product.id)"
                                        [class.text-amber-600]="isPinned(product.id)"
                                        [class.bg-white/90]="!isPinned(product.id)"
                                        [class.border-[#7A4E2D10]]="!isPinned(product.id)"
                                        [class.text-[#a09c94]]="!isPinned(product.id)"
                                        [attr.title]="isPinned(product.id) ? 'إزالة من السريع' : 'تثبيت للوصول السريع'">
                                        <div [innerHTML]="getIcon('Star')" class="w-4 h-4"></div>
                                    </button>
                                    @if (product.imageUrl) {
                                        <img [src]="product.imageUrl" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    } @else {
                                        <div [innerHTML]="getIcon('Image')" class="w-14 h-14 text-[#e5e1da] group-hover:text-[#7A4E2D] transition-all group-hover:scale-110"></div>
                                    }
                                    
                                    <!-- Badge -->
                                    <div class="absolute top-3 right-3 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-xl text-[9px] font-black text-[#7A4E2D] border border-[#7A4E2D10] shadow-sm tracking-wider uppercase">
                                        {{product.sku.slice(-6)}}
                                    </div>

                                    @if (product.stock <= product.minStock) {
                                        <div class="absolute bottom-3 left-3 px-3 py-1.5 bg-red-500/90 backdrop-blur-md text-white rounded-xl text-[8px] font-black animate-pulse flex items-center gap-1.5">
                                            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                                            نفاد قريب
                                        </div>
                                    }
                                </div>
                                <h3 class="font-black text-base mb-2 line-clamp-1 group-hover:text-[#7A4E2D] transition-colors px-1">{{product.name}}</h3>
                                
                                <div class="flex items-end justify-between mt-auto px-1">
                                    <div class="flex flex-col">
                                        <span class="text-[10px] text-[#a09c94] font-bold uppercase tracking-widest mb-0.5">السعر</span>
                                        <span class="text-[#7A4E2D] font-black text-2xl tracking-tighter">{{product.price}} <small class="font-bold text-xs">ر.س</small></span>
                                    </div>
                                    <div class="w-10 h-10 bg-[#7A4E2D] text-white rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500">
                                        <div [innerHTML]="getIcon('Plus')" class="w-6 h-6"></div>
                                    </div>
                                </div>

                                <!-- Overlay Flash -->
                                <div class="absolute inset-0 bg-white/0 group-active:bg-[#7A4E2D]/5 transition-colors pointer-events-none"></div>
                            </div>
                            }
                        </div>
                    } @else {
                        <div class="space-y-4 max-w-6xl mx-auto">
                            @for (product of filteredProducts(); track product.id) {
                            <div 
                                (click)="addToCart(product)"
                                class="flex items-center gap-4 md:gap-6 bg-white border border-[#7A4E2D08] p-5 rounded-[28px] cursor-pointer hover:shadow-[0_15px_30px_rgba(122,78,45,0.06)] transition-all active:scale-[0.99] group overflow-hidden relative"
                            >
                                <button type="button"
                                    (click)="togglePin(product.id, $event)"
                                    class="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all z-10"
                                    [class.bg-amber-100]="isPinned(product.id)"
                                    [class.border-amber-300]="isPinned(product.id)"
                                    [class.text-amber-600]="isPinned(product.id)"
                                    [class.bg-[#fdfaf6]]="!isPinned(product.id)"
                                    [class.border-[#7A4E2D10]]="!isPinned(product.id)"
                                    [attr.title]="isPinned(product.id) ? 'إزالة من السريع' : 'تثبيت للوصول السريع'">
                                    <div [innerHTML]="getIcon('Star')" class="w-4 h-4"></div>
                                </button>
                                <div class="w-20 h-20 bg-[#fdfaf6] rounded-[20px] overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#7A4E2D10] group-hover:bg-[#fff9f2] transition-colors">
                                    @if (product.imageUrl) {
                                        <img [src]="product.imageUrl" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                    } @else {
                                        <div [innerHTML]="getIcon('Image')" class="w-8 h-8 text-[#e5e1da] group-hover:text-[#7A4E2D]"></div>
                                    }
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-3 mb-1">
                                        <h3 class="font-black text-lg truncate tracking-tight text-[#2c1810]">{{product.name}}</h3>
                                        <span class="text-[10px] bg-[#f8f6f2] px-2.5 py-1 rounded-lg text-[#a09c94] font-mono font-bold tracking-widest border border-[#7A4E2D10]">#{{product.sku}}</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-xs text-[#7A4E2D] font-bold opacity-60">{{product.category}}</span>
                                        <div class="w-1 h-1 bg-[#a09c94/40] rounded-full"></div>
                                        <span class="text-xs text-[#a09c94] font-medium">المخزون الحالي · وحدة القياس</span>
                                    </div>
                                </div>
                                <div class="text-right flex items-center gap-10">
                                    <div class="hidden md:block">
                                        <p class="text-[9px] text-[#a09c94] font-black uppercase tracking-[0.2em] mb-1 opacity-50">المخزون</p>
                                        <div class="flex items-center gap-2">
                                            <div class="w-2 h-2 rounded-full" [ngClass]="product.stock <= product.minStock ? 'bg-red-500' : 'bg-emerald-500'"></div>
                                            <p class="text-sm font-black" [ngClass]="product.stock <= product.minStock ? 'text-red-500' : 'text-emerald-600'">
                                                {{product.stock}} {{ product.stock <= product.minStock ? '(منخفض!)' : '' }}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="w-32">
                                        <p class="text-[9px] text-[#a09c94] font-black uppercase tracking-[0.2em] text-left mb-1 opacity-50">سعر الوحدة</p>
                                        <p class="text-2xl font-black text-[#7A4E2D] tracking-tighter">{{product.price}} <small class="text-xs font-bold">ر.س</small></p>
                                    </div>
                                    <div class="w-14 h-14 bg-[#f8f6f2] rounded-2xl text-[#7A4E2D] group-hover:bg-[#7A4E2D] group-hover:text-white transition-all duration-300 flex items-center justify-center shadow-inner group-hover:rotate-12">
                                        <div [innerHTML]="getIcon('Plus')" class="w-8 h-8"></div>
                                    </div>
                                </div>
                            </div>
                            }
                        </div>
                    }
                </div>
            </section>

            @if (!isDesktop() && cartVisible()) {
                <div class="fixed inset-0 bg-[#2c1810]/45 backdrop-blur-[3px] z-[35] lg:hidden"
                     (click)="cartPanelOpen.set(false)"
                     role="presentation"></div>
            }

            <!-- Cart Sidebar (drawer على الشاشات الصغيرة) -->
            <aside
                class="flex flex-col bg-white border-[#7A4E2D08] shadow-[-10px_0_40px_rgba(122,78,45,0.06)] z-[40]
                       lg:relative lg:w-[480px] lg:border-r lg:translate-x-0 lg:flex
                       max-lg:fixed max-lg:top-20 max-lg:bottom-0 max-lg:end-0 max-lg:w-[min(100vw,480px)] max-lg:border-s max-lg:shadow-2xl max-lg:transition-transform max-lg:duration-300 max-lg:ease-out"
                [class.max-lg:translate-x-full]="!cartVisible()"
                [class.max-lg:translate-x-0]="cartVisible()"
            >
                <div class="absolute top-0 right-[-100px] w-[200px] h-[200px] bg-[#7A4E2D] opacity-[0.02] blur-[80px] pointer-events-none"></div>

                <div class="p-8 border-b border-[#7A4E2D08] flex items-center justify-between bg-white relative z-10">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-[#7A4E2D08] rounded-2xl flex items-center justify-center text-[#7A4E2D]">
                            <div [innerHTML]="getIcon('ShoppingCart')" class="w-6 h-6"></div>
                        </div>
                        <div>
                            <h2 class="font-black text-xl text-[#2c1810]">قائمة المشتريات</h2>
                            <p class="text-[10px] text-[#a09c94] font-bold tracking-widest mt-0.5 opacity-80">ملخص السلة والمجاميع</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button"
                                (click)="cartPanelOpen.set(false)"
                                class="lg:hidden w-10 h-10 flex items-center justify-center text-[#7A4E2D] hover:bg-[#7A4E2D10] rounded-xl transition-all active:scale-90 border border-[#7A4E2D15]"
                                title="إغلاق السلة">
                            <div [innerHTML]="getIcon('X')" class="w-5 h-5"></div>
                        </button>
                        @if (cart().length > 0) {
                            <button (click)="clearCart()" class="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition-all active:scale-90" title="مسح السلة">
                                <div [innerHTML]="getIcon('Trash')" class="w-5 h-5"></div>
                            </button>
                        }
                    </div>
                </div>

                <!-- Customer Identity Selection -->
                <div class="px-8 py-6 border-b border-[#7A4E2D08] bg-[#fdfaf6]/30 backdrop-blur-sm relative z-10">
                    <p class="text-[9px] text-[#a09c94] font-black uppercase tracking-[0.3em] mb-4 opacity-70">بيانات العميل</p>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="relative group/input">
                            <input 
                                type="text"
                                [(ngModel)]="customerName"
                                placeholder="اسم العميل..."
                                class="w-full bg-white border border-[#7A4E2D10] focus:border-[#7A4E2D] rounded-2xl py-3.5 pr-11 pl-4 outline-none transition-all text-sm font-bold shadow-sm placeholder:text-[#a09c94/40]"
                            />
                            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A4E2D] opacity-40 group-focus-within/input:opacity-100 transition-opacity">
                                <div [innerHTML]="getIcon('User')" class="w-5 h-5"></div>
                            </div>
                        </div>
                        <div class="relative group/input">
                            <input 
                                type="tel"
                                [(ngModel)]="customerPhone"
                                placeholder="رقم الهاتف..."
                                class="w-full bg-white border border-[#7A4E2D10] focus:border-[#7A4E2D] rounded-2xl py-3.5 pr-11 pl-4 outline-none transition-all text-sm font-bold shadow-sm placeholder:text-[#a09c94/40]"
                            />
                            <div class="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A4E2D] opacity-40 group-focus-within/input:opacity-100 transition-opacity">
                                <div [innerHTML]="getIcon('Smartphone')" class="w-5 h-5"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative z-10">
                    @if (cart().length === 0) {
                        <div class="h-full flex flex-col items-center justify-center text-center opacity-40 grayscale group">
                            <div class="w-24 h-24 bg-[#7A4E2D08] rounded-[40px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-700">
                                <div [innerHTML]="getIcon('ShoppingCart')" class="w-10 h-10 text-[#7A4E2D]"></div>
                            </div>
                            <p class="font-black text-lg">السلة فارغة حالياً</p>
                            <p class="text-[11px] mt-2 max-w-[200px] font-medium leading-relaxed">ابدأ بإجراء عملية بيع عبر إضافة المنتجات من اليسار</p>
                        </div>
                    } @else {
                        @for (item of cart(); track item.productId) {
                        <div class="cart-item group flex items-center gap-5 bg-[#fdfaf6] p-5 rounded-[28px] border-2 border-transparent hover:border-[#7A4E2D10] transition-all hover:bg-white hover:shadow-[0_10px_30px_rgba(122,78,45,0.05)] animate-item-in">
                            <div class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-[#7A4E2D08] shadow-sm overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                @if (item.imageUrl) {
                                    <img [src]="item.imageUrl" class="w-full h-full object-cover" />
                                } @else {
                                    <div [innerHTML]="getIcon('Image')" class="w-8 h-8 text-[#e5e1da]"></div>
                                }
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-black text-base truncate mb-3 text-[#2c1810]">{{item.productName}}</h4>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-1.5 bg-white rounded-xl p-1 border border-[#7A4E2D08] shadow-sm">
                                        <button type="button" (click)="updateQty(item, -1); $event.stopPropagation()" class="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-red-500 rounded-lg text-lg font-black transition-all">-</button>
                                        <button type="button" (click)="openQtyNumpad(item); $event.stopPropagation()" class="min-w-[2rem] px-1 text-center text-sm font-black text-[#7A4E2D] rounded-lg hover:bg-[#7A4E2D10] transition-colors" title="لوحة أرقام">{{item.quantity}}</button>
                                        <button type="button" (click)="updateQty(item, 1); $event.stopPropagation()" class="w-8 h-8 flex items-center justify-center hover:bg-emerald-50 text-emerald-500 rounded-lg text-lg font-black transition-all">+</button>
                                    </div>
                                    <div class="text-left">
                                        <span class="text-[10px] text-[#a09c94] font-bold block mb-0.5 tracking-tight">المجموع الفرعي</span>
                                        <span class="font-black text-[#7A4E2D] text-lg tracking-tighter">{{(item.price * item.quantity).toFixed(2)}} <small class="text-[10px] font-bold">ر.س</small></span>
                                    </div>
                                </div>
                            </div>
                            <button (click)="removeFromCart(item)" class="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300 opacity-0 group-hover:opacity-100">
                                <div [innerHTML]="getIcon('Trash')" class="w-5 h-5"></div>
                            </button>
                        </div>
                        }
                    }
                </div>

                <!-- Footer Summary Card -->
                <div class="p-8 bg-white border-t border-[#7A4E2D08] relative z-20">
                    <div class="flex gap-2 mb-6">
                        <button type="button"
                            (click)="holdCurrentCart()"
                            [disabled]="cart().length === 0"
                            class="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-[#7A4E2D12] bg-[#fdfaf6] text-[#7A4E2D] font-black text-[11px] hover:border-[#7A4E2D] transition-all disabled:opacity-40 active:scale-[0.98]">
                            <div [innerHTML]="getIcon('Clock')" class="w-4 h-4"></div>
                            تعليق الطلب
                        </button>
                        <button type="button"
                            (click)="showHeldTicketsModal.set(true)"
                            class="relative flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-[#7A4E2D12] bg-white text-[#2c1810] font-black text-[11px] hover:border-[#7A4E2D] transition-all active:scale-[0.98]">
                            <div [innerHTML]="getIcon('Inbox')" class="w-4 h-4 text-[#7A4E2D]"></div>
                            المعلّقة
                            @if (heldTickets().length > 0) {
                                <span class="absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-[10px] font-black text-white flex items-center justify-center border-2 border-white">{{ heldTickets().length }}</span>
                            }
                        </button>
                    </div>

                    @if (useSplitPayment()) {
                        <div class="mb-6 p-5 rounded-[28px] border-2 border-[#7A4E2D12] bg-[#fffdf9] space-y-3">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[10px] font-black text-[#7A4E2D] tracking-wide">تقسيم الدفع</span>
                                <button type="button" (click)="toggleSplitPayment()" class="text-[10px] font-black text-[#a09c94] hover:text-red-500">إيقاف</button>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-[9px] font-black text-[#a09c94] block mb-1">نقدي (ر.س)</label>
                                    <input type="text" inputmode="decimal" [(ngModel)]="splitCashAmount" name="splitCash"
                                        class="w-full bg-white border border-[#7A4E2D10] rounded-xl py-2.5 px-3 text-sm font-black text-center outline-none focus:border-[#7A4E2D]" />
                                </div>
                                <div>
                                    <label class="text-[9px] font-black text-[#a09c94] block mb-1">شبكة / بطاقة (ر.س)</label>
                                    <input type="text" inputmode="decimal" [(ngModel)]="splitCardAmount" name="splitCard"
                                        class="w-full bg-white border border-[#7A4E2D10] rounded-xl py-2.5 px-3 text-sm font-black text-center outline-none focus:border-[#7A4E2D]" />
                                </div>
                            </div>
                            <p class="text-[10px] text-[#a09c94] font-medium text-center">يجب أن يساوي مجموع الحقلين <span class="font-black text-[#7A4E2D]">{{ total().toFixed(2) }}</span> ر.س</p>
                        </div>
                    } @else {
                        <button type="button"
                            (click)="toggleSplitPayment()"
                            class="w-full mb-6 py-3 rounded-2xl border border-dashed border-[#7A4E2D20] text-[10px] font-black text-[#a09c94] hover:border-[#7A4E2D40] hover:text-[#7A4E2D] transition-all flex items-center justify-center gap-2">
                            <div [innerHTML]="getIcon('CreditCard')" class="w-4 h-4"></div>
                            تقسيم الدفع (نقدي + شبكة)
                        </button>
                    }

                    <div class="bg-[#2c1810] text-white p-7 rounded-[40px] shadow-[0_20px_40px_rgba(44,24,16,0.3)] relative overflow-hidden group mb-8">
                        <div class="absolute top-[-50px] left-[-50px] w-[150px] h-[150px] bg-white opacity-[0.03] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                        
                        <div class="relative z-10 space-y-4">
                            <div class="flex justify-between items-center opacity-60">
                                <span class="text-xs font-black tracking-wide">المجموع قبل الضريبة</span>
                                <span class="font-bold tracking-tighter">{{subtotal().toFixed(2)}} <small class="text-[10px]">ر.س</small></span>
                            </div>
                            <div class="flex justify-between items-center opacity-60">
                                <span class="text-xs font-black tracking-wide">ضريبة القيمة المضافة ({{taxRate()}}٪)</span>
                                <span class="font-bold tracking-tighter">{{tax().toFixed(2)}} <small class="text-[10px]">ر.س</small></span>
                            </div>
                            <div class="h-px bg-white/10 my-4"></div>
                            <div class="flex justify-between items-center pt-2">
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-black uppercase tracking-[0.3em] mb-1 text-emerald-400">الإجمالي المستحق</span>
                                    <span class="text-4xl font-black tracking-tighter">{{total().toFixed(2)}} <small class="text-sm font-bold opacity-70">ر.س</small></span>
                                </div>
                                <div class="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10">
                                    <div [innerHTML]="getIcon('Zap')" class="w-8 h-8 text-emerald-400"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        (click)="completeOrder()"
                        [disabled]="cart().length === 0"
                        class="w-full flex items-center justify-center gap-4 bg-[#7A4E2D] text-white py-6 rounded-[32px] font-black hover:shadow-[0_15px_30px_rgba(122,78,45,0.3)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 group active:scale-95"
                    >
                        <div [innerHTML]="getIcon('Check')" class="w-7 h-7 text-white group-hover:scale-125 transition-transform duration-500"></div>
                        <span class="tracking-wide text-lg font-black uppercase">إتمام البيع</span>
                    </button>

                    <!-- Advanced Settings Button -->
                    <button 
                        (click)="showSettings.set(true)"
                        class="w-full mt-6 py-4 flex items-center justify-center gap-2 text-[#a09c94] hover:text-[#7A4E2D] transition-all group font-black uppercase tracking-[0.2em] text-[10px] opacity-60 hover:opacity-100 border-t border-[#7A4E2D08] pt-8"
                    >
                        <div [innerHTML]="getIcon('Settings')" class="w-4 h-4 group-hover:rotate-90 transition-transform duration-700"></div>
                        إعدادات متقدمة
                    </button>
                </div>
            </aside>
        </main>

        <!-- Advanced Settings Modal -->
        @if (showSettings()) {
            <div class="fixed inset-0 bg-[#2c1810]/60 backdrop-blur-xl z-[150] flex items-center justify-center p-8 animate-in fade-in duration-500">
                <div class="bg-white rounded-[48px] p-10 max-w-2xl w-full shadow-[0_40px_120px_rgba(0,0,0,0.3)] relative overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
                    <!-- Modal Header -->
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 bg-[#7A4E2D] rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <div [innerHTML]="getIcon('Settings')" class="w-7 h-7"></div>
                            </div>
                            <div>
                                <h2 class="text-3xl font-black text-[#2c1810]">إعدادات البوث</h2>
                                <p class="text-[10px] text-[#a09c94] font-bold uppercase tracking-widest mt-0.5">التخصيص ومدير نقطة البيع</p>
                            </div>
                        </div>
                        <button (click)="showSettings.set(false)" class="w-12 h-12 flex items-center justify-center hover:bg-red-50 text-red-400 rounded-2xl transition-all active:scale-90">
                            <div [innerHTML]="getIcon('X')" class="w-6 h-6"></div>
                        </button>
                    </div>

                    <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-10">
                        <!-- Branding Section -->
                        <section>
                            <div class="flex items-center gap-3 mb-6">
                                <div class="w-1.5 h-6 bg-[#7A4E2D] rounded-full"></div>
                                <h3 class="font-black text-xl text-[#2c1810]">هوية المتجر</h3>
                            </div>
                            
                            <div class="flex gap-8 items-start mb-8">
                                <div class="relative group cursor-pointer" (click)="logoInput.click()">
                                    <div class="w-32 h-32 bg-[#fdfaf6] rounded-[32px] border-2 border-dashed border-[#7A4E2D20] flex items-center justify-center overflow-hidden transition-all group-hover:border-[#7A4E2D] group-hover:shadow-inner">
                                        @if (branding()?.logo_url) {
                                            <img [src]="branding().logo_url" class="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform" />
                                        } @else {
                                            <div [innerHTML]="getIcon('Image')" class="w-10 h-10 text-[#7A4E2D] opacity-20"></div>
                                        }
                                        <div class="absolute inset-0 bg-[#2c1810]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <div [innerHTML]="getIcon('Upload')" class="w-8 h-8 text-white"></div>
                                        </div>
                                    </div>
                                    <input #logoInput type="file" class="hidden" (change)="handleLogoUpload($event)" accept="image/*" />
                                    <p class="text-[10px] text-center mt-3 font-black text-[#7A4E2D] opacity-60">تغيير الشعار</p>
                                </div>

                                <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-[#a09c94] uppercase tracking-widest block pr-2">اسم المتجر</label>
                                        <input type="text" #brandName [value]="branding()?.brand_name || ''" class="w-full bg-[#fdfaf6] border border-[#7A4E2D08] focus:border-[#7A4E2D] rounded-2xl py-3 px-4 outline-none transition-all font-bold" />
                                    </div>
                                    <div class="space-y-2">
                                        <label class="text-[10px] font-black text-[#a09c94] uppercase tracking-widest block pr-2">الرقم الضريبي</label>
                                        <input type="text" #vatNum [value]="branding()?.vat_number || ''" class="w-full bg-[#fdfaf6] border border-[#7A4E2D08] focus:border-[#7A4E2D] rounded-2xl py-3 px-4 outline-none transition-all font-bold" />
                                    </div>
                                    <div class="col-span-full space-y-2">
                                        <label class="text-[10px] font-black text-[#a09c94] uppercase tracking-widest block pr-2">الشعار اللفظي (Tagline)</label>
                                        <input type="text" #tagline [value]="branding()?.tagline || ''" class="w-full bg-[#fdfaf6] border border-[#7A4E2D08] focus:border-[#7A4E2D] rounded-2xl py-3 px-4 outline-none transition-all font-bold" />
                                    </div>
                                    <div class="space-y-2 mt-4">
                                        <label class="text-[10px] font-black text-[#a09c94] uppercase tracking-widest block pr-2">حالة رمز الـ QR</label>
                                        <select #qrType [value]="branding()?.qr_type || 'none'" (change)="branding() ? branding().qr_type = qrType.value : null" class="w-full bg-[#fdfaf6] border border-[#7A4E2D08] focus:border-[#7A4E2D] rounded-2xl py-3 px-4 outline-none transition-all font-bold text-[#7A4E2D] appearance-none cursor-pointer">
                                            <option value="none">بدون (إخفاء)</option>
                                            <option value="custom">رابط مخصص أو نص</option>
                                            <option value="zatca">فاتورة ضريبية ZATCA</option>
                                        </select>
                                    </div>
                                    <div class="space-y-2 mt-4" [class.opacity-50]="qrType.value !== 'custom'">
                                        <label class="text-[10px] font-black text-[#a09c94] uppercase tracking-widest block pr-2">الرابط المخصص / النص</label>
                                        <input type="text" #qrCustom [disabled]="qrType.value !== 'custom'" [value]="branding()?.qr_custom_text || ''" placeholder="https://..." class="w-full bg-[#fdfaf6] border border-[#7A4E2D08] focus:border-[#7A4E2D] rounded-2xl py-3 px-4 outline-none transition-all font-bold disabled:bg-gray-100 disabled:cursor-not-allowed" />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <!-- Financial Settings -->
                        <section>
                            <div class="flex items-center justify-between mb-6">
                                <div class="flex items-center gap-3">
                                    <div class="w-1.5 h-6 bg-[#7A4E2D] rounded-full"></div>
                                    <h3 class="font-black text-xl text-[#2c1810]">الإعدادات المالية</h3>
                                </div>
                                <div class="flex items-center gap-3 bg-[#fdfaf6] p-1.5 rounded-2xl border border-[#7A4E2D08]">
                                    <span class="text-xs font-black text-[#2c1810b3] pr-2">تفعيل الضريبة</span>
                                    <button 
                                        (click)="toggleTax()"
                                        [class]="isTaxEnabled() ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-[#a09c94]'"
                                        class="w-14 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
                                    >
                                        <span class="text-[10px] font-black">{{ isTaxEnabled() ? 'تشغيل' : 'إيقاف' }}</span>
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-8 items-center bg-[#fdfaf6] p-8 rounded-[32px] border border-[#7A4E2D08]">
                                <div>
                                    <h4 class="font-black text-base text-[#2c1810] mb-2">نسبة ضريبة القيمة المضافة</h4>
                                    <p class="text-xs text-[#a09c94] font-medium leading-relaxed">تطبق هذه النسبة تلقائياً على كافة المبيعات في حال تفعيل الضريبة.</p>
                                </div>
                                <div class="relative group">
                                    <input 
                                        type="number" 
                                        [value]="taxRate()"
                                        (change)="updateTaxRate(+rateInput.value)"
                                        #rateInput
                                        class="w-full bg-white border-2 border-[#7A4E2D10] focus:border-[#7A4E2D] rounded-[24px] py-6 px-8 text-center text-4xl font-black text-[#7A4E2D] outline-none shadow-sm transition-all"
                                    />
                                    <span class="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-[#7A4E2D20] group-focus-within:text-[#7A4E2D40] transition-colors">%</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    <!-- Modal Actions -->
                    <div class="mt-10 flex gap-4">
                        <button 
                            (click)="saveBranding({
                                brand_name: brandName.value,
                                tagline: tagline.value,
                                vat_number: vatNum.value,
                                qr_type: qrType.value,
                                qr_custom_text: qrCustom.value
                            })"
                            class="flex-1 bg-[#7A4E2D] text-white py-6 rounded-[32px] font-black hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95"
                        >
                            حفظ كافة التغييرات
                        </button>
                    </div>
                </div>
            </div>
        }

        <!-- Premium Success Modal with Sharing Intelligence -->
        @if (lastOrder()) {
            <div class="fixed inset-0 bg-[#2c1810]/40 backdrop-blur-[20px] z-[100] flex items-center justify-center p-8 animate-in fade-in duration-500">
                <div class="bg-white rounded-[60px] p-12 max-w-lg w-full shadow-[0_40px_100px_rgba(0,0,0,0.2)] text-center relative overflow-hidden animate-in zoom-in-95 duration-700">
                    <!-- Confetti-like decoration -->
                    <div class="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400"></div>
                    <div class="absolute top-[-50px] right-[-50px] w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl rotate-12"></div>
                    
                    <div class="w-32 h-32 bg-emerald-50 text-emerald-500 rounded-[48px] flex items-center justify-center mx-auto mb-8 shadow-inner border-4 border-emerald-50">
                        <div [innerHTML]="getIcon('Check')" class="w-16 h-16 animate-bounce-subtle"></div>
                    </div>
                    
                    <h2 class="text-4xl font-black mb-3 text-[#2c1810] tracking-tighter">عملية ناجحة</h2>
                    <p class="text-[#a09c94] mb-10 font-bold tracking-wide text-xs opacity-80">طلب رقم {{lastOrder()?.orderNumber}} · {{total().toFixed(2)}} ر.س</p>
                    
                    <div class="space-y-4 mb-10">
                        <!-- Thermal & PDF Download Action -->
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <button (click)="printLastOrder('thermal')" class="flex flex-col items-center justify-center gap-3 bg-[#fdfaf6] border-2 border-[#7A4E2D08] py-5 rounded-[28px] hover:border-[#7A4E2D] hover:bg-white transition-all group hover:shadow-lg active:scale-95 text-[#2c1810]">
                                <div class="w-10 h-10 bg-white border border-[#7A4E2D10] rounded-2xl flex items-center justify-center group-hover:bg-[#7A4E2D] group-hover:text-white text-[#7A4E2D] transition-colors shadow-sm">
                                    <div [innerHTML]="getIcon('Printer')" class="w-5 h-5"></div>
                                </div>
                                <span class="font-black text-[11px] tracking-wide">طباعة حرارية</span>
                            </button>
                            <button (click)="printLastOrder('pdf')" class="flex flex-col items-center justify-center gap-3 bg-[#fdfaf6] border-2 border-[#7A4E2D08] py-5 rounded-[28px] hover:border-[#7A4E2D] hover:bg-white transition-all group hover:shadow-lg active:scale-95 text-[#2c1810]">
                                <div class="w-10 h-10 bg-white border border-[#7A4E2D10] rounded-2xl flex items-center justify-center group-hover:bg-[#7A4E2D] group-hover:text-white text-[#7A4E2D] transition-colors shadow-sm">
                                    <div [innerHTML]="getIcon('File')" class="w-5 h-5"></div>
                                </div>
                                <span class="font-black text-[11px] tracking-wide">تحميل PDF</span>
                            </button>
                        </div>
 
                        <!-- Template Selector & WhatsApp Action -->
                        <div class="bg-emerald-50/50 p-6 rounded-[40px] border border-emerald-100/50">
                            <p class="text-[9px] text-emerald-600 font-black uppercase tracking-[0.2em] mb-4 text-right pr-2">اختر قالب الرسالة</p>
                            <div class="flex gap-2 mb-6 bg-white/50 p-1.5 rounded-2xl border border-emerald-100">
                                @for (temp of whatsappTemplates; track temp.id) {
                                    <button 
                                        (click)="selectedTemplate.set(temp.id)"
                                        [class]="selectedTemplate() === temp.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-700 hover:bg-emerald-100/50'"
                                        class="flex-1 py-3 rounded-xl text-xs font-black transition-all active:scale-95"
                                    >
                                        {{temp.name}}
                                    </button>
                                }
                            </div>
                            
                            <button 
                                (click)="shareWithTemplate()"
                                [disabled]="sharingStatus() === 'uploading'"
                                class="flex items-center justify-center gap-3 w-full bg-[#25D366] py-6 rounded-[32px] font-black text-white hover:shadow-[0_20px_40px_rgba(37,211,102,0.3)] hover:scale-[1.03] transition-all group relative overflow-hidden active:scale-95"
                            >
                                @if (sharingStatus() === 'uploading') {
                                    <div class="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span class="tracking-wide text-sm font-black">جاري رفع الملف…</span>
                                } @else {
                                    <div [innerHTML]="getIcon('WhatsApp')" class="w-7 h-7 fill-white group-hover:rotate-12 transition-transform duration-500"></div>
                                    <span class="tracking-widest uppercase text-sm">مشاركة الرابط للعميل</span>
                                }
                                <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                            </button>
                        </div>
                    </div>
 
                    <button (click)="closeOrderModal()" class="w-full py-2 text-[#a09c94] font-black hover:text-[#7A4E2D] transition-all uppercase tracking-[0.4em] text-[10px] opacity-40 hover:opacity-100">
                        متابعة البيع
                    </button>
                </div>
            </div>
        }

        <!-- لوحة أرقام الكمية -->
        @if (qtyNumpadTarget(); as numpadItem) {
            <div class="fixed inset-0 bg-[#2c1810]/50 backdrop-blur-sm z-[140] flex items-center justify-center p-6 animate-in fade-in duration-200"
                 (click)="closeQtyNumpad()">
                <div class="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" (click)="$event.stopPropagation()">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-2xl bg-[#7A4E2D] flex items-center justify-center text-white">
                                <div [innerHTML]="getIcon('Keypad')" class="w-6 h-6"></div>
                            </div>
                            <div class="text-right min-w-0">
                                <p class="text-[10px] font-black text-[#a09c94] uppercase tracking-wider">الكمية</p>
                                <p class="text-sm font-black text-[#2c1810] truncate">{{ numpadItem.productName }}</p>
                            </div>
                        </div>
                        <button type="button" (click)="closeQtyNumpad()" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 text-[#a09c94]">
                            <div [innerHTML]="getIcon('X')" class="w-5 h-5"></div>
                        </button>
                    </div>
                    <div class="text-center py-4 mb-4 rounded-[28px] bg-[#fdfaf6] border-2 border-[#7A4E2D10]">
                        <span class="text-5xl font-black text-[#7A4E2D] tracking-tighter">{{ qtyNumpadDraft() }}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        @for (d of ['1','2','3','4','5','6','7','8','9']; track d) {
                            <button type="button" (click)="appendQtyDigit(d)"
                                class="py-4 rounded-2xl bg-[#fdfaf6] font-black text-xl text-[#2c1810] hover:bg-[#7A4E2D10] active:scale-95 transition-all">{{ d }}</button>
                        }
                    </div>
                    <div class="grid grid-cols-3 gap-2 mb-6">
                        <button type="button" (click)="clearQtyDraft()" class="py-4 rounded-2xl border-2 border-[#7A4E2D15] text-[11px] font-black text-[#a09c94] hover:border-[#7A4E2D]">مسح</button>
                        <button type="button" (click)="appendQtyDigit('0')" class="py-4 rounded-2xl bg-[#fdfaf6] font-black text-xl hover:bg-[#7A4E2D10]">0</button>
                        <button type="button" (click)="backspaceQtyDraft()" class="py-4 rounded-2xl border-2 border-[#7A4E2D15] text-[11px] font-black text-[#7A4E2D] hover:bg-[#7A4E2D10]">⌫</button>
                    </div>
                    <button type="button" (click)="confirmQtyNumpad()"
                        class="w-full py-4 rounded-[24px] bg-[#7A4E2D] text-white font-black text-sm hover:shadow-lg transition-all active:scale-[0.99]">
                        تأكيد
                    </button>
                </div>
            </div>
        }

        <!-- الطلبات المعلقة -->
        @if (showHeldTicketsModal()) {
            <div class="fixed inset-0 bg-[#2c1810]/50 backdrop-blur-sm z-[135] flex items-center justify-center p-6 animate-in fade-in duration-200"
                 (click)="showHeldTicketsModal.set(false)">
                <div class="bg-white rounded-[40px] p-8 max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" (click)="$event.stopPropagation()">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-black text-[#2c1810]">طلبات معلّقة</h3>
                        <button type="button" (click)="showHeldTicketsModal.set(false)" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#fdfaf6]">
                            <div [innerHTML]="getIcon('X')" class="w-5 h-5"></div>
                        </button>
                    </div>
                    @if (heldTickets().length === 0) {
                        <p class="text-center text-[#a09c94] font-medium py-12">لا توجد طلبات معلّقة حالياً</p>
                    } @else {
                        <ul class="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                            @for (h of heldTickets(); track h.id) {
                                <li class="flex items-center gap-3 p-4 rounded-[24px] border border-[#7A4E2D10] bg-[#fdfaf6] hover:bg-white transition-colors">
                                    <div class="flex-1 min-w-0 text-right">
                                        <p class="text-xs font-black text-[#7A4E2D]">{{ formatHeldTime(h.savedAt) }}</p>
                                        <p class="text-sm font-black text-[#2c1810] truncate">{{ heldLineSummary(h) }}</p>
                                        <p class="text-[10px] text-[#a09c94] mt-1">{{ h.cart.length }} أصناف</p>
                                    </div>
                                    <button type="button" (click)="restoreHeldTicket(h)"
                                        class="shrink-0 px-4 py-2 rounded-xl bg-[#7A4E2D] text-white text-[11px] font-black hover:opacity-90">استعادة</button>
                                    <button type="button" (click)="deleteHeldTicket(h, $event)"
                                        class="shrink-0 p-2 rounded-xl text-red-400 hover:bg-red-50" title="حذف">
                                        <div [innerHTML]="getIcon('Trash')" class="w-5 h-5"></div>
                                    </button>
                                </li>
                            }
                        </ul>
                    }
                </div>
            </div>
        }

        <!-- Scanner Overlay -->
        @if (showScanner()) {
            <app-barcode-scanner (scanSuccess)="onScanSuccess($event)" (onClosed)="showScanner.set(false)"></app-barcode-scanner>
        }
    </div>
    `,
    styles: [`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #7A4E2D15; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #7A4E2D30; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .animate-bounce-subtle {
            animation: bounce-subtle 2s infinite ease-in-out;
        }
        
        @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }

        .animate-item-in {
            animation: slide-up 0.4s ease-out forwards;
        }

        @keyframes slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .product-card:hover {
            transform: translateY(-8px);
        }

        :host { display: block; }
        
        .line-clamp-1 {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    `]
})
export class BoothComponent implements OnInit, OnDestroy {
    private inventoryService = inject(InventoryService);
    private printService = inject(PrintService);
    private sanitizer = inject(DomSanitizer);
    private location = inject(Location);
    private authService = inject(AuthService);

    private readonly HELD_STORAGE_KEY = 'washa_booth_held_tickets';

    @ViewChild('skuInput') skuInput!: ElementRef<HTMLInputElement>;

    searchQuery = '';
    
    // Barcode Scanner State
    private barcodeBuffer = '';
    private barcodeTimeout: any = null;
    activeCategory = signal<string>('الكل');
    viewMode = signal<'grid' | 'list'>('grid');
    cart = signal<BoothCartLine[]>([]);
    lastOrder = signal<Order | null>(null);
    showScanner = signal(false);
    showSettings = signal(false);

    cartPanelOpen = signal(false);
    isDesktop = signal(true);
    private mq?: MediaQueryList;
    private readonly mqHandler = () => this.isDesktop.set(!!this.mq?.matches);

    qtyNumpadTarget = signal<BoothCartLine | null>(null);
    qtyNumpadDraft = signal<string>('0');
    showHeldTicketsModal = signal(false);
    heldTickets = signal<HeldCartSnapshot[]>(this.loadHeldTickets());

    useSplitPayment = signal(false);
    splitCashAmount = '';
    splitCardAmount = '';

    cashierDisplayName = computed(() => this.authService.activeProfile()?.name?.trim() || '');
    cashierAvatarUrl = computed(() => {
        const p = this.authService.activeProfile();
        if (p?.avatar_url?.trim()) return p.avatar_url.trim();
        const seed = encodeURIComponent(p?.name?.trim() || 'Washa');
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    });

    private readonly PINNED_STORAGE = 'washa_booth_pinned_products';
    pinnedProductIds = signal<string[]>(this.loadPinnedIds());

    pinnedProducts = computed(() => {
        const ids = new Set(this.pinnedProductIds());
        return this.inventoryService.products()
            .filter(p => p.isActive && ids.has(p.id))
            .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    });

    cartVisible = computed(() => this.isDesktop() || this.cartPanelOpen());

    customerName = '';
    customerPhone = '';

    // Tax Settings
    isTaxEnabled = signal(true);
    taxRate = signal(15);

    // Branding settings from service
    branding = this.inventoryService.settings;

    // Sharing state
    sharingStatus = signal<'idle' | 'uploading' | 'success'>('idle');
    selectedTemplate = signal<string>('professional');
    whatsappTemplates = this.printService.WHATSAPP_TEMPLATES;

    constructor() {
        effect(() => {
            const settings = this.branding();
            if (settings) {
                if (settings.tax_rate !== undefined) this.taxRate.set(settings.tax_rate);
                if (settings.tax_enabled !== undefined) this.isTaxEnabled.set(settings.tax_enabled);
            }
        }, { allowSignalWrites: true });

        afterNextRender(() => queueMicrotask(() => this.focusSearch()));
    }

    ngOnInit(): void {
        if (typeof window === 'undefined') return;
        this.mq = window.matchMedia('(min-width: 1024px)');
        this.isDesktop.set(this.mq.matches);
        this.mq.addEventListener('change', this.mqHandler);
    }

    ngOnDestroy(): void {
        this.mq?.removeEventListener('change', this.mqHandler);
    }

    // Computed values
    availableCategories = computed(() => {
        const prodCategories = this.inventoryService.products()
            .map(p => p.category)
            .filter((v, i, a) => a.indexOf(v) === i && !!v);
        return prodCategories.sort();
    });

    filteredProducts = computed(() => {
        const query = this.searchQuery.toLowerCase().trim();
        const activeCat = this.activeCategory();
        let products = this.inventoryService.products().filter(p => p.isActive);
        if (activeCat !== 'الكل') products = products.filter(p => p.category === activeCat);
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
    tax = computed(() => this.isTaxEnabled() ? (this.subtotal() * (this.taxRate() / 100)) : 0);
    total = computed(() => this.subtotal() + this.tax());



    getIcon(name: keyof typeof Icons): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
    }

    goBack() { this.location.back(); }

    focusSearch(): void {
        const el = this.skuInput?.nativeElement;
        if (!el) return;
        el.focus();
        el.select?.();
    }

    onDocumentKeydown(ev: KeyboardEvent): void {
        if (this.showScanner()) {
            if (ev.key === 'Escape') {
                ev.preventDefault();
                this.showScanner.set(false);
            }
            return;
        }

        if (this.qtyNumpadTarget()) {
            if (ev.key === 'Escape') {
                ev.preventDefault();
                this.closeQtyNumpad();
            }
            return;
        }

        if (this.showHeldTicketsModal()) {
            if (ev.key === 'Escape') {
                ev.preventDefault();
                this.showHeldTicketsModal.set(false);
            }
            return;
        }

        if (ev.key === 'Escape') {
            if (this.showSettings()) {
                ev.preventDefault();
                this.showSettings.set(false);
                return;
            }
            if (this.lastOrder()) {
                ev.preventDefault();
                this.closeOrderModal();
                return;
            }
            if (!this.isDesktop() && this.cartPanelOpen()) {
                ev.preventDefault();
                this.cartPanelOpen.set(false);
                return;
            }
        }

        const target = ev.target as HTMLElement | null;
        const tag = target?.tagName;
        const inTextField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        if (ev.key === 'F2' || (ev.altKey && ev.key.toLowerCase() === 's')) {
            ev.preventDefault();
            this.focusSearch();
            return;
        }

        if (!inTextField && ev.key === '/') {
            ev.preventDefault();
            this.focusSearch();
            return;
        }

        // Barcode Scanner Logic (Laser Scanner acts as keyboard)
        // If an input is focused, let it handle its own input unless it's a fast sequence
        if (ev.key === 'Enter' && this.barcodeBuffer.length > 3) {
            ev.preventDefault();
            this.handleScannedBarcode(this.barcodeBuffer);
            this.barcodeBuffer = '';
            if (this.barcodeTimeout) clearTimeout(this.barcodeTimeout);
            return;
        }

        if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
            this.barcodeBuffer += ev.key;
            if (this.barcodeTimeout) clearTimeout(this.barcodeTimeout);
            this.barcodeTimeout = setTimeout(() => {
                // If it takes more than 50ms per character, it's probably human typing, reset buffer
                this.barcodeBuffer = '';
            }, 50);
        }
    }

    private handleScannedBarcode(code: string) {
        const product = this.inventoryService.products().find(p => p.sku === code || p.id === code || p.name.includes(code));
        if (product) {
            this.addToCart(product);
            this.inventoryService['toastService'].show(`تم إضافة: ${product.name}`, 'success');
        } else {
            this.inventoryService['toastService'].show(`لم يتم العثور على المنتج بالكود: ${code}`, 'error');
        }
    }

    private loadPinnedIds(): string[] {
        try {
            const raw = JSON.parse(localStorage.getItem(this.PINNED_STORAGE) || '[]');
            return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
        } catch {
            return [];
        }
    }

    togglePin(productId: string, ev: Event): void {
        ev.stopPropagation();
        ev.preventDefault();
        this.pinnedProductIds.update(ids => {
            const set = new Set(ids);
            if (set.has(productId)) {
                set.delete(productId);
            } else {
                set.add(productId);
            }
            const next = [...set];
            localStorage.setItem(this.PINNED_STORAGE, JSON.stringify(next));
            return next;
        });
    }

    isPinned(productId: string): boolean {
        return this.pinnedProductIds().includes(productId);
    }

    handleSearch() {
        const query = this.searchQuery.trim();
        if (!query) return;

        const bySku = this.inventoryService.getProductBySku(query);
        if (bySku) {
            this.addToCart(bySku);
            this.searchQuery = '';
            queueMicrotask(() => this.focusSearch());
            return;
        }

        const list = this.filteredProducts();
        if (list.length === 1) {
            this.addToCart(list[0]);
            this.searchQuery = '';
            queueMicrotask(() => this.focusSearch());
            return;
        }

        if (list.length === 0) {
            alert('لا توجد منتجات مطابقة لهذا البحث أو الباركود.');
        }
    }

    onScanSuccess(sku: string) {
        const product = this.inventoryService.getProductBySku(sku);
        if (product) this.addToCart(product);
        else alert(`المنتج بالرمز ${sku} غير موجود`);
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
                    ? { ...i, quantity: i.quantity + 1 } : i
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
        if (!this.isDesktop()) {
            this.cartPanelOpen.set(true);
        }
    }

    removeFromCart(item: BoothCartLine) {
        this.cart.update(current => current.filter(i => i.productId !== item.productId));
    }

    updateQty(item: BoothCartLine, delta: number) {
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

    async completeOrder() {
        if (this.cart().length === 0) return;
        if (!this.validateSplitPayment()) return;

        const orderItems: OrderItem[] = this.cart().map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.price * item.quantity
        }));

        const paymentMethod = this.useSplitPayment() ? 'mixed' : 'cash';
        const notes = this.buildOrderNotes();

        const order = await this.inventoryService.createOrder({
            items: orderItems,
            subtotal: this.subtotal(),
            tax: this.tax(),
            total: this.total(),
            customerName: this.customerName || 'عميل البوث',
            customerPhone: this.customerPhone,
            notes,
            paymentMethod
        });

        if (!order) return;
        this.lastOrder.set(order);

        this.cart.set([]);
        this.customerName = '';
        this.customerPhone = '';
        this.useSplitPayment.set(false);
        this.splitCashAmount = '';
        this.splitCardAmount = '';
        if (!this.isDesktop()) {
            this.cartPanelOpen.set(false);
        }
    }

    // Settings Methods
    async handleLogoUpload(event: any) {
        const file = event.target.files?.[0];
        if (!file) return;

        const path = `logo_${Date.now()}.${file.name.split('.').pop()}`;
        const url = await this.inventoryService.uploadBrandingFile(path, file);
        
        if (url) {
            const currentBranding = this.branding() || {};
            await this.inventoryService.updateSettings('branding', {
                ...currentBranding,
                logo_url: url
            });
        }
    }

    async saveBranding(data: any) {
        const currentBranding = this.branding() || {};
        const success = await this.inventoryService.updateSettings('branding', {
            ...currentBranding,
            ...data,
            tax_rate: this.taxRate(),
            tax_enabled: this.isTaxEnabled()
        });
        if (success) this.showSettings.set(false);
    }

    async toggleTax() {
        this.isTaxEnabled.update(v => !v);
        const currentBranding = this.branding() || {};
        await this.inventoryService.updateSettings('branding', {
            ...currentBranding,
            tax_enabled: this.isTaxEnabled()
        });
    }

    async updateTaxRate(rate: number) {
        this.taxRate.set(rate);
        const currentBranding = this.branding() || {};
        await this.inventoryService.updateSettings('branding', {
            ...currentBranding,
            tax_rate: rate
        });
    }

    async shareWithTemplate() {
        const order = this.lastOrder();
        if (!order) return;

        this.sharingStatus.set('uploading');
        try {
            const url = await this.printService.uploadInvoiceAndGetUrl(order);
            if (url) {
                this.printService.shareViaWhatsApp(order, this.selectedTemplate(), url);
                this.sharingStatus.set('success');
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            alert('عذراً، فشل رفع الفاتورة. يرجى المحاولة مرة أخرى.');
            this.sharingStatus.set('idle');
        }
    }

    printLastOrder(type: 'thermal' | 'pdf' | 'whatsapp') {
        const order = this.lastOrder();
        if (!order) return;
        
        if (type === 'thermal') {
            const html = this.printService.generateThermalHtml(order);
            this.printService.print(html);
        } else if (type === 'pdf') {
            this.printService.downloadInvoiceAsPdf(order);
        } else if (type === 'whatsapp') {
            this.printService.shareViaWhatsApp(order);
        }
    }

    closeOrderModal() {
        this.lastOrder.set(null);
        this.sharingStatus.set('idle');
        setTimeout(() => this.skuInput?.nativeElement.focus(), 100);
    }

    private loadHeldTickets(): HeldCartSnapshot[] {
        try {
            const raw = JSON.parse(localStorage.getItem(this.HELD_STORAGE_KEY) || '[]');
            if (!Array.isArray(raw)) return [];
            return raw
                .filter((h: unknown) => {
                    const x = h as HeldCartSnapshot;
                    return !!x?.id && Array.isArray(x.cart);
                })
                .slice(0, 10) as HeldCartSnapshot[];
        } catch {
            return [];
        }
    }

    private persistHeld(list: HeldCartSnapshot[]) {
        localStorage.setItem(this.HELD_STORAGE_KEY, JSON.stringify(list));
    }

    holdCurrentCart(): void {
        if (this.cart().length === 0) return;
        const snapshot: HeldCartSnapshot = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `h-${Date.now()}`,
            savedAt: new Date().toISOString(),
            cart: structuredClone(this.cart()),
            customerName: this.customerName,
            customerPhone: this.customerPhone
        };
        this.heldTickets.update(list => {
            const next = [snapshot, ...list].slice(0, 10);
            this.persistHeld(next);
            return next;
        });
        this.cart.set([]);
        this.customerName = '';
        this.customerPhone = '';
        if (!this.isDesktop()) this.cartPanelOpen.set(false);
    }

    formatHeldTime(savedAt: string): string {
        try {
            return new Date(savedAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });
        } catch {
            return savedAt;
        }
    }

    heldLineSummary(h: HeldCartSnapshot): string {
        const lines = h.cart.slice(0, 2).map(i => i.productName);
        const more = h.cart.length > 2 ? ` +${h.cart.length - 2}` : '';
        return lines.join(' · ') + more;
    }

    restoreHeldTicket(h: HeldCartSnapshot): void {
        if (this.cart().length > 0) {
            if (!confirm('استبدال السلة الحالية بالطلب المعلّق؟')) return;
        }
        this.cart.set(structuredClone(h.cart));
        this.customerName = h.customerName || '';
        this.customerPhone = h.customerPhone || '';
        this.heldTickets.update(list => {
            const next = list.filter(x => x.id !== h.id);
            this.persistHeld(next);
            return next;
        });
        this.showHeldTicketsModal.set(false);
        if (!this.isDesktop()) this.cartPanelOpen.set(true);
    }

    deleteHeldTicket(h: HeldCartSnapshot, ev?: Event): void {
        ev?.stopPropagation();
        this.heldTickets.update(list => {
            const next = list.filter(x => x.id !== h.id);
            this.persistHeld(next);
            return next;
        });
    }

    openQtyNumpad(item: BoothCartLine): void {
        this.qtyNumpadTarget.set(item);
        this.qtyNumpadDraft.set(String(Math.max(1, item.quantity)));
    }

    closeQtyNumpad(): void {
        this.qtyNumpadTarget.set(null);
        this.qtyNumpadDraft.set('0');
    }

    appendQtyDigit(d: string): void {
        const cur = this.qtyNumpadDraft().replace(/\D/g, '') || '';
        const base = cur === '0' ? '' : cur;
        const next = (base + d).slice(0, 4);
        const n = parseInt(next, 10);
        if (Number.isNaN(n)) {
            this.qtyNumpadDraft.set('0');
            return;
        }
        this.qtyNumpadDraft.set(String(Math.min(n, 9999)));
    }

    backspaceQtyDraft(): void {
        const s = this.qtyNumpadDraft().replace(/\D/g, '');
        const cut = s.slice(0, -1);
        if (cut === '') {
            this.qtyNumpadDraft.set('0');
            return;
        }
        const n = parseInt(cut, 10);
        this.qtyNumpadDraft.set(Number.isNaN(n) ? '0' : String(n));
    }

    clearQtyDraft(): void {
        this.qtyNumpadDraft.set('0');
    }

    confirmQtyNumpad(): void {
        const item = this.qtyNumpadTarget();
        if (!item) return;
        let q = parseInt(this.qtyNumpadDraft(), 10);
        if (!Number.isFinite(q) || q < 1) q = 1;
        const prod = this.inventoryService.products().find(p => p.id === item.productId);
        if (prod && q > prod.stock) {
            alert(`الكمية المتاحة في المخزون: ${prod.stock}`);
            q = Math.max(1, prod.stock);
        }
        this.setItemQuantity(item.productId, q);
        this.closeQtyNumpad();
    }

    setItemQuantity(productId: string, quantity: number): void {
        this.cart.update(current =>
            current.map(i => (i.productId === productId ? { ...i, quantity } : i))
        );
    }

    toggleSplitPayment(): void {
        this.useSplitPayment.update(v => {
            const next = !v;
            if (next) {
                this.splitCashAmount = this.total().toFixed(2);
                this.splitCardAmount = '0.00';
            } else {
                this.splitCashAmount = '';
                this.splitCardAmount = '';
            }
            return next;
        });
    }

    private validateSplitPayment(): boolean {
        if (!this.useSplitPayment()) return true;
        const cash = parseFloat(String(this.splitCashAmount).replace(',', '.')) || 0;
        const card = parseFloat(String(this.splitCardAmount).replace(',', '.')) || 0;
        const t = this.total();
        if (cash < 0 || card < 0) {
            alert('المبالغ لا يمكن أن تكون سالبة.');
            return false;
        }
        if (Math.abs(cash + card - t) > 0.02) {
            alert('مجموع النقدي والشبكة يجب أن يساوي الإجمالي المستحق.');
            return false;
        }
        return true;
    }

    private buildOrderNotes(): string {
        let notes = `تم البيع عبر واجهة البوث`;
        const cashier = this.cashierDisplayName();
        if (cashier) notes += ` · الكاشير: ${cashier}`;
        if (this.useSplitPayment()) {
            const cash = parseFloat(String(this.splitCashAmount).replace(',', '.')) || 0;
            const card = parseFloat(String(this.splitCardAmount).replace(',', '.')) || 0;
            notes += ` · دفع: نقدي ${cash.toFixed(2)} ر.س، شبكة ${card.toFixed(2)} ر.س`;
        }
        return notes;
    }
}
