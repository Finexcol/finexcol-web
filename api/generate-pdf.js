import { PDFDocument, rgb } from 'pdf-lib';

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const {
      nombreCliente,
      monto,
      plazo,
      tasaInteres,
      cuotaMensual,
      cuotas
    } = req.body;

    // Validar datos requeridos
    if (!monto || !plazo || !tasaInteres) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Generar PDF
    const pdfBuffer = await generarPDF({
      nombreCliente: nombreCliente || 'Cliente',
      monto,
      plazo,
      tasaInteres,
      cuotaMensual,
      cuotas
    });

    // Enviar como descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Plan_de_Pagos_${Date.now()}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error al generar PDF:', error);
    return res.status(500).json({
      error: 'Error al generar el PDF',
      details: error.message
    });
  }
}

// Función para generar PDF con tabla de amortización
async function generarPDF({ nombreCliente, monto, plazo, tasaInteres, cuotaMensual, cuotas }) {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);
    const { height } = page.getSize();

    let yPosition = height - 50;

    // Título
    page.drawText('PLAN DE PAGOS FINEXCOL', {
      x: 30,
      y: yPosition,
      size: 18,
      color: rgb(0, 102, 204)
    });

    yPosition -= 30;

    // Información del cliente
    page.drawText(`Cliente: ${nombreCliente}`, { x: 30, y: yPosition, size: 11 });
    yPosition -= 20;
    page.drawText(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, { x: 30, y: yPosition, size: 11 });
    yPosition -= 30;

    // Resumen
    page.drawText('RESUMEN DEL CRÉDITO', { x: 30, y: yPosition, size: 12, color: rgb(51, 51, 51) });
    yPosition -= 20;

    page.drawText(`Monto Solicitado: $${parseFloat(monto).toLocaleString('es-CO')}`, { x: 30, y: yPosition, size: 10 });
    yPosition -= 15;
    page.drawText(`Plazo: ${plazo} meses`, { x: 30, y: yPosition, size: 10 });
    yPosition -= 15;
    page.drawText(`Tasa de Interés: ${parseFloat(tasaInteres).toFixed(2)}% mensual`, { x: 30, y: yPosition, size: 10 });
    yPosition -= 15;
    page.drawText(`Cuota Mensual: $${parseFloat(cuotaMensual).toLocaleString('es-CO')}`, { x: 30, y: yPosition, size: 10, color: rgb(0, 102, 204) });
    yPosition -= 30;

    // Tabla de amortización
    page.drawText('TABLA DE AMORTIZACIÓN', { x: 30, y: yPosition, size: 12, color: rgb(51, 51, 51) });
    yPosition -= 20;

    // Encabezados de tabla
    const colWidths = [40, 80, 80, 80, 80, 80];
    const xPositions = [30, 70, 150, 230, 310, 390];
    const headerText = ['Cuota', 'Saldo Inicial', 'Pago', 'Interés', 'Capital', 'Saldo Final'];

    // Dibujar encabezados
    headerText.forEach((text, idx) => {
      page.drawText(text, {
        x: xPositions[idx],
        y: yPosition,
        size: 8,
        color: rgb(255, 255, 255)
      });
    });

    // Fondo gris para encabezado
    page.drawRectangle({
      x: 25,
      y: yPosition - 12,
      width: 545,
      height: 12,
      color: rgb(0, 102, 204)
    });

    yPosition -= 25;

    // Dibujar filas de la tabla
    if (cuotas && Array.isArray(cuotas)) {
      cuotas.forEach((cuota, idx) => {
        const rowData = [
          (idx + 1).toString(),
          `$${parseFloat(cuota.saldoInicial).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          `$${parseFloat(cuotaMensual).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          `$${parseFloat(cuota.interes).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          `$${parseFloat(cuota.capital).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
          `$${parseFloat(cuota.saldoFinal).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
        ];

        rowData.forEach((text, idx) => {
          page.drawText(text, {
            x: xPositions[idx],
            y: yPosition,
            size: 7
          });
        });

        yPosition -= 12;

        // Si no hay espacio, agregar nueva página
        if (yPosition < 50) {
          page = pdfDoc.addPage([600, 800]);
          yPosition = 750;
        }
      });
    }

    const pdfBuffer = await pdfDoc.save();
    return Buffer.from(pdfBuffer);

  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
}
