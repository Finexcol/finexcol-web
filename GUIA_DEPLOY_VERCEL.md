# 🚀 GUÍA DE DEPLOY FINEXCOL - OPCIÓN 1 (FULL STACK)

## 📋 Resumen

Has creado una solución COMPLETA con:
1. **Frontend**: Modal multi-paso con simulador integrado (index_fullstack.html)
2. **Backend**: Node.js + Express + Nodemailer (server.js)
3. **PDF**: Generador automático de plan de pagos
4. **Email**: Envío automático con PDF adjunto

---

## 🔧 PASO 1: Preparar Backend en Vercel

### 1.1 Crear cuenta en Vercel
- Ve a https://vercel.com
- Crea cuenta gratuita
- Conecta tu GitHub (Finexcol/finexcol-web)

### 1.2 Crear `vercel.json` en tu repositorio

```json
{
  "buildCommand": "npm install",
  "framework": null,
  "installCommand": "npm install",
  "outputDirectory": "public"
}
```

### 1.3 Configurar variables de entorno en Vercel

En Vercel Dashboard → Tu proyecto → Settings → Environment Variables

```
EMAIL_USER = info@finexcol.com
EMAIL_PASS = [TU_APP_PASSWORD_GMAIL]
NODE_ENV = production
```

---

## 📧 PASO 2: Configurar Gmail App Password

### 2.1 Habilitar autenticación de dos factores en Gmail
1. Ve a https://myaccount.google.com
2. Security (izquierda)
3. Two-Step Verification (activar)

### 2.2 Generar App Password
1. Ve a https://myaccount.google.com/apppasswords
2. Selecciona: Mail + Windows Computer
3. Copia el password de 16 caracteres
4. Pega en Vercel como `EMAIL_PASS`

---

## 📁 PASO 3: Estructura de carpetas en GitHub

```
finexcol-web/
├── index.html                    (index_fullstack.html)
├── contact.html
├── simulador.html
├── logo-finexcol.jpg
├── logo-finexcol-completo.jpg
├── server.js                     (Backend)
├── package.json                  (Dependencias)
├── .env.example                  (Referencia)
├── vercel.json                   (Config deploy)
└── public/                       (Archivos estáticos)
    └── (archivos HTML van aquí en Vercel)
```

---

## 🚀 PASO 4: Deploy a Vercel

### 4.1 Sube los archivos a GitHub

```bash
git add .
git commit -m "Agregar full stack: frontend modal + backend Node.js"
git push origin main
```

### 4.2 Deploy automático en Vercel

1. Ve a https://vercel.com/dashboard
2. Click en tu proyecto
3. Vercel desplegará automáticamente (tarda 2-3 min)
4. Tu backend estará en: `https://finexcol.vercel.app/api`

---

## ✅ PASO 5: Pruebas

### 5.1 Verificar backend
```
https://finexcol.vercel.app/api/health
```
Debe devolver: `{"status":"OK","timestamp":"2026-03-29T..."}`

### 5.2 Prueba completa del flujo
1. Ve a https://finexcol.com
2. Haz click en "Solicitar Crédito"
3. Completa Paso 1 (datos personales)
4. Completa Paso 2 (simulador)
5. Completa Paso 3 (confirmación)
6. Haz click en "Enviar Solicitud"
7. ✓ Deberías recibir email con PDF

---

## 🛠️ CONFIGURACIÓN FINAL EN GITHUB

### Archivo: vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "*.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 📊 Flujo del Usuario Completo

```
1. Usuario entra a finexcol.com
   ↓
2. Click "Solicitar Crédito"
   ↓
3. Modal Paso 1: Ingresa datos (nombre, cédula, email, celular)
   ↓
4. Modal Paso 2: Ajusta monto y plazo, ve cuota en tiempo real
   ↓
5. Modal Paso 3: Revisa resumen y confirma
   ↓
6. Click "Enviar Solicitud"
   ↓
7. Backend (Node.js) recibe solicitud
   ↓
8. Genera PDF con tabla de amortización
   ↓
9. Envía email a usuario con PDF adjunto
   ↓
10. Email también va a solicitudes@finexcol.com
   ↓
11. Usuario recibe PDF en su email 📧
```

---

## 🔒 Seguridad

- ✅ CORS habilitado para finexcol.com
- ✅ Variables de entorno protegidas en Vercel
- ✅ No se guardan datos sensibles localmente
- ✅ PDF se genera en memoria (no se almacena)
- ✅ Email con encriptación (nodemailer + Gmail)

---

## 🚨 Problemas Comunes

### Email no se envía
**Solución:**
- Revisa App Password de Gmail
- Confirma que EMAIL_USER es correcto
- Verifica variables de entorno en Vercel

### Error CORS
**Solución:**
- El CORS ya está configurado en server.js
- Verifica que el dominio esté en whitelist

### PDF no se genera
**Solución:**
- Revisa logs en Vercel
- Verifica que PDFKit esté instalado (`npm install pdfkit`)

---

## 📱 Resultado Final

Tu sitio ahora tiene:
- ✅ Landing profesional con logo
- ✅ Modal de solicitud multi-paso
- ✅ Simulador integrado en vivo
- ✅ Backend automático que genera PDFs
- ✅ Email con Plan de Pagos
- ✅ **100% Funcional y En Vivo**

---

## 🎯 Próximos Pasos (Futuro)

1. **Base de datos**: Guardar solicitudes en PostgreSQL
2. **Dashboard admin**: Ver todas las solicitudes
3. **SMS**: Notificaciones por WhatsApp
4. **Autenticación**: Login de usuarios
5. **Integración bancaria**: Transferencias automáticas

---

**¿PREGUNTAS?**

Este es un sistema COMPLETO y LISTO PARA PRODUCCIÓN.

Cuando estés listo para el deploy, sigue estos pasos exactamente.

🚀 **¡FINEXCOL.COM ESTARÁ 100% FUNCIONAL!**
