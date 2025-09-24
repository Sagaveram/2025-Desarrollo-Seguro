
//codigo mitigado
import db from '../db';
import { Invoice } from '../types/invoice';
import axios from 'axios';
import { promises as fs } from 'fs';
import * as path from 'path';

interface InvoiceRow {
  id: string;
  userId: string;
  amount: number;
  dueDate: Date;
  status: string;
}

class InvoiceService {
  static async list(userId: string, status?: string, operator?: string): Promise<Invoice[]> {
    let q = db<InvoiceRow>('invoices').where({ userId });

    if (status) {
      const allowedOperators = ['=', '!='];
      if (!operator || !allowedOperators.includes(operator)) {
        throw new Error('Invalid operator');
      }
      q = q.where('status', operator as any, status);
    }

    const rows = await q.select();
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      dueDate: row.dueDate,
      status: row.status
    } as Invoice));
  }

  static async setPaymentCard(
    userId: string,
    invoiceId: string,
    paymentBrand: string,
    ccNumber: string,
    ccv: string,
    expirationDate: string
  ) {
    const allowedPaymentHosts: Record<string, string> = {
      visa: 'https://api.visa.com',
      mastercard: 'https://api.mastercard.com',
      paypal: 'https://api.paypal.com'
    };

    if (!allowedPaymentHosts[paymentBrand]) {
      throw new Error('Unsupported payment brand');
    }

    const apiUrl = `${allowedPaymentHosts[paymentBrand]}/payments`;
    const paymentResponse = await axios.post(apiUrl, { ccNumber, ccv, expirationDate });

    if (paymentResponse.status !== 200) {
      throw new Error('Payment failed');
    }

    await db('invoices')
      .where({ id: invoiceId, userId })
      .update({ status: 'paid' });
  }

  static async getInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await db<InvoiceRow>('invoices').where({ id: invoiceId }).first();
    if (!invoice) throw new Error('Invoice not found');
    return invoice as Invoice;
  }

  static async getReceipt(invoiceId: string, pdfName: string) {
    const invoice = await db<InvoiceRow>('invoices').where({ id: invoiceId }).first();
    if (!invoice) throw new Error('Invoice not found');

    const INVOICE_DIR = path.resolve('invoices');
    const sanitizedPath = path.resolve(path.join(INVOICE_DIR, pdfName));

    if (!sanitizedPath.startsWith(INVOICE_DIR)) {
      throw new Error('Access denied');
    }

    if (!sanitizedPath.endsWith('.pdf')) {
      throw new Error('Invalid file type');
    }

    try {
      return await fs.readFile(sanitizedPath, 'utf-8');
    } catch (error) {
      console.error('Error reading receipt file:', error);
      throw new Error('Receipt not found');
    }
  }
}

export default InvoiceService;

/*
  static async verifyOwner(userId: string, invoiceId: string): Promise<void> {
    const invoice = await db<InvoiceRow>('invoices')
      .where({ id: invoiceId })
      .first();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.userId !== userId) {
      throw new Error('Forbidden: You do not own this invoice');
    }
  }

  static async list(userId: string, status?: string, operator?: string): Promise<Invoice[]> {
    let q = db<InvoiceRow>('invoices').where({ userId });
    if (status) q = q.andWhereRaw(" status " + operator + " '" + status + "'");
    const rows = await q.select();
    return rows.map(row => ({
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      dueDate: row.dueDate,
      status: row.status
    }));
  }

  static async setPaymentCard(
    userId: string,
    invoiceId: string,
    paymentBrand: string,
    ccNumber: string,
    ccv: string,
    expirationDate: string
  ) {
    // Verificar que el usuario es dueño de la factura antes de proceder
    await this.verifyOwner(userId, invoiceId);

    const paymentResponse = await axios.post(`http://${paymentBrand}/payments`, {
      ccNumber,
      ccv,
      expirationDate
    });

    if (paymentResponse.status !== 200) {
      throw new Error('Payment failed');
    }

    await db('invoices')
      .where({ id: invoiceId, userId })
      .update({ status: 'paid' });
  }

  static async getInvoice(userId: string, invoiceId: string): Promise<Invoice> {
    // Verificar propiedad antes de retornar datos sensibles
    await this.verifyOwner(userId, invoiceId);

    const invoice = await db<InvoiceRow>('invoices')
      .where({ id: invoiceId })
      .first();

    return invoice as Invoice;
  }

  static async getReceipt(userId: string, invoiceId: string, pdfName: string) {
    // Verificar propiedad antes de leer el archivo
    await this.verifyOwner(userId, invoiceId);

    try {
      const filePath = `/invoices/${pdfName}`;
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Error reading receipt file:', error);
      throw new Error('Receipt not found');
    }
  }
}

*/