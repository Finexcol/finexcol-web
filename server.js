// server.js - Backend Finexcol
const express = require('express');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configurar transporte de email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'info@finexcol.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Configuración de tasas y cobros
const TASA_BASE = 0.0183;
const TASA_REAL_BASE = 0.019993;
const GMF_RATE = 0.004;

const TABLA_COBROS = [
    { minMonto: 0, maxMonto: 10000000, cobroFijo: 20000, cobroVariable: 0.004 },
    { minMonto: 10000001, maxMonto: 20000000, cobroFijo: 40000, cobroVariable: 0.002 },
    { minMonto: 20000001, maxMonto: 150000000, cobroFijo: 60000, cobroVariable: 0.001 }
];

// Utilidades
function obtenerCobros(monto) {
    for (let tramo of TABLA_COBROS) {
        if (monto >= tramo.minMonto && monto <= tramo.maxMonto) {
            return {
                cobroFijo: tramo.cobroFijo,
                cobroVariable: monto * tramo.cobroVariable
            };
        }
    }
    const ultimoTramo = TABLA_COBROS[TABLA_COBROS.length - 1];
    return {
        cobroFijo: ultimoTramo.cobroFijo,
        cobroVariable: monto * ultimoTramo.cobroVariable
    };
}

function calcularCuota(monto, tasa, plazo, cobros) {
    const gmf = monto * GMF_RATE;
    const totalCobros = cobros.cobroFijo + cobros.cobroVariable + gmf;
    const capitalAFinanciar = monto + totalCobros;
    
    if (tasa === 0) return capitalAFinanciar / plazo;
    
    const numerador = tasa * Math.pow(1 + tasa, plazo);
    const denominador = Math.pow(1 + tasa, plazo) - 1;
    return capitalAFinanciar * (numerador / denominador);
}

function calcularTasaReal(monto, plazo, cuota) {
    let tasa = 0.01;
    const maxIteraciones = 100;
    const tolerancia = 0.000001;
    
    for (let i = 0; i < maxIteraciones; i++) {
        const factor = Math.pow(1 + tasa, plazo);
        const f = monto * (tasa * factor) / (factor - 1) - cuota;
        
        const h = tasa * 0.0001;
        const factor_h = Math.pow(1 + tasa + h, plazo);
        const f_h = monto * ((tasa + h) * factor_h) / (factor_h - 1) - cuota;
        const derivada = (f_h - f) / h;
        
        if (Math.abs(f) < tolerancia) return tasa;
        if (Math.abs(derivada) < 0.0001) break;
        
        tasa = tasa - f / derivada;
        tasa = Math.max(0.0001, Math.min(tasa, 0.5));
    }
    return tasa;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Generar PDF con tabla de amortización
function generarPDFAmortizacion(datos, tasaReal, callback) {
    const doc = new PDFDocument({ margin: 40 });
    let buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        callback(pdfBuffer);
    });

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('FINEXCOL', 50, 40);
    doc.fontSize(10).font('Helvetica').text('Financial Express Colombia', 50, 70);
    doc.moveTo(50, 85).lineTo(550, 85).stroke();

    // Información de la solicitud
    doc.fontSize(12).font('Helvetica-Bold').text('SOLICITUD DE CRÉDITO', 50, 110);
    doc.fontSize(10).font('Helvetica').text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 50, 130);

    // Datos del cliente
    doc.fontSize(11).font('Helvetica-Bold').text('DATOS DEL CLIENTE', 50, 160);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nombre: ${datos.nombre}`, 50, 180);
    doc.text(`Cédula: ${datos.documento}`, 50, 195);
    doc.text(`Email: ${datos.email}`, 50, 210);
    doc.text(`Celular: ${datos.celular}`, 50, 225);

    // Parámetros del crédito
    doc.fontSize(11).font('Helvetica-Bold').text('PARÁMETROS DEL CRÉDITO', 50, 260);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Monto: ${formatCurrency(datos.monto)}`, 50, 280);
    doc.text(`Plazo: ${datos.plazo} meses`, 50, 295);
    doc.text(`Tasa Mensual (mostrada): 1.8340%`, 50, 310);
    doc.text(`Tasa Real: ${(tasaReal * 100).toFixed(4)}%`, 50, 325);
    doc.text(`Cuota Mensual: ${formatCurrency(datos.cuota)}`, 50, 340);
    doc.text(`Total a Pagar: ${formatCurrency(datos.total)}`, 50, 355);

    // Tabla de amortización
    doc.fontSize(11).font('Helvetica-Bold').text('PLAN DE AMORTIZACIÓN', 50, 390);
    
    const tableTop = 410;
    const col1 = 50, col2 = 100, col3 = 180, col4 = 280, col5 = 380, col6 = 480;
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Cuota', col1, tableTop);
    doc.text('Valor', col2, tableTop);
    doc.text('Capital', col3, tableTop);
    doc.text('Interés', col4, tableTop);
    doc.text('Saldo', col5, tableTop);

    // Generar tabla
    let saldoActual = datos.monto;
    doc.fontSize(8).font('Helvetica');
    let y = tableTop + 20;
    const maxRowsPerPage = 25;
    let rowCount = 0;

    for (let i = 1; i <= datos.plazo; i++) {
        const interes = saldoActual * tasaReal;
        const capital = datos.cuota - interes;
        saldoActual -= capital;

        doc.text(i.toString(), col1, y);
        doc.text(formatCurrency(datos.cuota), col2, y);
        doc.text(formatCurrency(capital), col3, y);
        doc.text(formatCurrency(interes), col4, y);
        doc.text(formatCurrency(Math.max(0, saldoActual)), col5, y);

        y += 15;
        rowCount++;

        // Nueva página si es necesario
        if (rowCount >= maxRowsPerPage && i < datos.plazo) {
            doc.addPage();
            y = 50;
            rowCount = 0;
        }
    }

    // Footer
    doc.moveTo(50, doc.y + 20).lineTo(550, doc.y + 20).stroke();
    doc.fontSize(8).font('Helvetica').text(
        'Este documento es confidencial. Emitido por Finexcol - Financial Express Colombia',
        50,
        doc.y + 30
    );
    doc.text(`Documento generado el ${new Date().toLocaleString('es-CO')}`, 50, doc.y + 15);

    doc.end();
}

