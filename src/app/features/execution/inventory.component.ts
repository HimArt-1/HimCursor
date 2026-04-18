import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, Product, Order, OrderItem, OrderForm, PRODUCT_CATEGORIES, FASHION_CATEGORIES, SIZES, COLORS, GENDER_TYPES, isFashionCategory } from '../../core/services/domain/inventory.service';
import { ToastService } from '../../core/services/state/toast.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { BarcodeScannerComponent } from '../../shared/ui/barcode-scanner.component';
import { RouterModule } from '@angular/router';
import { PrintService } from '../../core/services/utils/print.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeScannerComponent, RouterModule],
  template: `
    <div class="animate-fade-in-up space-y-8">
      <div class="glass-container p-8 rounded-[2.5rem] border border-white/20 shadow-2xl relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-br from-wushai-sand/5 to-transparent pointer-events-none"></div>
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <button (click)="goBack()" class="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all active:scale-95">
              <span [innerHTML]="getIcon('ArrowRight')" class="w-6 h-6 text-wushai-cocoa dark:text-wushai-sand"></span>
            </button>
            <div>
              <h1 class="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">المستودع الرقمي</h1>
              <p class="text-gray-500 dark:text-gray-400 mt-1 font-medium italic opacity-70">WASHA INFRASTRUCTURE & INVENTORY</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <button (click)="showScanner.set(true)" class="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-wushai-cocoa dark:text-wushai-sand rounded-2xl text-sm font-black flex items-center gap-2.5 transition-all active:scale-95 shadow-lg">
              <span [innerHTML]="getIcon('Barcode')" class="w-5 h-5"></span>
              مسح باركود
            </button>
            <a routerLink="/qr-maker" class="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-600 dark:text-gray-300 rounded-2xl text-sm font-black flex items-center gap-2.5 transition-all active:scale-95 shadow-lg">
              <span [innerHTML]="getIcon('Zap')" class="w-5 h-5"></span>
              استوديو QR
            </a>
            <button (click)="openAddOrder()" class="px-6 py-3.5 bg-wushai-sand text-wushai-cocoa rounded-2xl text-sm font-black flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-wushai-sand/20">
              <span [innerHTML]="getIcon('Plus')" class="w-5 h-5"></span>
              طلب جديد
            </button>
            <button (click)="openAddProduct()" class="px-6 py-3.5 bg-gradient-to-r from-wushai-cocoa to-wushai-espresso text-white rounded-2xl text-sm font-black flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-wushai-cocoa/20">
              <span [innerHTML]="getIcon('Plus')" class="w-5 h-5"></span>
              منتج جديد
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div class="glass-card rounded-[2rem] p-6 border border-white/10 hover:border-wushai-sand/30 transition-all hover:-translate-y-1">
          <div class="flex items-center gap-3 mb-3">
            <div class="p-2.5 bg-wushai-sand/10 rounded-xl text-wushai-cocoa dark:text-wushai-sand">
              <span [innerHTML]="getIcon('Library')" class="w-5 h-5"></span>
            </div>
            <p class="text-xs font-black text-gray-400 uppercase tracking-widest">إجمالي المنتجات</p>
          </div>
          <p class="text-3xl font-black text-gray-900 dark:text-white">{{ inventoryService.totalProducts() }}</p>
        </div>

        <div class="glass-card rounded-[2rem] p-6 border border-white/10 hover:border-emerald-500/30 transition-all hover:-translate-y-1">
          <div class="flex items-center gap-3 mb-3">
            <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
              <span [innerHTML]="getIcon('DollarSign')" class="w-5 h-5"></span>
            </div>
            <p class="text-xs font-black text-gray-400 uppercase tracking-widest">قيمة المخزن</p>
          </div>
          <div class="flex items-baseline gap-1">
            <p class="text-3xl font-black text-emerald-600">{{ inventoryService.totalStockValue() | number:'1.0-0' }}</p>
            <span class="text-[10px] font-bold text-gray-400">ر.س</span>
          </div>
        </div>

        <div class="glass-card rounded-[2rem] p-6 border border-white/10 hover:border-amber-500/30 transition-all hover:-translate-y-1">
          <div class="flex items-center gap-3 mb-3">
            <div class="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
              <span [innerHTML]="getIcon('AlertTriangle')" class="w-5 h-5"></span>
            </div>
            <p class="text-xs font-black text-gray-400 uppercase tracking-widest">تحذير المخزون</p>
          </div>
          <p class="text-3xl font-black text-amber-600">{{ inventoryService.lowStockProducts().length }}</p>
        </div>

        <div class="glass-card rounded-[2rem] p-6 border border-white/10 hover:border-blue-500/30 transition-all hover:-translate-y-1 md:hidden lg:block">
          <div class="flex items-center gap-3 mb-3">
            <div class="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
              <span [innerHTML]="getIcon('Truck')" class="w-5 h-5"></span>
            </div>
            <p class="text-xs font-black text-gray-400 uppercase tracking-widest">قيد التوصيل</p>
          </div>
          <p class="text-3xl font-black text-blue-600">{{ inventoryService.pendingOrders().length }}</p>
        </div>

        <div class="glass-card rounded-[2rem] p-6 border border-white/10 hover:border-wushai-lilac/30 transition-all hover:-translate-y-1">
          <div class="flex items-center gap-3 mb-3">
            <div class="p-2.5 bg-wushai-lilac/10 rounded-xl text-wushai-lilac">
              <span [innerHTML]="getIcon('Activity')" class="w-5 h-5"></span>
            </div>
            <p class="text-xs font-black text-gray-400 uppercase tracking-widest">صافي الأرباح</p>
          </div>
          <p class="text-3xl font-black text-wushai-lilac">{{ inventoryService.totalRevenue() | number:'1.0-0' }}</p>
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-6">
        <div class="flex-1 space-y-6">
          <div class="flex items-center justify-between">
            <div class="flex gap-2 p-1.5 bg-white/5 dark:bg-black/20 rounded-2xl border border-white/10 backdrop-blur-xl">
              <button (click)="activeTab.set('products')" 
                class="px-8 py-3 rounded-xl text-sm font-black transition-all"
                [ngClass]="activeTab() === 'products' ? 'bg-wushai-cocoa text-white shadow-xl' : 'text-gray-500 hover:bg-white/5'">
                المنتجات
              </button>
              <button (click)="activeTab.set('orders')" 
                class="px-8 py-3 rounded-xl text-sm font-black transition-all"
                [ngClass]="activeTab() === 'orders' ? 'bg-wushai-cocoa text-white shadow-xl' : 'text-gray-500 hover:bg-white/5'">
                الطلبات
              </button>
            </div>

            <div class="relative w-full max-w-sm hidden md:block">
              <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-40">
                <span [innerHTML]="getIcon('Search')" class="w-4 h-4"></span>
              </div>
              <input type="text" [(ngModel)]="searchQuery" name="search" placeholder="ابحث في سجلات النظام..."
                class="w-full pr-12 pl-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold outline-none focus:border-wushai-sand/50 focus:ring-4 focus:ring-wushai-sand/5 transition-all">
            </div>
          </div>

          @if(activeTab() === 'products') {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              @for(product of filteredProducts(); track product.id) {
                <div class="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-wushai-sand/40 transition-all group flex flex-col h-full">
                  <!-- Product Visual -->
                  <div class="h-48 relative overflow-hidden bg-white/5">
                    @if(product.imageUrl) {
                      <img [src]="product.imageUrl" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                    } @else {
                      <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-wushai-sand/10 to-transparent">
                        <span [innerHTML]="getIcon('Image')" class="w-12 h-12 text-wushai-sand/20"></span>
                      </div>
                    }
                    
                    <!-- Floating Status -->
                    <div class="absolute top-4 left-4 flex flex-col gap-2">
                      <span class="px-3 py-1.5 rounded-xl text-[10px] font-black backdrop-blur-md shadow-lg flex items-center gap-1.5"
                        [ngClass]="product.stock <= product.minStock ? 'bg-red-500/80 text-white' : 'bg-emerald-500/80 text-white'">
                        <div class="w-1.5 h-1.5 rounded-full bg-current"></div>
                        {{ product.stock }} في المخزون
                      </span>
                    </div>

                    <!-- Overlay Actions -->
                    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                       <button (click)="editProduct(product)" class="p-3 bg-white text-wushai-cocoa rounded-full hover:scale-110 transition-transform">
                         <span [innerHTML]="getIcon('Edit')" class="w-5 h-5"></span>
                       </button>
                    </div>
                  </div>

                  <div class="p-6 flex-1 flex flex-col">
                    <div class="flex justify-between items-start mb-4">
                      <div>
                        <h3 class="font-black text-lg text-gray-900 dark:text-white leading-tight mb-1">{{ product.name }}</h3>
                        <p class="text-[10px] text-gray-400 font-bold tracking-widest uppercase">{{ product.sku }} · {{ product.category }}</p>
                      </div>
                      <div class="text-left">
                        <p class="text-2xl font-black text-wushai-cocoa dark:text-wushai-sand">{{ product.price | number:'1.0-0' }}</p>
                        <p class="text-[8px] font-black text-gray-400 uppercase">ريال</p>
                      </div>
                    </div>

                    <!-- Specs -->
                    @if(product.size || product.color || product.gender) {
                      <div class="flex flex-wrap gap-2 mb-6">
                        @if(product.size) {
                          <span class="px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-black border border-blue-500/10">{{ product.size }}</span>
                        }
                        @if(product.color) {
                          <span class="px-2.5 py-1 bg-purple-500/10 text-purple-500 rounded-lg text-[10px] font-black border border-purple-500/10">{{ product.color }}</span>
                        }
                        @if(product.gender) {
                          <span class="px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black border border-amber-500/10">{{ product.gender }}</span>
                        }
                      </div>
                    }

                    <div class="flex gap-3 mt-auto">
                      <button (click)="inventoryService.adjustStock(product.id, 1)" class="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black transition-all active:scale-95">
                        زيادة (+1)
                      </button>
                      <button (click)="inventoryService.adjustStock(product.id, -1)" class="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black transition-all active:scale-95 text-red-500">
                        إنقاص (-1)
                      </button>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="col-span-full py-24 glass-card rounded-[3rem] text-center border border-white/5">
                  <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                    <span [innerHTML]="getIcon('Search')" class="w-10 h-10 opacity-20"></span>
                  </div>
                  <h3 class="text-xl font-black text-gray-500">لا يوجد نتائج لبحثك</h3>
                  <p class="text-sm text-gray-400 mt-2">جرب البحث بكلمات مختلفة أو أضف منتجاً جديداً</p>
                </div>
              }
            </div>
          }

          @if(activeTab() === 'orders') {
            <div class="space-y-4">
              @for(order of orders(); track order.id) {
                <div class="glass-card rounded-[2rem] p-6 border border-white/5 hover:border-wushai-sand/30 transition-all group">
                  <div class="flex flex-col lg:flex-row lg:items-center gap-6">
                    <!-- Order Identity -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <span class="px-3 py-1 bg-wushai-cocoa text-white rounded-lg text-[10px] font-black tracking-widest shadow-lg shadow-wushai-cocoa/20 uppercase">
                          {{ order.orderNumber }}
                        </span>
                        <span class="px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider"
                          [ngClass]="{
                            'bg-amber-500/10 text-amber-500 border-amber-500/20': order.status === 'pending',
                            'bg-blue-500/10 text-blue-500 border-blue-500/20': order.status === 'processing',
                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': order.status === 'delivered',
                            'bg-red-500/10 text-red-500 border-red-500/20': order.status === 'cancelled'
                          }">{{ orderStatusLabel(order.status) }}</span>
                        <span class="px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider"
                          [ngClass]="{
                            'bg-gray-500/10 text-gray-400 border-gray-500/20': order.paymentStatus === 'unpaid',
                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': order.paymentStatus === 'paid',
                            'bg-red-500/10 text-red-500 border-red-500/20': order.paymentStatus === 'refunded'
                          }">{{ paymentLabel(order.paymentStatus) }}</span>
                      </div>
                      <h4 class="text-lg font-black text-gray-900 dark:text-white mb-0.5">{{ order.customerName }}</h4>
                      <p class="text-xs text-gray-400 font-medium">{{ order.items.length }} عناصر مختارة · {{ order.createdAt | date:'HH:mm · dd MMM yyyy' }}</p>
                    </div>

                    <!-- Order Actions -->
                    <div class="flex flex-wrap items-center gap-4 border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
                      <div class="text-right lg:mx-8">
                        <p class="text-2xl font-black text-gray-900 dark:text-white">{{ order.total | number:'1.2-2' }}</p>
                        <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">المبلغ الإجمالي (ريال)</p>
                      </div>

                      <div class="flex gap-2">
                        <button (click)="openQuickShare(order)" class="p-3.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/5 group/share">
                          <span [innerHTML]="getIcon('Share2')" class="w-5 h-5 group-hover/share:scale-110 transition-transform"></span>
                        </button>
                        <div class="flex flex-col gap-1.5">
                           <select [ngModel]="order.status" (ngModelChange)="inventoryService.updateOrderStatus(order.id, $event)"
                            class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black outline-none focus:border-wushai-sand/50 transition-all appearance-none cursor-pointer min-w-[120px]">
                            <option value="pending">⏳ معلق</option>
                            <option value="processing">⚙️ التنفيذ</option>
                            <option value="shipped">🚚 مشحون</option>
                            <option value="delivered">✅ اكتمل</option>
                            <option value="cancelled">❌ ملغي</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="py-24 glass-card rounded-[3rem] text-center border border-white/5 shadow-2xl">
                  <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                    <span [innerHTML]="getIcon('ShoppingBag')" class="w-10 h-10 opacity-20"></span>
                  </div>
                  <h3 class="text-xl font-black text-gray-500 italic">سجل المبيعات فارغ</h3>
                  <p class="text-sm text-gray-400 mt-2">ابدأ بإضافة أول طلب من قسم البوث</p>
                </div>
              }
            </div>
          }
        </div>
      </div>

      @if(showProductModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-xl animate-fade-in" (click)="showProductModal.set(false)"></div>
          <div class="glass-card rounded-[3rem] w-full max-w-xl max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl relative z-60 animate-scale-in custom-scrollbar">
            <div class="p-8 border-b border-white/10 flex justify-between items-center sticky top-0 bg-black/20 backdrop-blur-xl z-20">
              <div>
                <h3 class="text-2xl font-black text-white tracking-tight">{{ editingProductId() ? 'تعديل البيانات' : 'تأسيس منتج جديد' }}</h3>
                <p class="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest opacity-60">Product Infrastructure Engine</p>
              </div>
              <button (click)="showProductModal.set(false)" class="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
                <span [innerHTML]="getIcon('X')" class="w-6 h-6 text-gray-400"></span>
              </button>
            </div>
            
            <div class="p-8 space-y-8">
              <div class="relative group cursor-pointer" (click)="fileInput.click()">
                <div class="h-48 rounded-[2.5rem] border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center transition-all group-hover:border-wushai-sand/50 group-hover:bg-wushai-sand/5 overflow-hidden relative">
                  @if(productForm.imageUrl) {
                    <img [src]="productForm.imageUrl" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                      <span class="px-6 py-2 bg-white text-wushai-cocoa rounded-xl text-xs font-black shadow-xl">تغيير الصورة</span>
                    </div>
                  } @else {
                    <div class="p-5 rounded-full bg-white/5 text-wushai-sand mb-4 group-hover:scale-110 transition-all duration-500">
                      <span [innerHTML]="getIcon('Camera')" class="w-8 h-8"></span>
                    </div>
                    <p class="text-sm font-black text-gray-400">اسحب الصورة هنا أو اضغط للرفع</p>
                    <p class="text-[9px] text-gray-500 font-bold mt-1 uppercase tracking-[0.2em] opacity-50">HI-RES ASSETS ONLY</p>
                  }
                </div>
                <input #fileInput type="file" (change)="onFileSelected($event)" accept="image/*" class="hidden">
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">مسمى المنتج</label>
                  <input type="text" [(ngModel)]="productForm.name" class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-wushai-sand/50 transition-all" placeholder="ادخل اسم المنتج...">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">الرمز التسلسلي SKU</label>
                  <input type="text" [(ngModel)]="productForm.sku" class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-wushai-sand/50 transition-all font-mono" placeholder="WS-XXXXX">
                </div>
              </div>

              <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <div class="space-y-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">سعر البيع</label>
                  <input type="number" [(ngModel)]="productForm.price" class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">التكلفة</label>
                  <input type="number" [(ngModel)]="productForm.cost" class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-gray-400 outline-none focus:border-amber-500/50 transition-all">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">الكمية</label>
                  <input type="number" [(ngModel)]="productForm.stock" class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-wushai-sand/50 transition-all">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">الحد الأدنى</label>
                  <input type="number" [(ngModel)]="productForm.minStock" class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-red-500/50 transition-all">
                </div>
              </div>

              <div class="pt-6 border-t border-white/10 flex gap-4">
                <button (click)="saveProduct()" class="flex-1 py-5 bg-gradient-to-r from-wushai-cocoa to-wushai-espresso text-white rounded-3xl font-black text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                  مزامنة المنتج مع السحابة
                </button>
                @if(editingProductId()) {
                  <button (click)="deleteProduct()" class="px-8 py-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-3xl font-black text-sm hover:bg-red-500 hover:text-white transition-all active:scale-95">
                    حذف الكيان
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }

      @if(showOrderModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-xl animate-fade-in" (click)="showOrderModal.set(false)"></div>
          <div class="glass-card rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl relative z-60 animate-scale-in custom-scrollbar">
            <div class="p-8 border-b border-white/10 flex justify-between items-center sticky top-0 bg-black/20 backdrop-blur-xl z-20">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-wushai-sand rounded-2xl flex items-center justify-center text-wushai-cocoa shadow-lg">
                  <span [innerHTML]="getIcon('ShoppingBag')" class="w-6 h-6"></span>
                </div>
                <div>
                  <h3 class="text-2xl font-black text-white tracking-tight">إنشاء معاملة جديدة</h3>
                  <p class="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest opacity-60">Inventory Disbursement or Restock</p>
                </div>
              </div>
              <button (click)="showOrderModal.set(false)" class="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
                <span [innerHTML]="getIcon('X')" class="w-6 h-6 text-gray-400"></span>
              </button>
            </div>

            <div class="p-8 space-y-8">
              <!-- Type Selector -->
              <div class="flex p-1.5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                <button (click)="orderForm.type = 'sale'" 
                  class="flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                  [ngClass]="orderForm.type === 'sale' ? 'bg-wushai-cocoa text-white shadow-xl' : 'text-gray-500 hover:text-white'">
                  <span>🛒</span> عملية مبيع
                </button>
                <button (click)="orderForm.type = 'restock'" 
                  class="flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                  [ngClass]="orderForm.type === 'restock' ? 'bg-amber-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'">
                  <span>📦</span> توريد للمخزون
                </button>
              </div>

              <!-- Payment Status -->
              <div class="flex p-1.5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                <button (click)="orderForm.paymentStatus = 'paid'" 
                  class="flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2"
                  [ngClass]="orderForm.paymentStatus === 'paid' ? 'bg-emerald-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'">
                  ✅ مدفوع
                </button>
                <button (click)="orderForm.paymentStatus = 'unpaid'" 
                  class="flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2"
                  [ngClass]="orderForm.paymentStatus === 'unpaid' ? 'bg-red-600 text-white shadow-xl' : 'text-gray-500 hover:text-white'">
                  ⏳ غير مدفوع
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">اسم الجهة / العميل</label>
                  <input type="text" [(ngModel)]="orderForm.customerName" class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-wushai-sand/50 transition-all">
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">رقم التواصل</label>
                  <input type="text" [(ngModel)]="orderForm.customerPhone" class="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-wushai-sand/50 transition-all font-mono">
                </div>
              </div>

              <div class="space-y-4">
                 <div class="flex items-center justify-between px-2">
                   <h4 class="text-sm font-black text-gray-400 uppercase tracking-widest">تفاصيل العناصر</h4>
                   <button (click)="addOrderItem()" class="p-2 bg-wushai-sand/10 text-wushai-sand hover:bg-wushai-sand hover:text-wushai-cocoa rounded-xl transition-all">
                     <span [innerHTML]="getIcon('Plus')" class="w-5 h-5"></span>
                   </button>
                 </div>

                 @for(item of orderForm.items; track $index) {
                   <div class="p-6 bg-white/5 border border-white/10 rounded-[2rem] flex flex-wrap lg:flex-nowrap items-end gap-4 relative animate-fade-in group">
                     <div class="flex-1 min-w-[200px] space-y-2">
                        <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest block pr-2">المنتج</label>
                        <select [(ngModel)]="item.productId" (change)="onOrderProductChange($index)"
                          class="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-wushai-sand focus:bg-black/20 appearance-none">
                          <option value="">— اختر المنتج —</option>
                          @for(p of products(); track p.id) {
                            <option [value]="p.id">{{p.name}} ({{p.sku}})</option>
                          }
                        </select>
                     </div>
                     
                     <div class="w-24 space-y-2">
                        <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest block pr-2">الكمية</label>
                        <input type="number" [(ngModel)]="item.quantity" class="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500">
                     </div>

                     @if(isOrderItemFashion($index)) {
                       <div class="w-32 space-y-2">
                          <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest block pr-2">المقاس</label>
                          <select [(ngModel)]="item.size" class="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none appearance-none">
                             @for(s of sizes; track s) { <option [value]="s">{{s}}</option> }
                          </select>
                       </div>
                       <div class="w-32 space-y-2">
                          <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest block pr-2">اللون</label>
                          <select [(ngModel)]="item.color" class="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none appearance-none">
                             @for(c of colors; track c) { <option [value]="c">{{c}}</option> }
                          </select>
                       </div>
                     }

                     <button (click)="orderForm.items.splice($index, 1)" class="p-3.5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                       <span [innerHTML]="getIcon('Trash')" class="w-5 h-5"></span>
                     </button>
                   </div>
                 }
              </div>

              <button (click)="submitOrder()" class="w-full py-5 bg-gradient-to-r from-wushai-sand to-wushai-bitter text-wushai-cocoa rounded-3xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                اعتماد العملية ومزامنة السجلات
              </button>
            </div>
          </div>
        </div>
      }

      @if(orderToShare()) {
         <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/80 backdrop-blur-2xl animate-fade-in" (click)="orderToShare.set(null)"></div>
          <div class="glass-card rounded-[3.5rem] w-full max-w-sm border border-white/20 shadow-2xl relative z-60 animate-scale-in p-8 text-center overflow-hidden">
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-[100px] rounded-full"></div>
            
            <div class="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-emerald-500 relative">
               <span [innerHTML]="getIcon('Share2')" class="w-10 h-10"></span>
               @if(isSharing()) {
                <div class="absolute inset-0 border-4 border-emerald-500/30 border-t-emerald-500 rounded-[2rem] animate-spin"></div>
               }
            </div>

            <h3 class="text-2xl font-black text-white mb-2">مشاركة الفاتورة</h3>
            <p class="text-sm text-gray-400 mb-8 font-medium">سيتم تحويل الطلب رقم <span class="text-wushai-sand">#{{orderToShare()?.orderNumber}}</span> إلى PDF وإرساله عبر الواتساب</p>

            <div class="space-y-3">
              <button (click)="confirmShare(orderToShare()!, 'formal')" [disabled]="isSharing()"
                class="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-black text-white transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                <span class="text-lg">👔</span> قالب رسمي واحترافي
              </button>
              <button (click)="confirmShare(orderToShare()!, 'friendly')" [disabled]="isSharing()"
                class="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-black text-white transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                <span class="text-lg">✨</span> قالب وشّى الودود
              </button>
              <button (click)="confirmShare(orderToShare()!, 'short')" [disabled]="isSharing()"
                class="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-black text-white transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                <span class="text-lg">⚡️</span> رسالة سريعة ومختصرة
              </button>
            </div>

            <button (click)="orderToShare.set(null)" [disabled]="isSharing()" class="mt-8 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors disabled:opacity-0">
              إغلاق النافذة
            </button>
          </div>
        </div>
      }

      @if (showScanner()) {
        <app-barcode-scanner (scanSuccess)="onScanSuccess($event)" (onClosed)="showScanner.set(false)"></app-barcode-scanner>
      }
    </div>
  `
})
export class InventoryComponent {
  inventoryService = inject(InventoryService);
  private toastService = inject(ToastService);
  private printService = inject(PrintService);
  private sanitizer = inject(DomSanitizer);
  private location = inject(Location);

