import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, Product, Order, OrderItem, PRODUCT_CATEGORIES, FASHION_CATEGORIES, SIZES, COLORS, GENDER_TYPES, isFashionCategory } from '../../core/services/domain/inventory.service';
import { ToastService } from '../../core/services/state/toast.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Icons } from '../../shared/ui/icons';
import { BarcodeScannerComponent } from '../../shared/ui/barcode-scanner.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeScannerComponent, RouterModule],
  template: `
    <div class="animate-fade-in-up">
      <!-- Header -->
        <div class="flex gap-2">
          <button (click)="showScanner.set(true)" class="px-4 py-2.5 bg-wushai-sand/20 dark:bg-wushai-lilac/10 hover:bg-wushai-sand/30 text-wushai-cocoa dark:text-wushai-sand rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all">
            <span [innerHTML]="getIcon('Barcode')" class="w-4 h-4"></span>
            مسح باركود
          </button>
          <a routerLink="/qr-maker" class="px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all" title="صانع الرموز">
            <span [innerHTML]="getIcon('Zap')" class="w-4 h-4"></span>
            صانع QR
          </a>
          <button (click)="openAddProduct()" class="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5">
            <span [innerHTML]="getIcon('Plus')" class="w-4 h-4"></span>
            منتج جديد
          </button>
          <button (click)="openAddOrder()" class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20">
            <span [innerHTML]="getIcon('ShoppingCart')" class="w-4 h-4"></span>
            طلب جديد
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div class="stat-card rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">المنتجات</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">{{ inventoryService.totalProducts() }}</p>
        </div>
        <div class="stat-card rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">قيمة المخزون</p>
          <p class="text-xl font-bold gradient-text mt-1">{{ inventoryService.totalStockValue() | number:'1.0-0' }}</p>
        </div>
        <div class="stat-card rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">نفاد قريب</p>
          <p class="text-xl font-bold text-amber-600 mt-1">{{ inventoryService.lowStockProducts().length }}</p>
        </div>
        <div class="stat-card rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">طلبات معلقة</p>
          <p class="text-xl font-bold text-blue-600 mt-1">{{ inventoryService.pendingOrders().length }}</p>
        </div>
        <div class="stat-card rounded-xl p-4">
          <p class="text-xs text-gray-500 dark:text-gray-400">الإيرادات</p>
          <p class="text-xl font-bold text-emerald-600 mt-1">{{ inventoryService.totalRevenue() | number:'1.0-0' }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-5 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
        <button (click)="activeTab.set('products')" class="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
          [ngClass]="activeTab() === 'products' ? 'bg-white dark:bg-white/10 text-wushai-cocoa dark:text-wushai-sand shadow-sm' : 'text-gray-500 dark:text-gray-400'">
          المنتجات
        </button>
        <button (click)="activeTab.set('orders')" class="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
          [ngClass]="activeTab() === 'orders' ? 'bg-white dark:bg-white/10 text-wushai-cocoa dark:text-wushai-sand shadow-sm' : 'text-gray-500 dark:text-gray-400'">
          الطلبات
        </button>
      </div>

      <!-- Products Tab -->
      @if(activeTab() === 'products') {
        <!-- Search -->
        <div class="mb-4">
          <input type="text" [(ngModel)]="searchQuery" name="search" placeholder="بحث عن منتج..."
            class="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-wushai-cocoa outline-none">
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for(product of filteredProducts(); track product.id) {
            <div class="glass-card rounded-xl overflow-hidden hover:shadow-xl transition-all group">
              <!-- Product Image -->
              <div class="h-32 bg-gradient-to-br from-wushai-sand/20 to-wushai-sand/20 dark:from-wushai-espresso/30 dark:to-wushai-espresso/30 flex items-center justify-center relative">
                @if(product.imageUrl) {
                  <img [src]="product.imageUrl" class="w-full h-full object-cover">
                } @else {
                  <span [innerHTML]="getIcon('ShoppingCart')" class="w-10 h-10 text-wushai-sand dark:text-wushai-cocoa"></span>
                }
                <!-- Stock Badge -->
                <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  [ngClass]="product.stock <= product.minStock ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'">
                  {{ product.stock }} في المخزون
                </span>
              </div>

              <div class="p-4">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h3 class="font-bold text-sm text-gray-900 dark:text-white">{{ product.name }}</h3>
                    <p class="text-xs text-gray-400">{{ product.sku }} · {{ product.category }}</p>
                  </div>
                  <p class="text-lg font-bold gradient-text">{{ product.price }}</p>
                </div>
                @if(product.size || product.color || product.gender) {
                  <div class="flex flex-wrap gap-1 mb-2">
                    @if(product.size) {
                      <span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded text-[10px] font-bold">{{ product.size }}</span>
                    }
                    @if(product.color) {
                      <span class="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded text-[10px] font-bold">{{ product.color }}</span>
                    }
                    @if(product.gender) {
                      <span class="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold">{{ product.gender }}</span>
                    }
                  </div>
                }

                <div class="flex gap-2 mt-3">
                  <button (click)="editProduct(product)" class="flex-1 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors">
                    تعديل
                  </button>
                  <button (click)="inventoryService.adjustStock(product.id, 1)" class="py-2 px-3 bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors">
                    +1
                  </button>
                  <button (click)="inventoryService.adjustStock(product.id, -1)" class="py-2 px-3 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 rounded-lg text-xs font-bold text-red-700 dark:text-red-400 transition-colors">
                    -1
                  </button>
                </div>
              </div>
            </div>
          } @empty {
            <div class="col-span-full text-center py-16 text-gray-400">
              <span [innerHTML]="getIcon('ShoppingCart')" class="w-12 h-12 mx-auto opacity-30 mb-3 block"></span>
              <p>لا توجد منتجات بعد</p>
            </div>
          }
        </div>
      }

      <!-- Orders Tab -->
      @if(activeTab() === 'orders') {
        <div class="space-y-3">
          @for(order of orders(); track order.id) {
            <div class="glass-card rounded-xl p-4">
              <div class="flex flex-col md:flex-row md:items-center gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-bold text-wushai-cocoa dark:text-wushai-sand">{{ order.orderNumber }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400': order.status === 'pending',
                        'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400': order.status === 'processing',
                        'bg-wushai-sand/20 text-wushai-cocoa dark:bg-wushai-cocoa/20 dark:text-wushai-sand': order.status === 'shipped',
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400': order.status === 'delivered',
                        'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400': order.status === 'cancelled'
                      }">{{ orderStatusLabel(order.status) }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400': order.paymentStatus === 'unpaid',
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400': order.paymentStatus === 'paid',
                        'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400': order.paymentStatus === 'refunded'
                      }">{{ paymentLabel(order.paymentStatus) }}</span>
                  </div>
                  <p class="text-sm text-gray-700 dark:text-gray-300 mt-1">{{ order.customerName }}</p>
                  <p class="text-xs text-gray-400">{{ order.items.length }} عنصر · {{ order.createdAt | date:'short' }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <p class="text-lg font-bold text-gray-900 dark:text-white">{{ order.total | number:'1.2-2' }} <span class="text-xs text-gray-400">ر.س</span></p>
                  <div class="flex gap-1">
                    <select [ngModel]="order.status" (ngModelChange)="inventoryService.updateOrderStatus(order.id, $event)" [name]="'status_'+order.id"
                      class="px-2 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs outline-none">
                      <option value="pending">معلق</option>
                      <option value="processing">قيد التنفيذ</option>
                      <option value="shipped">تم الشحن</option>
                      <option value="delivered">تم التسليم</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                    <select [ngModel]="order.paymentStatus" (ngModelChange)="inventoryService.updatePaymentStatus(order.id, $event)" [name]="'pay_'+order.id"
                      class="px-2 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs outline-none">
                      <option value="unpaid">غير مدفوع</option>
                      <option value="paid">مدفوع</option>
                      <option value="refunded">مسترد</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="text-center py-16 text-gray-400">
              <span [innerHTML]="getIcon('ShoppingCart')" class="w-12 h-12 mx-auto opacity-30 mb-3 block"></span>
              <p>لا توجد طلبات بعد</p>
            </div>
          }
        </div>
      }

      <!-- Add/Edit Product Modal -->
      @if(showProductModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="showProductModal.set(false)">
          <div class="bg-white dark:bg-[#1C1612] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl animate-scale-in" (click)="$event.stopPropagation()">
            <div class="p-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white dark:bg-[#1C1612] z-10">
              <h3 class="font-bold text-lg text-gray-900 dark:text-white">{{ editingProductId() ? 'تعديل المنتج' : 'منتج جديد' }}</h3>
              <button (click)="showProductModal.set(false)" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                <span [innerHTML]="getIcon('X')" class="w-5 h-5 text-gray-400"></span>
              </button>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">اسم المنتج</label>
                <input type="text" [(ngModel)]="productForm.name" name="pName" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الرمز (SKU)</label>
                  <input type="text" [(ngModel)]="productForm.sku" name="pSku" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">التصنيف</label>
                  <select [(ngModel)]="productForm.category" name="pCat" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
                    @for(cat of categories; track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">سعر البيع</label>
                  <input type="number" [(ngModel)]="productForm.price" name="pPrice" min="0" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">التكلفة</label>
                  <input type="number" [(ngModel)]="productForm.cost" name="pCost" min="0" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الكمية المتوفرة</label>
                  <input type="number" [(ngModel)]="productForm.stock" name="pStock" min="0" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الحد الأدنى</label>
                  <input type="number" [(ngModel)]="productForm.minStock" name="pMinStock" min="0" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
                </div>
              </div>
              @if(isFashion(productForm.category)) {
                <div class="p-3 bg-wushai-sand/10 dark:bg-wushai-cocoa/10 rounded-xl border border-wushai-sand/20 dark:border-wushai-cocoa/20 space-y-3">
                  <p class="text-xs font-bold text-wushai-cocoa dark:text-wushai-sand">خصائص الأزياء</p>
                  <div class="grid grid-cols-3 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">المقاس</label>
                      <select [(ngModel)]="productForm.size" name="pSize" class="w-full px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
                        <option value="">—</option>
                        @for(s of sizes; track s) {
                          <option [value]="s">{{ s }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">اللون</label>
                      <select [(ngModel)]="productForm.color" name="pColor" class="w-full px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
                        <option value="">—</option>
                        @for(c of colors; track c) {
                          <option [value]="c">{{ c }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">النوع</label>
                      <select [(ngModel)]="productForm.gender" name="pGender" class="w-full px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
                        <option value="">—</option>
                        @for(g of genderTypes; track g) {
                          <option [value]="g">{{ g }}</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>
              }
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">الوصف</label>
                <textarea [(ngModel)]="productForm.description" name="pDesc" rows="2" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa resize-none"></textarea>
              </div>
              <div class="flex gap-2">
                <button (click)="saveProduct()" class="btn-primary flex-1 py-3 rounded-xl font-bold text-sm">حفظ</button>
                @if(editingProductId()) {
                  <button (click)="deleteProduct()" class="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors">حذف</button>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Add Order Modal -->
      @if(showOrderModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="showOrderModal.set(false)">
          <div class="bg-white dark:bg-[#1C1612] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl animate-scale-in" (click)="$event.stopPropagation()">
            <div class="p-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
              <h3 class="font-bold text-lg text-gray-900 dark:text-white">طلب جديد</h3>
              <button (click)="showOrderModal.set(false)" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                <span [innerHTML]="getIcon('X')" class="w-5 h-5 text-gray-400"></span>
              </button>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">اسم العميل</label>
                <input type="text" [(ngModel)]="orderForm.customerName" name="oName" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">رقم الجوال</label>
                <input type="text" [(ngModel)]="orderForm.customerPhone" name="oPhone" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-wushai-cocoa">
              </div>

              <!-- Items -->
              <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">المنتجات</label>
                @for(item of orderForm.items; track $index; let i = $index) {
                  <div class="mb-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl space-y-2">
                    <div class="flex gap-2 items-center">
                      <select [(ngModel)]="item.productId" [name]="'oProd'+i" (ngModelChange)="onOrderProductChange(i)"
                        class="flex-1 px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none">
                        <option value="">اختر المنتج</option>
                        @for(p of products(); track p.id) {
                          <option [value]="p.id">{{ p.name }} ({{ p.stock }})</option>
                        }
                      </select>
                      <input type="number" [(ngModel)]="item.quantity" [name]="'oQty'+i" min="1" class="w-20 px-3 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-center outline-none">
                      <button (click)="orderForm.items.splice(i, 1)" class="p-2 text-red-400 hover:text-red-500">
                        <span [innerHTML]="getIcon('X')" class="w-4 h-4"></span>
                      </button>
                    </div>
                    @if(isOrderItemFashion(i)) {
                      <div class="grid grid-cols-3 gap-2">
                        <select [(ngModel)]="item.size" [name]="'oSize'+i" class="px-2 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs outline-none">
                          <option value="">المقاس</option>
                          @for(s of sizes; track s) {
                            <option [value]="s">{{ s }}</option>
                          }
                        </select>
                        <select [(ngModel)]="item.color" [name]="'oColor'+i" class="px-2 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs outline-none">
                          <option value="">اللون</option>
                          @for(c of colors; track c) {
                            <option [value]="c">{{ c }}</option>
                          }
                        </select>
                        <select [(ngModel)]="item.gender" [name]="'oGender'+i" class="px-2 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs outline-none">
                          <option value="">النوع</option>
                          @for(g of genderTypes; track g) {
                            <option [value]="g">{{ g }}</option>
                          }
                        </select>
                      </div>
                    }
                  </div>
                }
                <button (click)="addOrderItem()" class="text-xs text-wushai-cocoa dark:text-wushai-sand font-bold flex items-center gap-1">
                  <span [innerHTML]="getIcon('Plus')" class="w-3.5 h-3.5"></span>
                  إضافة منتج
                </button>
              </div>

              <button (click)="submitOrder()" class="btn-primary w-full py-3 rounded-xl font-bold text-sm">إنشاء الطلب</button>
            </div>
          </div>
        </div>
      }

      <!-- Scanner Overlay -->
      @if (showScanner()) {
        <app-barcode-scanner (scanSuccess)="onScanSuccess($event)" (onClosed)="showScanner.set(false)"></app-barcode-scanner>
      }
    </div>
  `
})
export class InventoryComponent {
  inventoryService = inject(InventoryService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private location = inject(Location);

  activeTab = signal<'products' | 'orders'>('products');
  searchQuery = '';
  showProductModal = signal(false);
  showOrderModal = signal(false);
  showScanner = signal(false);
  editingProductId = signal<string | null>(null);

  products = this.inventoryService.products;
  orders = this.inventoryService.orders;

  // Fashion constants
  readonly categories = PRODUCT_CATEGORIES;
  readonly sizes = SIZES;
  readonly colors = COLORS;
  readonly genderTypes = GENDER_TYPES;

  productForm: Partial<Product> = {};
  orderForm: { customerName: string; customerPhone: string; items: { productId: string; quantity: number; size?: string; color?: string; gender?: string }[] } = {
    customerName: '', customerPhone: '', items: [{ productId: '', quantity: 1 }]
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
    this.orderForm = { customerName: '', customerPhone: '', items: [{ productId: '', quantity: 1, size: '', color: '', gender: '' }] };
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
        const item: OrderItem = {
          productId: i.productId,
          productName: product?.name || '',
          quantity: i.quantity,
          unitPrice: product?.price || 0,
          total: i.quantity * (product?.price || 0)
        };
        if (i.size) item.size = i.size;
        if (i.color) item.color = i.color;
        if (i.gender) item.gender = i.gender;
        return item;
      });

    if (items.length === 0) return;
    this.inventoryService.createOrder({
      customerName: this.orderForm.customerName,
      customerPhone: this.orderForm.customerPhone,
      items
    });
    this.toastService.show('تم إنشاء الطلب', 'success');
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
}
