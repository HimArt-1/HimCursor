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

@Injectable({ providedIn: 'root' })
export class InventoryService {
    private supabaseService = inject(SupabaseService);
    private authService = inject(AuthService);
    private toastService = inject(ToastService);

    readonly products = signal<Product[]>(this.loadProducts());
    readonly orders = signal<Order[]>(this.loadOrders());
    private orderCounter = this.orders().length + 1;

    // Computed
    readonly totalProducts = computed(() => this.products().length);
    readonly lowStockProducts = computed(() => this.products().filter(p => p.stock <= p.minStock && p.isActive));
    readonly totalStockValue = computed(() => this.products().reduce((s, p) => s + (p.stock * p.cost), 0));
    readonly totalRevenue = computed(() => this.orders().filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0));
    readonly pendingOrders = computed(() => this.orders().filter(o => o.status === 'pending'));

    // Products
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

    adjustStock(productId: string, delta: number) {
        this.products.update(list => list.map(p => {
            if (p.id !== productId) return p;
            return { ...p, stock: Math.max(0, p.stock + delta) };
        }));
        this.persistProducts();
    }

    // Orders
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
            this.adjustStock(item.productId, -item.quantity);
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

    private persistProducts() { localStorage.setItem('himcontrol_products', JSON.stringify(this.products())); }
    private persistOrders() { localStorage.setItem('himcontrol_orders', JSON.stringify(this.orders())); }
    private loadProducts(): Product[] { try { return JSON.parse(localStorage.getItem('himcontrol_products') || '[]'); } catch { return []; } }
    private loadOrders(): Order[] { try { return JSON.parse(localStorage.getItem('himcontrol_orders') || '[]'); } catch { return []; } }
}
