import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";
import { db } from "../../../db/index.ts";
import { floorTables } from "../../../db/schema/04_floor_tables.ts";
import { eq } from "drizzle-orm";

export class QrService {
  async getTableQr(tableId: number, baseUrl: string) {
    const [table] = await db
      .select({
        token: floorTables.qrToken,
        number: floorTables.tableNumber,
      })
      .from(floorTables)
      .where(eq(floorTables.id, BigInt(tableId)))
      .limit(1);

    if (!table) return null;

    const url = `${baseUrl}/s/${table.token}`;
    const pngBuffer = await QRCode.toBuffer(url, { width: 400 });
    
    return {
      pngBuffer,
      tableNumber: table.number,
      url,
    };
  }

  async getTableQrPdf(tableId: number, baseUrl: string) {
    const qrData = await this.getTableQr(tableId, baseUrl);
    if (!qrData) return null;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 500]);
    
    const qrImage = await pdfDoc.embedPng(qrData.pngBuffer);
    
    page.drawImage(qrImage, {
      x: 50,
      y: 100,
      width: 300,
      height: 300,
    });
    
    page.drawText(`Table: ${qrData.tableNumber}`, {
      x: 150,
      y: 420,
      size: 24,
      color: rgb(0, 0, 0),
    });

    return await pdfDoc.save();
  }

  async getAllTablesQrPdf(baseUrl: string) {
    const tables = await db
      .select({
        token: floorTables.qrToken,
        number: floorTables.tableNumber,
      })
      .from(floorTables)
      .where(eq(floorTables.isActive, true));

    const pdfDoc = await PDFDocument.create();

    for (const table of tables) {
      const url = `${baseUrl}/s/${table.token}`;
      const pngBuffer = await QRCode.toBuffer(url, { width: 400 });
      const page = pdfDoc.addPage([400, 500]);
      
      const qrImage = await pdfDoc.embedPng(pngBuffer);
      
      page.drawImage(qrImage, { x: 50, y: 100, width: 300, height: 300 });
      page.drawText(`Table: ${table.number}`, { x: 150, y: 420, size: 24, color: rgb(0, 0, 0) });
    }

    return await pdfDoc.save();
  }
}

export const qrService = new QrService();
