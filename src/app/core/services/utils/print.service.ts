import { Injectable } from '@angular/core';
import { Product, Order } from '../domain/inventory.service';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  generateThermalHtml(order: Order): string {
    const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
        <span>${item.productName} x${item.quantity}</span>
        <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
      </div>
    `).join('');

    return `
      <html dir="rtl">
      <head>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { 
            width: 70mm; 
            font-family: 'Tajawal', sans-serif; 
            padding: 5mm; 
            margin: 0;
            color: #000;
          }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
          .title { font-size: 18px; font-weight: bold; color: #7A4E2D; }
          .info { font-size: 11px; color: #666; margin-bottom: 5px; }
          .items { margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
          .totals { font-weight: bold; font-size: 16px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
          .qr { margin: 15px auto; width: 100px; height: 100px; background: #f8f6f1; border: 1px solid #7A4E2D20; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #7A4E2D; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">WASHA CONTROL</div>
          <div class="info">فاتورة ضريبية مبسطة</div>
          <div class="info">رقم الطلب: ${order.orderNumber}</div>
          <div class="info">التاريخ: ${new Date(order.createdAt).toLocaleString('ar-SA')}</div>
        </div>
        <div class="items">
          ${itemsHtml}
        </div>
        <div class="totals">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; font-weight: normal;">
            <span>المجموع:</span>
            <span>${order.subtotal.toFixed(2)} ر.س</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; font-weight: normal;">
            <span>الضريبة (15%):</span>
            <span>${order.tax.toFixed(2)} ر.س</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #7A4E2D;">
            <span>الإجمالي:</span>
            <span>${order.total.toFixed(2)} ر.س</span>
          </div>
        </div>
        <div class="qr">ZATCA QR READY</div>
        <div class="footer">شكراً لزيارتكم!<br>الاستبدال والاسترجاع خلال 7 أيام</div>
      </body>
      </html>
    `;
  }

  generatePdfHtml(order: Order): string {
    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 12px; text-align: right;">${item.productName}</td>
        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; text-align: center;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; text-align: center;">${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <html dir="rtl">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Tajawal', sans-serif; padding: 40px; color: #2d3748; background: #fff; line-height: 1.6; }
          .container { max-width: 800px; margin: 0 auto; box-shadow: 0 0 40px rgba(0,0,0,0.05); padding: 40px; border-radius: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
          .brand { color: #7A4E2D; }
          .brand-name { font-size: 36px; font-weight: 900; margin: 0; letter-spacing: -1px; }
          .invoice-label { font-size: 14px; color: #a0aec0; text-transform: uppercase; font-weight: bold; }
          .meta { text-align: left; }
          .meta h2 { margin: 0; color: #7A4E2D; font-size: 28px; font-weight: 900; }
          .meta p { margin: 4px 0; color: #718096; font-size: 14px; font-weight: 500; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 40px; }
          th { background: #fdfaf6; color: #7A4E2D; font-weight: 700; padding: 18px; text-align: right; font-size: 14px; border-bottom: 2px solid #7A4E2D; }
          .totals-section { margin-top: 50px; display: flex; justify-content: flex-end; }
          .totals-box { width: 320px; background: #fdfaf6; padding: 30px; border-radius: 20px; border: 1px solid #7A4E2D15; }
          .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; color: #4a5568; }
          .grand-total { border-top: 2px solid #7A4E2D; margin-top: 15px; padding-top: 20px; font-size: 24px; font-weight: 900; color: #7A4E2D; }
          .footer { margin-top: 120px; padding-top: 30px; border-top: 1px solid #edf2f7; text-align: center; color: #a0aec0; font-size: 14px; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; opacity: 0.02; pointer-events: none; font-weight: 900; color: #7A4E2D; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="watermark">WASHA</div>
          <div class="header">
            <div class="brand">
              <h1 class="brand-name">WASHA</h1>
              <span class="invoice-label">فاتورة ضريبية مبسطة</span>
            </div>
            <div class="meta">
              <h2>#${order.orderNumber}</h2>
              <p>التاريخ: ${new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
              <p>رقم العملية: ${order.id.slice(0, 8)}</p>
            </div>
          </div>
          
          <div style="background: #fdfaf6; padding: 25px; border-radius: 20px; margin-bottom: 40px; display: flex; gap: 60px; border: 1px solid #7A4E2D10;">
            <div>
              <span style="font-size: 12px; color: #a0aec0; font-weight: bold; text-transform: uppercase;">العميل</span>
              <p style="margin: 5px 0; font-weight: 700; color: #2d3748; font-size: 18px;">${order.customerName || 'عميل نقدي'}</p>
              <p style="margin: 0; font-size: 14px; color: #718096;">${order.customerPhone || 'إلكترونية'}</p>
            </div>
            <div>
              <span style="font-size: 12px; color: #a0aec0; font-weight: bold; text-transform: uppercase;">طريقة الدفع</span>
              <p style="margin: 5px 0; font-weight: 700; color: #2d3748; font-size: 18px;">تحويل / شبكة</p>
              <p style="margin: 0; font-size: 14px; color: #718096;">مدفوعة بالكامل</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%;">المنتج</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: center;">السعر</th>
                <th style="text-align: center;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row"><span>المجموع الفرعي</span><span>${order.subtotal.toFixed(2)} ر.س</span></div>
              <div class="total-row"><span>الضريبة (15%)</span><span>${order.tax.toFixed(2)} ر.س</span></div>
              <div class="total-row grand-total"><span>الإجمالي النهائي</span><span>${order.total.toFixed(2)} ر.س</span></div>
            </div>
          </div>

          <div class="footer">
            هذه الفاتورة مرسلة آلياً من نظام <strong>WASHA CONTROL</strong><br>
            شكراً لتعاملكم مع وشّى - نراكم قريباً!
          </div>
        </div>
      </body>
      </html>
    `;
  }

  shareViaWhatsApp(order: Order) {
    const text = `*WASHA CONTROL - فاتورة جديدة* %0A%0A` +
      `رقم الطلب: ${order.orderNumber}%0A` +
      `التاريخ: ${new Date(order.createdAt).toLocaleDateString('ar-SA')}%0A%0A` +
      `*المنتجات:*%0A` +
      order.items.map(i => `- ${i.productName} (x${i.quantity}): ${i.total} ر.س`).join('%0A') +
      `%0A%0A*الإجمالي: ${order.total.toFixed(2)} ر.س*%0A%0A` +
      `شكراً لزيارتكم!`;
    
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  print(html: string) {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    }
  }
}