  activeTab = signal<'products' | 'orders'>('products');
  searchQuery = '';
  showProductModal = signal(false);
  showOrderModal = signal(false);
  showScanner = signal(false);
  editingProductId = signal<string | null>(null);
  isUploading = signal(false);
  orderToShare = signal<Order | null>(null);
  isSharing = signal(false);

  products = this.inventoryService.products;
  orders = this.inventoryService.orders;

  // Fashion constants
  categories = PRODUCT_CATEGORIES;
  sizes = SIZES;
  colors = COLORS;
  genderTypes = GENDER_TYPES;

  productForm: Partial<Product> = {};
  orderForm: OrderForm = {
    type: 'sale', customerName: '', customerPhone: '', paymentStatus: 'paid', items: [{ productId: '', quantity: 1 }]
  };

  isFashion(category?: string): boolean {
    return !!category && isFashionCategory(category);
  }

  isOrderItemFashion(index: number): boolean {
    const item = this.orderForm.items[index];
    if (!item?.productId) return false;
    const product = this.products().find(p => p.id === item.productId);
    return !!product && isFashionCategory(product.category);
  }

  filteredProducts = computed(() => {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  });

  openAddProduct() {
    this.productForm = { category: 'عام', stock: 0, minStock: 5, price: 0, cost: 0 };
    this.editingProductId.set(null);
    this.showProductModal.set(true);
  }

