const express = require('express');
const webpush = require('web-push');
const cors = require('cors');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

webpush.setVapidDetails(
    'mailto:test@utcv.edu.mx',
    process.env.VAPID_PUBLIC,
    process.env.VAPID_PRIVATE
);

let suscripciones = [];

app.post('/api/subscribe', (req, res) => {
    const sub = req.body;
    const yaExiste = suscripciones.some((s) => s.endpoint === sub.endpoint);
    if (!yaExiste) suscripciones.push(sub);
    console.log('Usuario suscrito. Total:', suscripciones.length);
    res.status(201).json({ ok: true });
});

app.post('/api/remind', (req, res) => {
    const { title, body, delay } = req.body;
    
    console.log(`Recordatorio programado para en ${delay} segundos.`);
    
    // Responder inmediatamente para no bloquear el frontend
    res.status(200).json({ ok: true, message: 'Recordatorio programado' });

    // Esperar el tiempo especificado y luego enviar la push
    setTimeout(async () => {
        const payload = JSON.stringify({ title, body });

        for (const sub of suscripciones) {
            try {
                await webpush.sendNotification(sub, payload);
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    suscripciones = suscripciones.filter((s) => s.endpoint !== sub.endpoint);
                }
            }
        }
        console.log('Recordatorio enviado a', suscripciones.length, 'dispositivos.');
    }, delay * 1000);
});

const path = require('path');

const PORT = process.env.PORT || 3002;

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Si la ruta no coincide con API, servir index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => console.log(`Backend IdeaVault corriendo en el puerto ${PORT}`));
