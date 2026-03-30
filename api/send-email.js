import nodemailer from 'nodemailer';
import { PDFDocument, rgb } from 'pdf-lib';

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // LOG: Verificar si las variables existen
    console.log('=== EMAIL SENDER LOG ===');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ EXISTE' : '❌ NO EXISTE');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ EXISTE' : '❌ NO EXISTE');

    // Validar que las variables existan
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ ERROR: Variables de entorno NO configuradas');
      return res.status(500).json({
        error: 'Credenciales de email no configuradas en Vercel',
        missingVars: {
          EMAIL_USER: !process.env.EMAIL_USER,
          EMAIL_PASS: !process.env.EMAIL_PASS
        }
      });
    }

    const {
      nombreCliente,
      emailCliente,
      monto,
      plazo,
      tasaInteres,
      cuotaMensual,
      cuotas
    } = req.body;

    // Validar datos requeridos
    if (!nombreCliente || !emailCliente || !monto || !plazo || !tasaInteres) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    console.log('✅ Datos recibidos correctamente');
    console.log('Cliente:', nombreCliente);
    console.log('Email destino:', emailCliente);

    // Generar PDF con tabla de amortización
    console.log('🔄 Generando PDF...');
    const pdfBuffer = await generarPDF({
      nombreCliente,
      monto,
      plazo,
      tasaInteres,
      cuotaMensual,
      cuotas
    });
    console.log('✅ PDF generado correctamente');

    // Configurar transportador de email
    console.log('🔄 Configurando nodemailer...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verificar conexión
    console.log('🔄 Verificando conexión con Gmail...');
    try {
      await transporter.verify();
      console.log('✅ Conexión con Gmail verificada');
    } catch (verifyError) {
      console.error('❌ Error verificando conexión:', verifyError.message);
      throw new Error(`Conexión Gmail fallida: ${verifyError.message}`);
    }

    // Contenido del email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #0066cc;">
          <h1 style="color: #0066cc; margin: 0;">Finexcol</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Créditos Rápidos y Seguros</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">¡Hemos recibido tu solicitud de crédito!</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 15px;">
            Estimado/a <strong>${nombreCliente}</strong>,
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Agradecemos tu interés en nuestros servicios. Hemos recibido tu solicitud de crédito. 
            <strong>Adjunto encontrarás el detalle del plan de pagos que solicitaste.</strong>
          </p>

          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #856404; margin: 0; font-weight: bold;">📋 Información Requerida para Aprobación</p>
            <p style="color: #856404; margin: 10px 0 0 0; line-height: 1.8;">
              Para que tu solicitud sea aprobada, debes enviarnos la siguiente información adicional:
            </p>
            <ul style="color: #856404; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Cédula de ciudadanía (ambos lados)</li>
              <li>Comprobante de ingresos últimos 3 meses</li>
              <li>Declaración de renta</li>
              <li>Comprobante de residencia</li>
              <li>Certificado laboral O Certificado de prestación de servicios (si es independiente)</li>
            </ul>
          </div>

          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Por favor, responde este correo adjuntando la documentación requerida. 
            Nuestro equipo revisará tu solicitud lo antes posible.
          </p>

          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
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
    `;

    // Enviar email con PDF adjunto
    console.log('🔄 Enviando email...');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailCliente,
      subject: `Solicitud de Crédito Finexcol - Plan de Pagos Adjunto - ${nombreCliente}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Plan_de_Pagos_${nombreCliente.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado correctamente');
      console.log('Message ID:', info.messageId);
      console.log('Response:', info.response);

      return res.status(200).json({
        success: true,
        message: 'Email enviado correctamente',
        email: emailCliente,
        messageId: info.messageId
      });
    } catch (sendError) {
      console.error('❌ Error enviando email:', sendError.message);
      throw new Error(`Error al enviar: ${sendError.message}`);
    }

  } catch (error) {
    console.error('❌ ERROR GENERAL:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      error: 'Error al enviar el email',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Función para generar PDF con tabla de amortización
async function generarPDF({ nombreCliente, monto, plazo, tasaInteres, cuotaMensual, cuotas }) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
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

    // Dibujar filas de la tabla (máximo 20 filas por página)
    if (cuotas && Array.isArray(cuotas)) {
      cuotas.slice(0, 20).forEach((cuota, idx) => {
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
        if (yPosition < 50 && idx < cuotas.length - 1) {
          const newPage = pdfDoc.addPage([600, 800]);
          yPosition = 750;
        }
      });
    }

    const pdfBuffer = await pdfDoc.save();
    return Buffer.from(pdfBuffer);

  } catch (error) {
    console.error('Error generando PDF:', error.message);
    throw error;
  }
}
