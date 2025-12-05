const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generatePDF = (type, data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filename = `${type}_${data.id_proyecto}_${Date.now()}.pdf`;
      
      // Asegúrate de que esta carpeta exista o cámbiala por tu ruta de uploads
      const uploadDir = path.join(__dirname, '../uploads/documents'); 
      if (!fs.existsSync(uploadDir)){
          fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, filename);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // --- DISEÑO DEL PDF ---
      doc.fontSize(20).text('BUSQUIDY', { align: 'center' });
      doc.moveDown();

      if (type === 'FACTURA_COMISION') {
        doc.fontSize(16).text('FACTURA ELECTRÓNICA DE COMISIÓN', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`);
        doc.text(`Cliente: ${data.nombre_empresa}`);
        doc.text(`RUT Cliente: ${data.rut_empresa || 'N/A'}`);
        doc.text(`Proyecto ID: #${data.id_proyecto}`);
        doc.moveDown();
        doc.text('Detalle:', { underline: true });
        doc.text(`Servicio de Intermediación Digital (5%): $${data.monto_comision}`);
        doc.moveDown();
        doc.text('TOTAL A PAGAR: $0 (Descontado de Garantía)', { bold: true });
      } 
      else if (type === 'ORDEN_PAGO') {
        doc.fontSize(16).text('ORDEN DE PAGO INTERNA', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`ID Orden: ${Date.now().toString().slice(-6)}`);
        doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`);
        doc.moveDown();
        doc.text(`BENEFICIARIO: ${data.nombre_receptor}`);
        doc.text(`RUT/CUENTA: ${data.rut_receptor || 'Cuenta RUT Generica'}`);
        doc.moveDown();
        doc.fontSize(14).text(`MONTO A TRANSFERIR: $${data.monto}`, { bold: true, align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Concepto: Liberación de fondos Proyecto #${data.id_proyecto} - ${data.titulo_proyecto}`);
        doc.text('Autorizado por: Sistema de Tesorería Busquidy');
      }

      doc.end();

      writeStream.on('finish', () => {
        // En producción, aquí subirías el archivo a S3/GCS y devolverías la URL pública
        // Para local, devolvemos una ruta relativa simulada
        resolve(`/uploads/documents/${filename}`);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePDF };