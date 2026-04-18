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
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
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

    readonly products = signal<Product[]>(this.loadProducts());
    readonly orders = signal<Order[]>(this.loadOrders());
    readonly stockMovements = signal<StockMovement[]>(this.loadMovements());
    private orderCounter = this.orders().length + 1;

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

    addProduct(product: Partial<Product>): Product {
        const p: Product = {
            id: crypto.randomUUID(),
            name: product.name || '',
            sku: product.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
            category: product.category || 'عام',
            price: product.price || 0,
            cost: product.cost || 0,
            stock: product.stock || 0,
            minStock: product.minStock || 5,
            imageUrl: product.imageUrl || '',
            description: product.description || '',
            isActive: true,
            createdAt: new Date().toISOString(),
            ...(product.size && { size: product.size }),
            ...(product.color && { color: product.color }),
            ...(product.gender && { gender: product.gender }),
        };
        this.products.update(list => [p, ...list]);
        this.persistProducts();

        // Log movement
        if (p.stock > 0) {
            this.logMovement(p.id, p.name, 'in', p.stock, 'رصيد افتتاحي');
        }

        return p;
    }

    updateProduct(id: string, updates: Partial<Product>) {
        this.products.update(list => list.map(p => p.id === id ? { ...p, ...updates } : p));
        this.persistProducts();
    }

    deleteProduct(id: string) {
        this.products.update(list => list.filter(p => p.id !== id));
        this.persistProducts();
    }

    adjustStock(productId: string, delta: number, reason: string = 'تعديل يدوي') {
        const product = this.products().find(p => p.id === productId);
        this.products.update(list => list.map(p => {
            if (p.id !== productId) return p;
            return { ...p, stock: Math.max(0, p.stock + delta) };
        }));
        this.persistProducts();

        // Log stock movement
        if (product) {
            this.logMovement(productId, product.name, delta > 0 ? 'in' : 'out', Math.abs(delta), reason);
        }

        // Alert on low stock
        if (product && product.stock + delta <= product.minStock) {
            this.toastService.show(`⚠️ المنتج "${product.name}" وصل لحد المخزون الأدنى`, 'info');
        }
    }

    // ===== ORDERS =====

    createOrder(order: Partial<Order>): Order {
        const o: Order = {
            id: crypto.randomUUID(),
            orderNumber: `ORD-${String(this.orderCounter++).padStart(4, '0')}`,
            customerName: order.customerName || '',
            customerPhone: order.customerPhone || '',
            items: order.items || [],
            subtotal: 0, tax: 0, total: 0,
            status: 'pending',
            paymentStatus: 'unpaid',
            notes: order.notes || '',
            createdAt: new Date().toISOString()
        };
        this.recalcOrder(o);

        // Deduct stock
        for (const item of o.items) {
            this.adjustStock(item.productId, -item.quantity, `طلب ${o.orderNumber}`);
        }

        this.orders.update(list => [o, ...list]);
        this.persistOrders();
        return o;
    }

    updateOrderStatus(id: string, status: Order['status']) {
        this.orders.update(list => list.map(o => o.id === id ? { ...o, status } : o));
        this.persistOrders();
    }

    updatePaymentStatus(id: string, paymentStatus: Order['paymentStatus']) {
        this.orders.update(list => list.map(o => o.id === id ? { ...o, paymentStatus } : o));
        this.persistOrders();
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
        this.persistMovements();
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

    // ===== PERSISTENCE =====

    private readonly storageKeys = {
        products: 'washa_control_products',
        orders: 'washa_control_orders',
        movements: 'washa_control_stock_movements'
    };

    private persistProducts() { localStorage.setItem(this.storageKeys.products, JSON.stringify(this.products())); }
    private persistOrders() { localStorage.setItem(this.storageKeys.orders, JSON.stringify(this.orders())); }
    private persistMovements() { localStorage.setItem(this.storageKeys.movements, JSON.stringify(this.stockMovements())); }
    private loadProducts(): Product[] { try { return JSON.parse(localStorage.getItem(this.storageKeys.products) || '[]'); } catch { return []; } }
    private loadOrders(): Order[] { try { return JSON.parse(localStorage.getItem(this.storageKeys.orders) || '[]'); } catch { return []; } }
    private loadMovements(): StockMovement[] { try { return JSON.parse(localStorage.getItem(this.storageKeys.movements) || '[]'); } catch { return []; } }
}

