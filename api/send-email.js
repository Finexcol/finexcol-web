import nodemailer from 'nodemailer';
import { PDFDocument, rgb } from 'pdf-lib';

export default async function handler(req, res) {
  // Solo POST
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

    // Validar datos
    if (!nombreCliente || !emailCliente) {
      return res.status(400).json({ error: 'Nombre o email faltante' });
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

    // Crear transportador
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailCliente,
      subject: `Solicitud de Crédito Finexcol - Plan de Pagos`,
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
                <li>Certificado laboral O Certificado de prestación de servicios</li>
              </ul>
            </div>

            <p style="color: #555; line-height: 1.6;">
              Por favor, responde este correo adjuntando la documentación requerida.
            </p>

            <p style="color: #555;">
              Saludos,<br>
              <strong>Equipo Finexcol</strong>
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Plan_Pagos_${nombreCliente.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // Enviar
    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: 'Email enviado correctamente',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('ERROR:', error.message);
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

  // Título
  page.drawText('PLAN DE PAGOS FINEXCOL', {
    x: 30,
    y: yPosition,
    size: 18,
    color: rgb(0, 102, 204)
  });

  yPosition -= 30;

  // Información básica
  page.drawText(`Cliente: ${nombreCliente}`, { x: 30, y: yPosition, size: 11 });
  yPosition -= 20;
  page.drawText(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, { x: 30, y: yPosition, size: 11 });
  yPosition -= 30;

  // Resumen
  page.drawText('RESUMEN DEL CRÉDITO', { x: 30, y: yPosition, size: 12, color: rgb(51, 51, 51) });
  yPosition -= 20;

  page.drawText(`Monto: $${parseFloat(monto).toLocaleString('es-CO')}`, { x: 30, y: yPosition, size: 10 });
  yPosition -= 15;
  page.drawText(`Plazo: ${plazo} meses`, { x: 30, y: yPosition, size: 10 });
  yPosition -= 15;
  page.drawText(`Tasa: ${parseFloat(tasaInteres).toFixed(2)}% mensual`, { x: 30, y: yPosition, size: 10 });
  yPosition -= 15;
  page.drawText(`Cuota: $${parseFloat(cuotaMensual).toLocaleString('es-CO')}`, { x: 30, y: yPosition, size: 10 });

  const pdfBuffer = await pdfDoc.save();
  return Buffer.from(pdfBuffer);
}
