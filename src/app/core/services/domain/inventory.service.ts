import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from '../infra/supabase.service';
import { AuthService } from './auth.service';
import { ToastService } from '../state/toast.service';

export const FASHION_CATEGORIES = ['تيشيرت', 'هودي', 'بلوفر'] as const;
export const PRODUCT_CATEGORIES = [...FASHION_CATEGORIES, 'عام'] as const;
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;
export const COLORS = ['أبيض', 'أسود', 'رمادي', 'كحلي', 'بيج', 'أحمر', 'أزرق', 'أخضر', 'بني', 'وردي'] as const;
export const GENDER_TYPES = ['رجالي', 'نسائي', 'أطفال', 'للجنسين'] as const;

export function isFashionCategory(cat: string): boolean {
    return (FASHION_CATEGORIES as readonly string[]).includes(cat);
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    imageUrl: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    // Fashion-specific fields
    size?: string;
    color?: string;
    gender?: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed';
    paymentStatus: 'unpaid' | 'paid' | 'refunded';
    notes: string;
    createdAt: string;
}

export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    // Fashion-specific fields
    size?: string;
    color?: string;
    gender?: string;
}

export interface StockMovement {
    id: string;
    productId: string;
    productName: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason: string;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
    private supabaseService = inject(SupabaseService);
    private authService = inject(AuthService);
    private toastService = inject(ToastService);

    readonly products = signal<Product[]>([]);
    readonly orders = signal<Order[]>([]);
    readonly stockMovements = signal<StockMovement[]>([]);
    readonly settings = signal<any>(null);

    constructor() {
      this.init();
    }

    private async init() {
      await Promise.all([
        this.fetchProducts(),
        this.fetchOrders(),
        this.fetchSettings()
      ]);
      this.listenToChanges();
    }

    private listenToChanges() {
      if (!this.supabaseService.isConfigured) return;

      // Listen for product changes
      this.supabaseService.client
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload: any) => {
          console.log('Product change received:', payload);
          if (payload.eventType === 'INSERT') {
            const newP = this.mapProduct(payload.new);
            this.products.update(list => [newP, ...list.filter(p => p.id !== newP.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedP = this.mapProduct(payload.new);
            this.products.update(list => list.map(p => p.id === updatedP.id ? updatedP : p));
          } else if (payload.eventType === 'DELETE') {
            this.products.update(list => list.filter(p => p.id !== (payload.old as any).id));
          }
        })
        .subscribe();

      // Listen for order changes
      this.supabaseService.client
        .channel('public:pos_orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders' }, async (payload: any) => {
          console.log('Order change received:', payload);
          if (payload.eventType === 'INSERT') {
            // Fetch items for the new order
            const { data: items } = await this.supabaseService.client
              .from('pos_order_items')
              .select('*')
              .eq('order_id', payload.new.id);
            const newO = this.mapOrder(payload.new, items || []);
            this.orders.update(list => [newO, ...list.filter(o => o.id !== newO.id)]);
          } else if (payload.eventType === 'UPDATE') {
            // Update order status/payment in existing list
            this.orders.update(orders => orders.map(o => {
              if (o.id === payload.new.id) {
                return { 
                  ...o, 
                  status: payload.new.status as any,
                  paymentStatus: (payload.new.metadata?.payment_status || o.paymentStatus) as any
                };
              }
              return o;
            }));
          } else if (payload.eventType === 'DELETE') {
            this.orders.update(list => list.filter(o => o.id !== (payload.old as any).id));
          }
        })
        .subscribe();
    }