// API: Procesar solicitud de crédito
app.post('/api/solicitud', async (req, res) => {
    try {
        const { nombre, documento, email, celular, monto, plazo, cuota, total, observaciones } = req.body;

        // Validar datos
        if (!nombre || !documento || !email || !celular || !monto || !plazo) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        // Calcular tasa real
        const cobros = obtenerCobros(monto);
        const tasaReal = calcularTasaReal(monto, plazo, cuota);

        // Preparar datos para PDF
        const datosParaPDF = {
            nombre,
            documento,
            email,
            celular,
            monto,
            plazo,
            cuota,
            total: monto + (cuota * plazo - monto),
            observaciones
        };

        // Generar PDF
        generarPDFAmortizacion(datosParaPDF, tasaReal, async (pdfBuffer) => {
            try {
                // Enviar email con PDF
                const mailOptions = {
                    from: process.env.EMAIL_USER || 'finexcol@gmail.com',
                    to: email,
                    cc: 'finexcol@gmail.com',
                    subject: `Finexcol - Plan de Pagos de tu Solicitud de Crédito`,
                    html: `
                        <h2>¡Hola ${nombre}!</h2>
                        <p>Gracias por solicitar un crédito con Finexcol. Aquí están los detalles de tu solicitud:</p>
                        
                        <h3>Resumen del Crédito:</h3>
                        <ul>
                            <li><strong>Monto:</strong> $${monto.toLocaleString('es-CO')}</li>
                            <li><strong>Plazo:</strong> ${plazo} meses</li>
                            <li><strong>Cuota Mensual:</strong> $${Math.round(cuota).toLocaleString('es-CO')}</li>
                            <li><strong>Total a Pagar:</strong> $${Math.round(cuota * plazo).toLocaleString('es-CO')}</li>
                        </ul>

                        <p>El plan de pagos completo está en el PDF adjunto.</p>
                        
                        <h3>Próximos Pasos:</h3>
                        <ol>
                            <li>Revisaremos tu solicitud en las próximas 24 horas</li>
                            <li>Te contactaremos al celular: ${celular}</li>
                            <li>Si todo está bien, transferimos el dinero a tu cuenta</li>
                        </ol>

                        <p>Si tienes preguntas, contáctanos:</p>
                        <p>
                            📧 info@finexcol.com<br>
                            📧 solicitudes@finexcol.com<br>
                            ⏰ Disponible 24/7
                        </p>

                        <p>Gracias por confiar en Finexcol.</p>
                    `,
                    attachments: [
                        {
                            filename: `Plan_Pagos_${documento}.pdf`,
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        }
                    ]
                };

                // Enviar email
                await transporter.sendMail(mailOptions);

                // Guardar en base de datos (simulado)
                const solicitud = {
                    id: Date.now(),
                    nombre,
                    documento,
                    email,
                    celular,
                    monto,
                    plazo,
                    cuota: Math.round(cuota),
                    total: Math.round(cuota * plazo),
                    estado: 'pendiente',
                    fechaCreacion: new Date(),
                    observaciones
                };

                console.log('Solicitud guardada:', solicitud);

                res.json({ 
                    success: true, 
                    message: 'Solicitud enviada correctamente',
                    solicitudId: solicitud.id
                });

            } catch (error) {
                console.error('Error al enviar email:', error);
                res.status(500).json({ error: 'Error al procesar la solicitud' });
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Finexcol Backend ejecutándose en puerto ${PORT}`);
    console.log(`📧 Email: ${process.env.EMAIL_USER || 'configure variables de entorno'}`);
});

module.exports = app;
