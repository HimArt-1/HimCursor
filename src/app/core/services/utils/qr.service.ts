import { Injectable } from '@angular/core';

export interface ZatcaQrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalAmount: string;
  vatAmount: string;
}

@Injectable({
  providedIn: 'root'
})
export class QrService {

  /**
   * Generates a ZATCA Compliant QR Code Base64 string using TLV encoding.
   * Based on ZATCA Phase 1 (Electronic Invoicing) regulations.
   */
  generateZatcaQr(data: ZatcaQrFields): string {
    const tlvParts: Uint8Array[] = [
      this.getTlvBuffer(1, data.sellerName),
      this.getTlvBuffer(2, data.vatNumber),
      this.getTlvBuffer(3, data.timestamp),
      this.getTlvBuffer(4, data.totalAmount),
      this.getTlvBuffer(5, data.vatAmount)
    ];

    // Calculate total length
    const totalLength = tlvParts.reduce((acc, part) => acc + part.length, 0);
    const finalBuffer = new Uint8Array(totalLength);

    // Concatenate all parts
    let offset = 0;
    for (const part of tlvParts) {
      finalBuffer.set(part, offset);
      offset += part.length;
    }

    // Convert to Base64
    return this.toBase64(finalBuffer);
  }

  private getTlvBuffer(tag: number, value: string): Uint8Array {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    const tagByte = tag;
    const lengthByte = valueBytes.length;

    const tlv = new Uint8Array(2 + valueBytes.length);
    tlv[0] = tagByte;
    tlv[1] = lengthByte;
    tlv.set(valueBytes, 2);
    return tlv;
  }

  private toBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