  editProduct(p: Product) {
    this.productForm = { ...p };
    this.editingProductId.set(p.id);
    this.showProductModal.set(true);
  }

  saveProduct() {
    if (!this.productForm.name) return;
    if (this.editingProductId()) {
      this.inventoryService.updateProduct(this.editingProductId()!, this.productForm);
      this.toastService.show('تم تحديث المنتج', 'success');
    } else {
      this.inventoryService.addProduct(this.productForm);
      this.toastService.show('تم إضافة المنتج', 'success');
    }
    this.showProductModal.set(false);
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.toastService.show('حجم الصورة كبير جداً (الأقصى 2 ميجابايت)', 'error');
      return;
    }

    this.isUploading.set(true);
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const url = await this.inventoryService.uploadProductImage(fileName, file);
    
    if (url) {
      this.productForm.imageUrl = url;
      this.toastService.show('تم رفع الصورة بنجاح', 'success');
    }
    this.isUploading.set(false);
  }

  onScanSuccess(sku: string) {
    const product = this.inventoryService.getProductBySku(sku);
    if (product) {
      this.showScanner.set(false);
      this.editProduct(product);
    } else {
      alert(`المنتج بالرمز ${sku} غير موجود`);
    }
  }

  deleteProduct() {
    if (this.editingProductId()) {
      this.inventoryService.deleteProduct(this.editingProductId()!);
      this.toastService.show('تم حذف المنتج', 'success');
      this.showProductModal.set(false);
    }
  }

  openAddOrder() {
    this.orderForm = { type: 'sale', customerName: '', customerPhone: '', paymentStatus: 'paid', items: [{ productId: '', quantity: 1, size: '', color: '', gender: '' }] };
    this.showOrderModal.set(true);
  }

  addOrderItem() {
    this.orderForm.items.push({ productId: '', quantity: 1, size: '', color: '', gender: '' });
  }

  onOrderProductChange(index: number) {
    const item = this.orderForm.items[index];
    const product = this.products().find(p => p.id === item.productId);
    if (product) item.quantity = 1;
  }

  submitOrder() {
    const items: OrderItem[] = this.orderForm.items
      .filter(i => i.productId)
      .map(i => {
        const product = this.products().find(p => p.id === i.productId)!;
        const isRestock = this.orderForm.type === 'restock';
        const unitPrice = isRestock ? (product?.cost || 0) : (product?.price || 0);
        const item: OrderItem = {
          productId: i.productId,
          productName: product?.name || '',
          quantity: i.quantity,
          unitPrice: unitPrice,
          total: i.quantity * unitPrice
        };
        if (i.size) item.size = i.size;
        if (i.color) item.color = i.color;
        if (i.gender) item.gender = i.gender;
        return item;
      });

    if (items.length === 0) return;
    this.inventoryService.createOrder({
      type: this.orderForm.type,
      customerName: this.orderForm.customerName,
      customerPhone: this.orderForm.customerPhone,
      paymentStatus: this.orderForm.paymentStatus,
      items
    });
    this.toastService.show(this.orderForm.type === 'restock' ? 'تم تسجيل عملية التوريد' : 'تم إنشاء الطلب', 'success');
    this.showOrderModal.set(false);
  }

  orderStatusLabel(s: string): string {
    const map: Record<string, string> = { pending: 'معلق', processing: 'قيد التنفيذ', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي' };
    return map[s] || s;
  }

  paymentLabel(s: string): string {
    const map: Record<string, string> = { unpaid: 'غير مدفوع', paid: 'مدفوع', refunded: 'مسترد' };
    return map[s] || s;
  }

  getIcon(name: keyof typeof Icons): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(Icons[name]);
  }

  goBack() {
    this.location.back();
  }

  openQuickShare(order: Order) {
    this.orderToShare.set(order);
  }

  async confirmShare(order: Order, templateId: string) {
    this.isSharing.set(true);
    try {
      this.toastService.show('جاري إنشاء ورقع الفاتورة...', 'info');
      const url = await this.printService.uploadInvoiceAndGetUrl(order);
      if (url) {
        this.printService.shareViaWhatsApp(order, templateId, url);
        this.toastService.show('تم تجهيز الرابط للفتح في واتساب', 'success');
      } else {
        this.toastService.show('فشل رفع الفاتورة، سيتم المشاركة بدون رابط', 'warning');
        this.printService.shareViaWhatsApp(order, templateId);
      }
    } catch (error) {
      this.toastService.show('حدث خطأ أثناء المشاركة', 'error');
    } finally {
      this.isSharing.set(false);
      this.orderToShare.set(null);
    }
  }
}
