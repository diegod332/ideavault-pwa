const VAPID_PUBLIC_KEY = 'BKsTf1wxQNiM0tlZUpgzbxoPP-C3phHxs4wEKs7MgK-XJ1vp37vl3YWUNewnNjvTS7I-pHIrGUna2TVpWXmCwpM';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

// Elementos del DOM
const btnSubscribe = document.getElementById('btn-subscribe');
const btnAddNote = document.getElementById('btn-add-note');
const titleInput = document.getElementById('note-title');
const contentInput = document.getElementById('note-content');
const notesGrid = document.getElementById('notes-grid');
const toastEl = document.getElementById('toast');

let notes = JSON.parse(localStorage.getItem('ideavault_notes')) || [];

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// Registro Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('SW registrado'))
            .catch(err => console.log('Error SW:', err));
    });
}

// Renderizar notas
function renderNotes() {
    notesGrid.innerHTML = '';
    notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card glass';
        card.innerHTML = `
            <h3>${note.title || 'Sin título'}</h3>
            <p>${note.content.replace(/\n/g, '<br>')}</p>
            <div class="note-date">${new Date(note.date).toLocaleString()}</div>
            <button class="btn-remind" onclick="scheduleReminder('${note.id}')">⏰ Recordarme (10s)</button>
        `;
        notesGrid.prepend(card);
    });
}

// Guardar nota
btnAddNote.addEventListener('click', () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    
    if (!content) {
        showToast('¡La nota no puede estar vacía!');
        return;
    }

    const newNote = {
        id: Date.now().toString(),
        title,
        content,
        date: new Date().toISOString()
    };

    notes.push(newNote);
    localStorage.setItem('ideavault_notes', JSON.stringify(notes));
    
    titleInput.value = '';
    contentInput.value = '';
    renderNotes();
    showToast('✨ Nota guardada localmente');
});

// Suscripción Push
btnSubscribe.addEventListener('click', async () => {
    try {
        const permiso = await Notification.requestPermission();
        if (permiso !== 'granted') {
            showToast('Permiso denegado.');
            return;
        }

        const registro = await navigator.serviceWorker.ready;
        const sub = await registro.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        // Enviar sub al backend
        await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub)
        });

        showToast('🔔 ¡Suscrito exitosamente!');
        btnSubscribe.style.display = 'none';
    } catch (error) {
        console.error(error);
        showToast('Error al suscribir');
    }
});

// Programar un recordatorio (llama al backend)
window.scheduleReminder = async function(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
        showToast('⏰ Recordatorio programado en 10s...');
        
        await fetch('/api/remind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: note.title || 'Recordatorio de IdeaVault',
                body: note.content,
                delay: 10 // segundos
            })
        });
    } catch (error) {
        showToast('Error de conexión o SW no suscrito.');
    }
}

// Inicio
renderNotes();
