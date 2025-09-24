import { Request, Response, NextFunction } from 'express';
import InvoiceService from '../services/invoiceService';
import { Invoice } from '../types/invoice';
import crypto from 'crypto';

const listInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = req.query.status as string | undefined;
    const operator = req.query.operator as string | undefined;
    const id   = (req as any).user!.id; 
    const invoices = await InvoiceService.list(id, state, operator);
    res.json(invoices);
  } catch (err) {
    next(err);
  }
};

const setPaymentCard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.id;
    const paymentBrand = req.body.paymentBrand;
    const ccNumber = req.body.ccNumber;
    const ccv = req.body.ccv;
    const expirationDate = req.body.expirationDate;

    if (!paymentBrand || !ccNumber || !ccv || !expirationDate) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const id = (req as any).user!.id; 

    // MITIGACION: Tokenizacion y eliminacion de almacenamiento en texto plano
    // En lugar de almacenar o enviar directamente los datos sensibles, se tokenizan
    const cardData = {
      paymentBrand,
      ccNumber,
      ccv,
      expirationDate
    };

    // Ejemplo de tokenizacion simple (en la vida real usar un servicio seguro como Stripe o Braintree)
    const token = crypto.createHash('sha256')
                        .update(JSON.stringify(cardData))
                        .digest('hex');

    await InvoiceService.setPaymentCard(
      id,
      invoiceId,
      token // Enviar solo el token, no los datos sensibles en texto plano
    );

    res.status(200).json({ message: 'Payment successful', token });
  } catch (err) {
    next(err);
  }
};

const getInvoicePDF = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.id;
    const pdfName = req.query.pdfName as string | undefined;

    if (!pdfName) {
      return res.status(400).json({ error: 'Missing parameter pdfName' });
    }

    const id = (req as any).user!.id;

    // MITIGACION: Comprobacion de autorizacion
    const hasAccess = await InvoiceService.verifyOwnership(id, invoiceId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this invoice.' });
    }

    const pdf = await InvoiceService.getReceipt(invoiceId, pdfName);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);

  } catch (err) {
    next(err);
  }
};

const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.id;
    const id = (req as any).user!.id;

    // MITIGACION: Verificacion de propiedad antes de devolver la factura
    const hasAccess = await InvoiceService.verifyOwnership(id, invoiceId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this invoice.' });
    }

    const invoice = await InvoiceService.getInvoice(invoiceId);
    res.status(200).json(invoice);

  } catch (err) {
    next(err);
  }
};

export default {
  listInvoices,
  setPaymentCard,
  getInvoice,
  getInvoicePDF
};