    // ===== EXISTING COMPUTED =====
    readonly totalProducts = computed(() => this.products().length);
    readonly lowStockProducts = computed(() => this.products().filter(p => p.stock <= p.minStock && p.isActive));
    readonly totalStockValue = computed(() => this.products().reduce((s, p) => s + (p.stock * p.cost), 0));
    readonly totalRevenue = computed(() => this.orders().filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0));
    readonly pendingOrders = computed(() => this.orders().filter(o => o.status === 'pending'));

    // ===== SMART ANALYTICS =====

    // Out of stock count
    readonly outOfStockCount = computed(() =>
        this.products().filter(p => p.stock === 0 && p.isActive).length
    );

    // Category breakdown
    readonly categoryBreakdown = computed(() => {
        const cats: Record<string, { count: number; value: number }> = {};
        this.products().forEach(p => {
            if (!cats[p.category]) cats[p.category] = { count: 0, value: 0 };
            cats[p.category].count++;
            cats[p.category].value += p.stock * p.cost;
        });
        return Object.entries(cats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.value - a.value);
    });

    // Best sellers (by order frequency)
    readonly bestSellers = computed(() => {
        const counts: Record<string, { name: string; sold: number; revenue: number }> = {};
        this.orders().filter(o => o.status !== 'cancelled').forEach(o => {
            o.items.forEach(item => {
                if (!counts[item.productId]) counts[item.productId] = { name: item.productName, sold: 0, revenue: 0 };
                counts[item.productId].sold += item.quantity;
                counts[item.productId].revenue += item.total;
            });
        });
        return Object.values(counts).sort((a, b) => b.sold - a.sold).slice(0, 5);
    });

    // Reorder suggestions: low stock + has sales history
    readonly reorderSuggestions = computed(() => {
        const lowStock = this.lowStockProducts();
        return lowStock.map(p => {
            const avgSales = this.getAverageSalesRate(p.id);
            const daysUntilOut = avgSales > 0 ? Math.round(p.stock / avgSales) : 999;
            const suggestedQty = Math.max(p.minStock * 2, Math.round(avgSales * 14)); // 2 weeks supply
            return {
                product: p,
                daysUntilOut,
                suggestedQty,
                urgency: daysUntilOut <= 3 ? 'critical' : daysUntilOut <= 7 ? 'warning' : 'info'
            };
        }).sort((a, b) => a.daysUntilOut - b.daysUntilOut);
    });

    // Average profit margin
    readonly avgProfitMargin = computed(() => {
        const products = this.products().filter(p => p.price > 0);
        if (products.length === 0) return 0;
        const totalMargin = products.reduce((s, p) => s + ((p.price - p.cost) / p.price) * 100, 0);
        return Math.round(totalMargin / products.length);
    });

    // Inventory health score (0-100)
    readonly inventoryHealth = computed(() => {
        const products = this.products().filter(p => p.isActive);
        if (products.length === 0) return 100;

        const outOfStock = products.filter(p => p.stock === 0).length;
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
        const healthy = products.length - outOfStock - lowStock;

        return Math.round(((healthy * 1.0 + lowStock * 0.5) / products.length) * 100);
    });

    // Total profit
    readonly totalProfit = computed(() => {
        let profit = 0;
        this.orders().filter(o => o.paymentStatus === 'paid' && o.status !== 'cancelled').forEach(o => {
            o.items.forEach(item => {
                const product = this.products().find(p => p.id === item.productId);
                if (product) {
                    profit += (item.unitPrice - product.cost) * item.quantity;
                }
            });
        });
        return profit;
    });

    // ===== PRODUCTS =====

    async addProduct(product: Partial<Product>): Promise<Product | null> {
        const { data, error } = await this.supabaseService.client
            .from('products')
            .insert([{
                name: product.name,
                sku: product.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
                description: product.description,
                price: product.price,
                current_stock: product.stock,
                min_stock: product.minStock,
                image_url: product.imageUrl,
                is_active: true,
                category_id: product.category === 'عام' ? null : product.category
            }])
            .select()
            .single();

        if (error) {
            this.toastService.show('خطأ في إضافة المنتج', 'error');
            return null;
        }

        const newProduct = this.mapProduct(data);
        return newProduct;
    }

    async updateProduct(id: string, updates: Partial<Product>) {
        const { error } = await this.supabaseService.client
            .from('products')
            .update({
                name: updates.name,
                price: updates.price,
                current_stock: updates.stock,
                min_stock: updates.minStock,
                image_url: updates.imageUrl,
                is_active: updates.isActive,
                description: updates.description,
                category_id: updates.category === 'عام' ? null : updates.category
            })
            .eq('id', id);

        if (error) {
            this.toastService.show('خطأ في تحديث المنتج', 'error');
            return;
        }
    }

    getProductBySku(sku: string): Product | undefined {
        return this.products().find(p => p.sku === sku && p.isActive);
    }

    async deleteProduct(id: string) {
        const { error } = await this.supabaseService.client
            .from('products')
            .delete()
            .eq('id', id);
        
        if (error) {
            this.toastService.show('خطأ في حذف المنتج', 'error');
        }
    }

    async adjustStock(productId: string, delta: number, reason: string = 'تعديل يدوي') {
        const product = this.products().find(p => p.id === productId);
        if (!product) return;

        const newStock = Math.max(0, product.stock + delta);
        
        const { error } = await this.supabaseService.client
            .from('products')
            .update({ current_stock: newStock })
            .eq('id', productId);

        if (error) {
            this.toastService.show('خطأ في تحديث المخزون', 'error');
            return;
        }

        // Log movement locally (or via DB if we have a table for it)
        this.logMovement(productId, product.name, delta > 0 ? 'in' : 'out', Math.abs(delta), reason);

        // Alert on low stock
        if (newStock <= product.minStock) {
            this.toastService.show(`⚠️ المنتج "${product.name}" وصل لحد المخزون الأدنى`, 'info');
        }
    }

    // ===== ORDERS =====

    async createOrder(order: Partial<Order>): Promise<Order | null> {
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
        
        // 1. Core Order
        const { data: orderData, error: orderError } = await this.supabaseService.client
            .from('pos_orders')
            .insert([{
                order_number: orderNumber,
                customer_name: order.customerName,
                customer_phone: order.customerPhone,
                subtotal: order.subtotal,
                tax_amount: order.tax,
                total_amount: order.total,
                payment_method: 'cash',
                status: 'completed'
            }])
            .select()
            .single();

        if (orderError) {
            this.toastService.show('خطأ في إنشاء الطلب', 'error');
            return null;
        }

        // 2. Order Items
        const itemsToInsert = (order.items || []).map(item => ({
            order_id: orderData.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.total
        }));

        const { error: itemsError } = await this.supabaseService.client
            .from('pos_order_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('Error inserting items:', itemsError);
        }

        const newOrder = this.mapOrder(orderData, order.items || []);
        
        // Stock reduction is handled by DB triggers ideally, but if not:
        order.items?.forEach(item => {
            this.adjustStock(item.productId, -item.quantity, `طلب رقم ${orderNumber}`);
        });

        return newOrder;
    }

    async updateOrderStatus(id: string, status: Order['status']) {
        const { error } = await this.supabaseService.client
            .from('pos_orders')
            .update({ status })
            .eq('id', id);
        
        if (error) {
            this.toastService.show('خطأ في تحديث حالة الطلب', 'error');
        }
    }

    async updatePaymentStatus(id: string, paymentStatus: Order['paymentStatus']) {
        // Assuming there's a payment_status column in DB, if not we add to metadata or separate table
        const { error } = await this.supabaseService.client
            .from('pos_orders')
            .update({ metadata: { payment_status: paymentStatus } })
            .eq('id', id);

        if (error) {
            this.toastService.show('خطأ في تحديث حالة الدفع', 'error');
        }
    }

    recalcOrder(o: Order) {
        o.items.forEach(i => i.total = i.quantity * i.unitPrice);
        o.subtotal = o.items.reduce((s, i) => s + i.total, 0);
        o.tax = o.subtotal * 0.15;
        o.total = o.subtotal + o.tax;
    }

    // ===== STOCK MOVEMENTS =====

    private logMovement(productId: string, productName: string, type: StockMovement['type'], quantity: number, reason: string) {
        const movement: StockMovement = {
            id: crypto.randomUUID(),
            productId, productName, type, quantity, reason,
            createdAt: new Date().toISOString()
        };
        this.stockMovements.update(m => [movement, ...m].slice(0, 200)); // Keep last 200
    }

    private getAverageSalesRate(productId: string): number {
        const movements = this.stockMovements().filter(m => m.productId === productId && m.type === 'out');
        if (movements.length < 2) return 0;
        const newest = new Date(movements[0].createdAt).getTime();
        const oldest = new Date(movements[movements.length - 1].createdAt).getTime();
        const days = Math.max(1, (newest - oldest) / 86400000);
        const totalSold = movements.reduce((s, m) => s + m.quantity, 0);
        return totalSold / days;
    }

    getProductMovements(productId: string): StockMovement[] {
        return this.stockMovements().filter(m => m.productId === productId);
    }

    // ===== HELPERS =====

    private async fetchProducts() {
        const { data } = await this.supabaseService.client
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) this.products.set(data.map(d => this.mapProduct(d)));
    }

    private async fetchOrders() {
        const { data } = await this.supabaseService.client
            .from('pos_orders')
            .select('*, pos_order_items(*)')
            .order('created_at', { ascending: false });
        if (data) this.orders.set(data.map(d => this.mapOrder(d, d.pos_order_items)));
    }

    private async fetchSettings() {
        const { data } = await this.supabaseService.client
            .from('app_settings')
            .select('*');
        if (data) {
            const branding = data.find(d => d.key === 'branding');
            if (branding) this.settings.set(branding.value);
        }
    }

    private mapProduct(d: any): Product {
        return {
            id: d.id,
            sku: d.sku,
            name: d.name,
            description: d.description,
            price: Number(d.price),
            cost: Number(d.cost || 0),
            stock: d.current_stock,
            minStock: d.min_stock,
            imageUrl: d.image_url,
            isActive: d.is_active,
            createdAt: d.created_at,
            category: d.category_id || 'عام'
        };
    }

    private mapOrder(d: any, items: any[]): Order {
        return {
            id: d.id,
            orderNumber: d.order_number,
            customerName: d.customer_name,
            customerPhone: d.customer_phone,
            subtotal: Number(d.subtotal),
            tax: Number(d.tax_amount),
            total: Number(d.total_amount),
            status: d.status as any,
            paymentStatus: d.metadata?.payment_status || 'paid',
            notes: d.metadata?.notes || '',
            createdAt: d.created_at,
            items: items.map(i => ({
                productId: i.product_id,
                productName: i.product_name,
                quantity: i.quantity,
                unitPrice: Number(i.unit_price),
                total: Number(i.total_price)
            }))
        };
    }

    async uploadProductImage(path: string, file: File): Promise<string | null> {
      return this.supabaseService.uploadFile('product-images', path, file);
    }
}
