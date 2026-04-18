import { Component, signal, effect, inject, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InventoryService, Product, Order, OrderItem, PRODUCT_CATEGORIES } from '../../core/services/domain/inventory.service';
import { Icons } from '../../shared/ui/icons';
import { FormsModule } from '@angular/forms';
import { PrintService } from '../../core/services/utils/print.service';
import { BarcodeScannerComponent } from '../../shared/ui/barcode-scanner.component';

@Component({
    selector: 'app-booth',
    standalone: true,
    imports: [CommonModule, FormsModule, BarcodeScannerComponent],
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
                        <p class="text-[9px] text-[#a09c94] uppercase tracking-[0.3em] font-black opacity-60">Digital Control Interface</p>
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
                        <span class="text-[10px] font-black tracking-tighter transition-colors uppercase">Scan Barcode</span>
                        <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/scan:translate-x-[100%] transition-transform duration-500 skew-x-12"></div>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-6">
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
                        <p class="text-[9px] text-[#a09c94] font-black uppercase tracking-widest opacity-60">Active Session</p>
                        <p class="text-sm font-black text-[#7A4E2D]">أدمن وشّى</p>
                    </div>
                    <div class="relative group">
                        <div class="w-12 h-12 rounded-[18px] bg-gradient-to-tr from-[#7A4E2D] to-[#9c6a45] p-0.5 shadow-[0_8px_16px_rgba(122,78,45,0.2)] group-hover:rotate-12 transition-transform duration-500">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Washa" class="w-full h-full rounded-[16px] border-2 border-white object-cover" alt="avatar" />
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
                                        <span class="text-[10px] text-[#a09c94] font-bold uppercase tracking-widest mb-0.5">Price</span>
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
                                class="flex items-center gap-6 bg-white border border-[#7A4E2D08] p-5 rounded-[28px] cursor-pointer hover:shadow-[0_15px_30px_rgba(122,78,45,0.06)] transition-all active:scale-[0.99] group overflow-hidden"
                            >
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
                                        <span class="text-xs text-[#a09c94] font-medium">الموقع: القسم الرئيسي</span>
                                    </div>
                                </div>
                                <div class="text-right flex items-center gap-10">
                                    <div class="hidden md:block">
                                        <p class="text-[9px] text-[#a09c94] font-black uppercase tracking-[0.2em] mb-1 opacity-50">Inventory</p>
                                        <div class="flex items-center gap-2">
                                            <div class="w-2 h-2 rounded-full" [ngClass]="product.stock <= product.minStock ? 'bg-red-500' : 'bg-emerald-500'"></div>
                                            <p class="text-sm font-black" [ngClass]="product.stock <= product.minStock ? 'text-red-500' : 'text-emerald-600'">
                                                {{product.stock}} {{ product.stock <= product.minStock ? '(منخفض!)' : '' }}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="w-32">
                                        <p class="text-[9px] text-[#a09c94] font-black uppercase tracking-[0.2em] text-left mb-1 opacity-50">Unit Price</p>
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

            <!-- Right Side: Cart Sidebar -->
            <aside class="w-[480px] bg-white border-r border-[#7A4E2D08] flex flex-col shadow-[-10px_0_40px_rgba(122,78,45,0.05)] z-40 relative">
                <div class="absolute top-0 right-[-100px] w-[200px] h-[200px] bg-[#7A4E2D] opacity-[0.02] blur-[80px] pointer-events-none"></div>

                <div class="p-8 border-b border-[#7A4E2D08] flex items-center justify-between bg-white relative z-10">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-[#7A4E2D08] rounded-2xl flex items-center justify-center text-[#7A4E2D]">
                            <div [innerHTML]="getIcon('ShoppingCart')" class="w-6 h-6"></div>
                        </div>
                        <div>
                            <h2 class="font-black text-xl text-[#2c1810]">قائمة المشتريات</h2>
                            <p class="text-[10px] text-[#a09c94] font-bold uppercase tracking-widest mt-0.5">Shopping Cart Intelligence</p>
                        </div>
                    </div>
                    @if (cart().length > 0) {
                        <button (click)="clearCart()" class="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-xl transition-all active:scale-90" title="مسح السلة">
                            <div [innerHTML]="getIcon('Trash')" class="w-5 h-5"></div>
                        </button>
                    }
                </div>

                <!-- Customer Identity Selection -->
                <div class="px-8 py-6 border-b border-[#7A4E2D08] bg-[#fdfaf6]/30 backdrop-blur-sm relative z-10">
                    <p class="text-[9px] text-[#a09c94] font-black uppercase tracking-[0.3em] mb-4 opacity-70">Identity & Contact</p>
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
                                        <button (click)="updateQty(item, -1)" class="w-8 h-8 flex items-center justify-center hover:bg-red-50 text-red-500 rounded-lg text-lg font-black transition-all">-</button>
                                        <span class="w-8 text-center text-sm font-black text-[#2c1810]">{{item.quantity}}</span>
                                        <button (click)="updateQty(item, 1)" class="w-8 h-8 flex items-center justify-center hover:bg-emerald-50 text-emerald-500 rounded-lg text-lg font-black transition-all">+</button>
                                    </div>
                                    <div class="text-left">
                                        <span class="text-[10px] text-[#a09c94] font-bold block mb-0.5 tracking-tighter uppercase">Subtotal</span>
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
                    <div class="bg-[#2c1810] text-white p-7 rounded-[40px] shadow-[0_20px_40px_rgba(44,24,16,0.3)] relative overflow-hidden group mb-8">
                        <div class="absolute top-[-50px] left-[-50px] w-[150px] h-[150px] bg-white opacity-[0.03] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                        
                        <div class="relative z-10 space-y-4">
                            <div class="flex justify-between items-center opacity-60">
                                <span class="text-xs font-black uppercase tracking-[0.2em]">Subtotal</span>
                                <span class="font-bold tracking-tighter">{{subtotal().toFixed(2)}} <small class="text-[10px]">ر.س</small></span>
                            </div>
                            <div class="flex justify-between items-center opacity-60">
                                <span class="text-xs font-black uppercase tracking-[0.2em]">VAT ({{taxRate()}}%)</span>
                                <span class="font-bold tracking-tighter">{{tax().toFixed(2)}} <small class="text-[10px]">ر.س</small></span>
                            </div>
                            <div class="h-px bg-white/10 my-4"></div>
                            <div class="flex justify-between items-center pt-2">
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-black uppercase tracking-[0.3em] mb-1 text-emerald-400">Total Payable</span>
                                    <span class="text-4xl font-black tracking-tighter">{{total().toFixed(2)}} <small class="text-sm font-bold opacity-70">ر.س</small></span>
                                </div>
                                <div class="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10">
                                    <div [innerHTML]="getIcon('Zap')" class="w-8 h-8 text-emerald-400"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <button 
                            (click)="completeOrder('thermal')"
                            [disabled]="cart().length === 0"
                            class="flex flex-col items-center justify-center gap-3 bg-[#fdfaf6] border-2 border-[#7A4E2D08] py-6 rounded-[32px] hover:border-[#7A4E2D] hover:bg-white transition-all disabled:opacity-50 group hover:shadow-xl active:scale-95 text-[#2c1810]"
                        >
                            <div [innerHTML]="getIcon('Printer')" class="w-7 h-7 text-[#7A4E2D] group-hover:scale-110 group-hover:rotate-6 transition-transform"></div>
                            <span class="font-black text-[11px] uppercase tracking-widest">Receipt Paper</span>
                        </button>
                        <button 
                            (click)="completeOrder('pdf')"
                            [disabled]="cart().length === 0"
                            class="flex flex-col items-center justify-center gap-3 bg-[#fdfaf6] border-2 border-[#7A4E2D08] py-6 rounded-[32px] hover:border-[#7A4E2D] hover:bg-white transition-all disabled:opacity-50 group hover:shadow-xl active:scale-95 text-[#2c1810]"
                        >
                            <div [innerHTML]="getIcon('File')" class="w-7 h-7 text-[#7A4E2D] group-hover:scale-110 group-hover:rotate-6 transition-transform"></div>
                            <span class="font-black text-[11px] uppercase tracking-widest">Download PDF</span>
                        </button>
                    </div>

                    <button 
                        (click)="completeOrder('whatsapp')"
                        [disabled]="cart().length === 0"
                        class="w-full mt-4 flex items-center justify-center gap-4 bg-[#25D366] text-white py-6 rounded-[32px] font-black hover:shadow-[0_15px_30px_rgba(37,211,102,0.3)] hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 group active:scale-95"
                    >
                        <div [innerHTML]="getIcon('WhatsApp')" class="w-7 h-7 fill-white group-hover:scale-125 transition-transform duration-500"></div>
                        <span class="tracking-widest uppercase text-sm">Send to WhatsApp</span>
                    </button>

                    <!-- Advanced Settings Button -->
                    <button 
                        (click)="showSettings.set(true)"
                        class="w-full mt-6 py-4 flex items-center justify-center gap-2 text-[#a09c94] hover:text-[#7A4E2D] transition-all group font-black uppercase tracking-[0.2em] text-[10px] opacity-60 hover:opacity-100 border-t border-[#7A4E2D08] pt-8"
                    >
                        <div [innerHTML]="getIcon('Settings')" class="w-4 h-4 group-hover:rotate-90 transition-transform duration-700"></div>
                        Advanced Settings
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
                                <p class="text-[10px] text-[#a09c94] font-bold uppercase tracking-widest mt-0.5">Customization & POS Engine</p>
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
                                        <span class="text-[10px] font-black uppercase tracking-tighter">{{ isTaxEnabled() ? 'ON' : 'OFF' }}</span>
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
                                vat_number: vatNum.value
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
                    <p class="text-[#a09c94] mb-10 font-bold tracking-widest uppercase text-[10px] opacity-60">Order #{{lastOrder()?.orderNumber}} • {{total().toFixed(2)}} SAR</p>
                    
                    <div class="space-y-4 mb-10">
                        <!-- PDF Download Action -->
                        <button (click)="printLastOrder('pdf')" class="flex items-center justify-between gap-4 w-full bg-[#fdfaf6] p-6 rounded-[32px] font-bold text-[#7A4E2D] hover:bg-[#7A4E2D] hover:text-white transition-all group border border-[#7A4E2D10] group">
                             <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-white/40 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                    <div [innerHTML]="getIcon('File')" class="w-6 h-6"></div>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm font-black">تحميل الفاتورة</p>
                                    <p class="text-[9px] opacity-60 uppercase tracking-widest">High Quality PDF</p>
                                </div>
                             </div>
                             <div [innerHTML]="getIcon('ChevronLeft')" class="w-5 h-5 opacity-40 group-hover:translate-x-[-4px] transition-transform"></div>
                        </button>
 
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
                                    <span class="tracking-widest uppercase text-sm">Uploading...</span>
                                } @else {
                                    <div [innerHTML]="getIcon('WhatsApp')" class="w-7 h-7 fill-white group-hover:rotate-12 transition-transform duration-500"></div>
                                    <span class="tracking-widest uppercase text-sm">مشاركة الرابط للعميل</span>
                                }
                                <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                            </button>
                        </div>
                    </div>
 
                    <button (click)="closeOrderModal()" class="w-full py-2 text-[#a09c94] font-black hover:text-[#7A4E2D] transition-all uppercase tracking-[0.4em] text-[10px] opacity-40 hover:opacity-100">
                        Dismiss and proceed
                    </button>
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
    showScanner = signal(false);
    showSettings = signal(false);
    
    // Customer Info
    customerName = signal('');
    customerPhone = signal('');

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
        // Load initial settings
        effect(() => {
            const settings = this.branding();
            if (settings) {
                if (settings.tax_rate !== undefined) this.taxRate.set(settings.tax_rate);
                if (settings.tax_enabled !== undefined) this.isTaxEnabled.set(settings.tax_enabled);
            }
        }, { allowSignalWrites: true });

        effect(() => {
            if (this.skuInput) this.skuInput.nativeElement.focus();
        });
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

    handleSearch() {
        if (!this.searchQuery) return;
        const query = this.searchQuery.trim();
        const product = this.inventoryService.getProductBySku(query);
        if (product) {
            this.addToCart(product);
            this.searchQuery = '';
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

        const orderItems: OrderItem[] = this.cart().map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.price * item.quantity
        }));

        const order = await this.inventoryService.createOrder({
            items: orderItems,
            subtotal: this.subtotal(),
            tax: this.tax(),
            total: this.total(),
            customerName: this.customerName() || 'عميل البوث',
            customerPhone: this.customerPhone(),
            notes: `تم البيع عبر واجهة البوث (${type})`
        });

        if (!order) return;
        this.lastOrder.set(order);

        if (type === 'thermal') {
            const html = this.printService.generateThermalHtml(order);
            this.printService.print(html);
        } else if (type === 'pdf') {
            this.printService.downloadInvoiceAsPdf(order);
        } else if (type === 'whatsapp') {
            // Special handling for legacy direct WhatsApp button
            this.printService.shareViaWhatsApp(order);
        }

        this.cart.set([]);
        this.customerName.set('');
        this.customerPhone.set('');
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

    printLastOrder(type: 'pdf' | 'whatsapp') {
        const order = this.lastOrder();
        if (!order) return;
        
        if (type === 'pdf') {
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
}
