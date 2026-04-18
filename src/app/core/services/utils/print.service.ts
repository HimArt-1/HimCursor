import { Injectable, inject } from '@angular/core';
import { Product, Order, InventoryService } from '../domain/inventory.service';
import { QrService } from './qr.service';
import { SupabaseService } from '../infra/supabase.service';

declare var QRious: any;
declare var html2pdf: any;

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  private qrService = inject(QrService);
  private inventoryService = inject(InventoryService);
  private supabaseService = inject(SupabaseService);

  WHATSAPP_TEMPLATES = [
    { id: 'professional', name: 'رسمي', text: (order: Order, url: string) => `عزيزي العميل، شكراً لتعاملك مع وشّى. تجد مرفقاً فاتورتك برقم ${order.orderNumber} بمبلغ ${order.total.toFixed(2)} ر.س. %0A%0Aرابط الفاتورة: ${url} %0A%0Aنسعد بزيارتك مرة أخرى!` },
    { id: 'friendly', name: 'ودي', text: (order: Order, url: string) => `أهلاً بك! فاتورتك من وشّى جاهزة للإطلاع. رقم الطلب ${order.orderNumber}. %0A%0Aيمكنك تحميلها من هنا: ${url} %0A%0Aيومك سعيد ✨` },
    { id: 'brief', name: 'مختصر', text: (order: Order, url: string) => `فاتورتك من وشّى: ${url}` }
  ];

  async downloadInvoiceAsPdf(order: Order) {
    const html = this.generatePdfHtml(order);
    const element = this.createTempElement(html);
    
    const opt = this.getPdfOptions(order.orderNumber);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      document.body.removeChild(element);
    }
  }

  async uploadInvoiceAndGetUrl(order: Order): Promise<string | null> {
    const html = this.generatePdfHtml(order);
    const element = this.createTempElement(html);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const blob = await html2pdf().set(this.getPdfOptions(order.orderNumber)).from(element).output('blob');
      const fileName = `${order.id}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      return await this.supabaseService.uploadFile('invoices', fileName, file);
    } catch (error) {
      console.error('PDF Upload Error:', error);
      return null;
    } finally {
      document.body.removeChild(element);
    }
  }

  shareViaWhatsApp(order: Order, templateId: string = 'professional', url?: string) {
    const template = this.WHATSAPP_TEMPLATES.find(t => t.id === templateId) || this.WHATSAPP_TEMPLATES[0];
    const finalUrl = url || '';
    const text = template.text(order, finalUrl);
    window.open(`https://wa.me/${order.customerPhone || ''}?text=${text}`, '_blank');
  }

  private createTempElement(html: string): HTMLElement {
    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.position = 'fixed';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '210mm';
    document.body.appendChild(element);
    return element;
  }

  private getPdfOptions(orderNumber: string) {
    return {
      margin:       0,
      filename:     `invoice-${orderNumber}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
  }

  private getBranding() {
    return this.inventoryService.settings() || {
      brand_name: 'WASHA',
      tagline: 'Digital Control Systems',
      logo_url: 'https://api.dicebear.com/7.x/initials/svg?seed=W',
      vat_number: '310000000000003',
      address: 'المملكة العربية السعودية'
    };
  }

  private getZatcaQrImage(order: Order): string {
    const branding = this.getBranding();
    const qrData = this.qrService.generateZatcaQr({
      sellerName: branding.brand_name,
      vatNumber: branding.vat_number,
      timestamp: order.createdAt,
      totalAmount: order.total.toFixed(2),
      vatAmount: order.tax.toFixed(2)
    });

    // Use a temporary canvas to generate the QR image
    const canvas = document.createElement('canvas');
    new QRious({
      element: canvas,
      value: qrData,
      size: 200,
      level: 'H'
    });
    return canvas.toDataURL();
  }
  generateThermalHtml(order: Order): string {
    const itemsHtml = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
        <span>${item.productName} x${item.quantity}</span>
        <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
      </div>
    `).join('');

    const branding = this.getBranding();
    const qrImage = this.getZatcaQrImage(order);

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
          .logo { width: 40px; height: 40px; margin: 0 auto 10px; }
          .items { margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
          .totals { font-weight: bold; font-size: 16px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
          .qr { margin: 15px auto; text-align: center; }
          .qr img { width: 120px; height: 120px; border: 1px solid #eee; padding: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${branding.logo_url}" class="logo" />
          <div class="title">${branding.brand_name}</div>
          <div class="info">فاتورة ضريبية مبسطة</div>
          <div class="info">الرقم الضريبي: ${branding.vat_number}</div>
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
        <div class="qr">
          <img src="${qrImage}" />
          <div style="font-size: 8px; color: #a09c94; margin-top: 5px;">ZATCA Compliant QR</div>
        </div>
        <div class="footer">شكراً لزيارتكم!<br>الاستبدال والاسترجاع خلال 7 أيام</div>
      </body>
      </html>
    `;
  }

  generatePdfHtml(order: Order): string {
    const itemsHtml = order.items.map((item, index) => `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 15px; text-align: center; color: #a0aec0; font-size: 13px;">${index + 1}</td>
        <td style="padding: 15px; text-align: right;">
          <div style="font-weight: 700; color: #2d3748;">${item.productName}</div>
          <div style="font-size: 11px; color: #a0aec0;">${item.productId.slice(0, 8)}</div>
        </td>
        <td style="padding: 15px; text-align: center; color: #4a5568;">${item.quantity}</td>
        <td style="padding: 15px; text-align: center; color: #4a5568;">${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 15px; text-align: center; font-weight: 700; color: #7A4E2D;">${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
          body { 
            font-family: 'Tajawal', 'Inter', sans-serif; 
            margin: 0; 
            padding: 0; 
            background: #fdfaf6; 
            color: #2d3748;
            -webkit-font-smoothing: antialiased;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 10mm auto;
            background: white;
            box-shadow: 0 0 30px rgba(122, 78, 45, 0.1);
            position: relative;
            overflow: hidden;
          }
          @media print {
            body { background: white; }
            .page { margin: 0; box-shadow: none; border: none; }
          }
          
          /* Branding Elements */
          .bg-pattern {
            position: absolute;
            top: -100px;
            right: -100px;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, #7A4E2D 0%, transparent 70%);
            opacity: 0.03;
            border-radius: 50%;
            z-index: 0;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 50px;
            position: relative;
            z-index: 1;
          }

          .brand-box {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .logo-placeholder {
            width: 60px;
            height: 60px;
            background: #7A4E2D;
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 900;
            font-size: 24px;
            box-shadow: 0 10px 20px rgba(122, 78, 45, 0.2);
          }
          .brand-text h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 900;
            color: #7A4E2D;
            letter-spacing: -1px;
            line-height: 1;
          }
          .brand-text p {
            margin: 2px 0 0 0;
            font-size: 10px;
            font-weight: 700;
            color: #a0aec0;
            letter-spacing: 2px;
            text-transform: uppercase;
          }

          .invoice-meta {
            text-align: left;
          }
          .invoice-meta h2 {
            margin: 0;
            font-size: 48px;
            font-weight: 900;
            color: #f3f3f1;
            line-height: 0.8;
            margin-bottom: 10px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: auto auto;
            gap: 10px 30px;
            text-align: right;
            background: #fdfaf6;
            padding: 15px 25px;
            border-radius: 15px;
            border: 1px solid #7a4e2d10;
          }
          .meta-item label {
            display: block;
            font-size: 9px;
            color: #a0aec0;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .meta-item span {
            font-size: 14px;
            font-weight: 700;
            color: #7A4E2D;
          }

          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
            position: relative;
            z-index: 1;
          }
          .info-card {
            padding: 25px;
            border-radius: 20px;
            background: white;
            border: 1px solid #7a4e2d08;
            box-shadow: 0 4px 15px rgba(122, 78, 45, 0.03);
          }
          .info-card h3 {
            margin: 0 0 15px 0;
            font-size: 12px;
            color: #a0aec0;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #fdfaf6;
            padding-bottom: 10px;
          }
          .info-content p {
            margin: 5px 0;
            font-size: 14px;
            font-weight: 500;
          }
          .info-content .name {
            font-size: 18px;
            font-weight: 900;
            color: #7A4E2D;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
            position: relative;
            z-index: 1;
          }
          th {
            background: #7A4E2D;
            color: white;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }
          th:first-child { border-radius: 15px 0 0 0; }
          th:last-child { border-radius: 0 15px 0 0; }
          
          .summary-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 20px;
          }
          .qr-box {
            width: 140px;
            height: 140px;
            background: #fdfaf6;
            border: 2px solid #7a4e2d10;
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px;
          }
          .qr-placeholder {
            width: 100px;
            height: 100px;
            background: #7A4E2D;
            mask-image: url('https://www.svgrepo.com/show/311168/qr-code.svg');
            -webkit-mask-image: url('https://www.svgrepo.com/show/311168/qr-code.svg');
            mask-repeat: no-repeat;
            mask-size: contain;
          }
          .qr-text {
            font-size: 8px;
            color: #7A4E2D;
            font-weight: 700;
            margin-top: 8px;
            text-transform: uppercase;
          }

          .totals-box {
            width: 350px;
            padding: 30px;
            background: #fdfaf6;
            border-radius: 25px;
            border: 1px solid #7a4e2d08;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
            color: #718096;
          }
          .total-row.grand {
            margin-top: 15px;
            padding-top: 20px;
            border-top: 2px dashed #7a4e2d20;
            color: #7A4E2D;
            font-size: 24px;
            font-weight: 900;
          }

          .footer {
            margin-top: 80px;
            text-align: center;
            border-top: 1px solid #fdfaf6;
            padding-top: 30px;
          }
          .footer-text {
            font-size: 12px;
            color: #a0aec0;
            font-weight: 500;
            max-width: 400px;
            margin: 0 auto;
          }
          .w-mark {
            position: absolute;
            bottom: -50px;
            left: -50px;
            font-size: 200px;
            font-weight: 900;
            color: #7A4E2D;
            opacity: 0.02;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="bg-pattern"></div>
          <div class="w-mark">W</div>
          
          <div class="header">
            <div class="brand-box">
              <img src="${this.getBranding().logo_url}" style="width: 60px; height: 60px; border-radius: 15px; object-fit: cover;" />
              <div class="brand-text">
                <h1>${this.getBranding().brand_name}</h1>
                <p>${this.getBranding().tagline || 'Digital Control Systems'}</p>
              </div>
            </div>
            <div class="invoice-meta">
              <h2>INVOICE</h2>
              <div class="meta-grid">
                <div class="meta-item">
                  <label>رقم الفاتورة / No.</label>
                  <span>#${order.orderNumber}</span>
                </div>
                <div class="meta-item">
                  <label>التاريخ / Date</label>
                  <span>${new Date(order.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="info-section">
            <div class="info-card">
              <h3>العميل / Bill To</h3>
              <div class="info-content">
                <p class="name">${order.customerName || 'عميل نقدي / Cash Customer'}</p>
                <p>${order.customerPhone || 'إلكترونية / Digital'}</p>
                <p style="color: #a0aec0; font-size: 12px;">المملكة العربية السعودية</p>
              </div>
            </div>
            <div class="info-card">
              <h3>الدفع / Payment</h3>
              <div class="info-content">
                <p class="name">تحويل بنكي / شبكة</p>
                <p>حالة الدفع: <span style="color: #48bb78; font-weight: 700;">مدفوعة بالكامل</span></p>
                <p style="color: #a0aec0; font-size: 12px;">ID: ${order.id.slice(0, 12)}</p>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 60px;">#</th>
                <th style="text-align: right;">المنتج / Description</th>
                <th>الكمية / Qty</th>
                <th>السعر / Unit Price</th>
                <th>الإجمالي / Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="summary-section">
            <div class="qr-box">
              <img src="${this.getZatcaQrImage(order)}" style="width: 100%; height: auto; border-radius: 10px;" />
              <div class="qr-text">ZATCA Compliant QR</div>
              <div style="font-size: 7px; color: #a0aec0; margin-top: 4px;">رقم الضريبة: ${this.getBranding().vat_number}</div>
            </div>
            
            <div class="totals-box">
              <div class="total-row">
                <span>المجموع الفرعي / Subtotal</span>
                <span>${order.subtotal.toFixed(2)} ر.س</span>
              </div>
              <div class="total-row">
                <span>الضريبة (15%) / VAT</span>
                <span>${order.tax.toFixed(2)} ر.س</span>
              </div>
              <div class="total-row grand">
                <span>الإجمالي / TOTAL</span>
                <span>${order.total.toFixed(2)} ر.س</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p class="footer-text">
              هذه الفاتورة مستخرجة آلياً من نظام <strong>WASHA CONTROL</strong> المطور بلسان عربي مبين لخدمتكم بأفضل صورة.<br>
              <span style="font-weight: 900; color: #7A4E2D; display: block; margin-top: 10px;">شكراً لاختياركم وشّى - Washa</span>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
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
