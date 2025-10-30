import { Request, Response, NextFunction } from 'express';
import InvoiceService from '../services/invoiceService';
import { Invoice } from '../types/invoice';

//el ID del usuario se obtiene del token JWT decodificado 
const listInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = req.query.status as string | undefined;
    const operator = req.query.operator as string | undefined;
    //ID del usuario autenticado
    const id   = (req as any).user!.id; 
    //llama al servicio que realiza la consulta segura de facturas
    const invoices = await InvoiceService.list(id, state,operator);
    //devuelve las facturas en formato JSON
    res.json(invoices);
  } catch (err) {
    next(err);
  }
};

//todos los campos son obligatorios
// -si falta alguno, responde con 400

//el `user.id` se obtiene del JWT, evitando manipulacion externa
//  - los datos sensibles de la tarjeta no se guardan en texto plano
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
    const id   = (req as any).user!.id; 
    await InvoiceService.setPaymentCard(
      id,
      invoiceId,
      paymentBrand,
      ccNumber,
      ccv,
      expirationDate
    );

    res.status(200).json({ message: 'Payment successful' });
  } catch (err) {
    next(err);
  }
};

//los parametros se validan antes de leer el archivo
//  - evita accesos arbitrarios a archivos
const getInvoicePDF = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.id;
    const pdfName = req.query.pdfName as string | undefined;

    if (!pdfName) {
      return res.status(400).json({ error: 'Missing parameter pdfName' });
    }
    const pdf = await InvoiceService.getReceipt(invoiceId, pdfName);
    // return the pdf as a binary response
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);

  } catch (err) {
    next(err);
  }
};

//en esta version, las consultas estan parametrizadas para evitar inyecciones SQL
const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.id;
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