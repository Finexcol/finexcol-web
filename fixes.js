// Sobrescribir calcularCuota para redondear a miles
const calcularCuotaOriginal = window.calcularCuota;

window.calcularCuota = function() {
    const monto = parseFloat(document.getElementById('monto').value);
    const plazo = parseInt(document.getElementById('plazo').value);
    
    // Tabla de cobros
    const TABLA_COBROS = [
        { minMonto: 0, maxMonto: 10000000, cobroFijo: 20000, cobroVariable: 0.004 },
        { minMonto: 10000001, maxMonto: 20000000, cobroFijo: 40000, cobroVariable: 0.002 },
        { minMonto: 20000001, maxMonto: 150000000, cobroFijo: 60000, cobroVariable: 0.001 }
    ];
    
    const TASA_BASE = 0.0183;
    const GMF_RATE = 0.004;
    
    // Obtener cobros
    let cobros = null;
    for (let tramo of TABLA_COBROS) {
        if (monto >= tramo.minMonto && monto <= tramo.maxMonto) {
            cobros = {
                cobroFijo: tramo.cobroFijo,
                cobroVariable: monto * tramo.cobroVariable
            };
            break;
        }
    }
    
    if (!cobros) {
        const ultimoTramo = TABLA_COBROS[TABLA_COBROS.length - 1];
        cobros = {
            cobroFijo: ultimoTramo.cobroFijo,
            cobroVariable: monto * ultimoTramo.cobroVariable
        };
    }
    
    const gmf = monto * GMF_RATE;
    const totalCobros = cobros.cobroFijo + cobros.cobroVariable + gmf;
    const capitalAFinanciar = monto + totalCobros;
    
    const numerador = TASA_BASE * Math.pow(1 + TASA_BASE, plazo);
    const denominador = Math.pow(1 + TASA_BASE, plazo) - 1;
    const cuota = capitalAFinanciar * (numerador / denominador);
    
    // ¡¡¡REDONDEAR A MILES!!!
    const cuotaRedondeada = Math.round(cuota / 1000) * 1000;
    
    const totalPagado = cuotaRedondeada * plazo;
    
    function formatCurrency(value) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }
    
    document.getElementById('resultCuota').textContent = formatCurrency(cuotaRedondeada);
    document.getElementById('resultTotal').textContent = formatCurrency(totalPagado);
};

// Sobrescribir enviarSolicitud para mostrar mensaje
const enviarSolicitudOriginal = window.enviarSolicitud;

window.enviarSolicitud = async function() {
    const datos = {
        nombre: document.getElementById('nombre').value,
        documento: document.getElementById('documento').value,
        email: document.getElementById('email').value,
        celular: document.getElementById('celular').value,
        monto: parseFloat(document.getElementById('monto').value),
        plazo: parseInt(document.getElementById('plazo').value),
        cuota: parseFloat(document.getElementById('resultCuota').textContent.replace(/[^\d]/g, '')),
        total: parseFloat(document.getElementById('resultTotal').textContent.replace(/[^\d]/g, ''))
    };
    
    // Mostrar éxito
    alert('✓ ¡Solicitud enviada con éxito!\n\n' +
        'Nombre: ' + datos.nombre + '\n' +
        'Monto: $' + datos.monto.toLocaleString('es-CO') + '\n' +
        'Cuota: $' + datos.cuota.toLocaleString('es-CO') + '\n' +
        'Plazo: ' + datos.plazo + ' meses\n\n' +
        'Pronto habilitaremos el envío de PDF por email.');
    
    // Cerrar modal y resetear
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Resetear formulario
    document.getElementById('nombre').value = '';
    document.getElementById('documento').value = '';
    document.getElementById('email').value = '';
    document.getElementById('celular').value = '';
    document.getElementById('autorizar').checked = false;
    document.getElementById('monto').value = '2000000';
    document.getElementById('plazo').value = '24';
    document.getElementById('observaciones').value = '';
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.querySelector('[data-step="1"]').classList.add('active');
    
    // Recalcular
    window.calcularCuota();
};
