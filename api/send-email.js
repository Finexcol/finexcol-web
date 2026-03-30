import sgMail from '@sendgrid/mail';
import { PDFDocument, rgb } from 'pdf-lib';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const {
      nombreCliente,
      emailCliente,
      monto,
      plazo,
      tasaInteres,
      cuotaMensual,
      cuotas
    } = req.body;

    if (!nombreCliente || !emailCliente) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Generar PDF
    const pdfBuffer = await generarPDF({
      nombreCliente,
      monto: monto || 1000000,
      plazo: plazo || 12,
      tasaInteres: tasaInteres || 2.5,
      cuotaMensual: cuotaMensual || 90000,
      cuotas: cuotas || []
    });

    // Preparar email
    const msg = {
      to: emailCliente,
      from: 'finexcol@gmail.com', // ✅ CORREO QUE EXISTE
      subject: 'Solicitud de Crédito Finexcol - Plan de Pagos Adjunto',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0066cc; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">Finexcol</h1>
            <p style="margin: 5px 0 0 0;">Créditos Rápidos y Seguros</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333;">¡Hemos recibido tu solicitud de crédito!</h2>
            
            <p style="color: #555; line-height: 1.6;">
              Estimado/a <strong>${nombreCliente}</strong>,
            </p>
            
            <p style="color: #555; line-height: 1.6;">
              Agradecemos tu interés en nuestros servicios. Hemos recibido tu solicitud de crédito. 
              <strong>Adjunto encontrarás el detalle del plan de pagos que solicitaste.</strong>
            </p>

            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-weight: bold;">📋 Información Requerida para Aprobación</p>
              <p style="color: #856404; margin: 10px 0 0 0;">Para que tu solicitud sea aprobada, debes enviarnos:</p>
              <ul style="color: #856404; margin: 10px 0 0 0;">
                <li>Cédula de ciudadanía (ambos lados)</li>
                <li>Comprobante de ingresos últimos 3 meses</li>
                <li>Declaración de renta</li>
                <li>Comprobante de residencia</li>
                <li>Certificado laboral O Certificado de prestación de servicios (si es independiente)</li>
              </ul>
            </div>

            <p style="color: #555; line-height: 1.6;">
              Por favor, responde este correo adjuntando la documentación requerida. 
              Nuestro equipo revisará tu solicitud lo antes posible.
            </p>

            <p style="color: #555; margin-top: 30px;">
              Saludos cordiales,<br>
              <strong>Equipo Finexcol</strong><br>
              <span style="color: #999; font-size: 12px;">Créditos Rápidos y Seguros</span>
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px 20px; text-align: center; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Este es un correo automático. Por favor, no responder a este mensaje directamente.
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: `Plan_Pagos_${nombreCliente.replace(/\s+/g, '_')}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    // Enviar email
    await sgMail.send(msg);

    return res.status(200).json({
      success: true,
      message: 'Email enviado correctamente'
    });

  } catch (error) {
    console.error('ERROR:', error);
    return res.status(500).json({
      error: 'Error al enviar email',
      message: error.message
    });
  }
}

async function generarPDF({ nombreCliente, monto, plazo, tasaInteres, cuotaMensual, cuotas }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  let yPosition = 750;

  page.drawText('PLAN DE PAGOS FINEXCOL', {
    x: 30,
    y: yPosition,
    size: 18,
    color: rgb(0, 102, 204)
  });

  yPosition -= 30;
  page.drawText(`Cliente: ${nombreCliente}`, { x: 30, y: yPosition, size: 11 });
  yPosition -= 20;
  page.drawText(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, { x: 30, y: yPosition, size: 11 });
  yPosition -= 30;

  page.drawText('RESUMEN DEL CRÉDITO', { x: 30, y: yPosition, size: 12, color: rgb(51, 51, 51) });
  yPosition -= 20;

  page.drawText(`Monto: $${parseFloat(monto).toLocaleString('es-CO')}`, { x: 30, y: yPosition, size: 10 });
  yPosition -= 15;
  page.drawText(`Plazo: ${plazo} meses`, { x: 30, y: yPosition, size: 10 });
  yPosition -= 15;
  page.drawText(`Tasa: ${parseFloat(tasaInteres).toFixed(2)}% mensual`, { x: 30, y: yPosition, size: 10 });
  yPosition -= 15;
  page.drawText(`Cuota: $${parseFloat(cuotaMensual).toLocaleString('es-CO')}`, { x: 30, y: yPosition, size: 10, color: rgb(0, 102, 204) });

  // Tabla de amortización simplificada
  if (cuotas && Array.isArray(cuotas) && cuotas.length > 0) {
    yPosition -= 30;
    page.drawText('TABLA DE AMORTIZACIÓN', { x: 30, y: yPosition, size: 12, color: rgb(51, 51, 51) });
    yPosition -= 15;

    const headers = ['Cuota', 'Pago', 'Interés', 'Capital', 'Saldo'];
    const xPositions = [30, 90, 150, 210, 270];

    // Encabezados
    headers.forEach((text, idx) => {
      page.drawText(text, { x: xPositions[idx], y: yPosition, size: 8, color: rgb(255, 255, 255) });
    });

    page.drawRectangle({
      x: 25,
      y: yPosition - 12,
      width: 375,
      height: 12,
      color: rgb(0, 102, 204)
    });

    yPosition -= 25;

    // Filas (máximo 10)
    cuotas.slice(0, 10).forEach((cuota, idx) => {
      const rowData = [
        (idx + 1).toString(),
        `$${parseFloat(cuotaMensual).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        `$${parseFloat(cuota.interes).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        `$${parseFloat(cuota.capital).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        `$${parseFloat(cuota.saldoFinal).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
      ];

      rowData.forEach((text, idx) => {
        page.drawText(text, { x: xPositions[idx], y: yPosition, size: 7 });
      });

      yPosition -= 12;

      if (yPosition < 50) {
        const newPage = pdfDoc.addPage([600, 800]);
        yPosition = 750;
      }
    });
  }

  const pdfBuffer = await pdfDoc.save();
  return Buffer.from(pdfBuffer);
}
