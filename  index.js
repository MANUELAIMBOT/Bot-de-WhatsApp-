const TelegramBot = require('node-telegram-bot-api');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update, push, set, onValue, onChildAdded } = require('firebase/database');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const ytdl = require('ytdl-core'); // Asegúrate de haber hecho 'npm install ytdl-core'
const config = require('./config'); // Importamos la configuración desde config.js

const bot = new TelegramBot(config.telegramToken, { polling: true });
const SUPER_ADMIN_ID = config.adminTelegramId;
const ADMIN_WA_NUMBERS = config.adminWaNumbers;

const app = initializeApp(config.firebaseConfig);
const db = getDatabase(app);

const waUserStates = {};
const userStates = {};

// ==========================================
// FUNCIONES DE UTILIDAD (MEDIAFIRE Y AUDIO)
// ==========================================
async function mediafireDl(url) {
    try {
        const res = await axios.get(url);
        const $ = cheerio.load(res.data);
        const downloadUrl = $('#downloadButton').attr('href');
        const name = downloadUrl ? downloadUrl.split('/').pop() : 'archivo';
        return { title: name, url: downloadUrl };
    } catch (error) {
        console.error('Error MediaFire:', error.message);
        return null;
    }
}

// ==========================================
// MODULO WHATSAPP (BAILEYS)
// ==========================================
let waSock = null;
const waQueue = [];
let isProcessingWaQueue = false;

async function processWaQueue() {
    if (isProcessingWaQueue || waQueue.length === 0) return;
    isProcessingWaQueue = true;

    while (waQueue.length > 0) {
        const { numero, mensaje, delayAfter, imageUrl, audioPath } = waQueue.shift();
        if (waSock && waSock.authState.creds.registered) {
            try {
                const jid = `${numero}@s.whatsapp.net`;
                if (audioPath) await waSock.sendPresenceUpdate('recording', jid);
                else await waSock.sendPresenceUpdate('composing', jid);
                
                await new Promise(resolve => setTimeout(resolve, audioPath ? 3000 : 2000));
                
                if (audioPath && fs.existsSync(audioPath)) {
                    await waSock.sendMessage(jid, { audio: { url: audioPath }, mimetype: 'audio/mpeg', ptt: true });
                } else if (imageUrl) {
                    await waSock.sendMessage(jid, { image: { url: imageUrl }, caption: mensaje });
                } else if (mensaje) {
                    await waSock.sendMessage(jid, { text: mensaje });
                }
            } catch (e) { console.error('Error enviando:', e.message); }
        }
        await new Promise(resolve => setTimeout(resolve, delayAfter));
    }
    isProcessingWaQueue = false;
}

function enviarMensajeWA(numero, mensaje, isMasivo = false, imageUrl = null) {
    waQueue.push({ numero, mensaje, delayAfter: isMasivo ? 60000 : 3000, imageUrl, audioPath: null });
    processWaQueue();
}

// ==========================================
// INICIO DEL BOT
// ==========================================
async function iniciarWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    waSock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ['SamuelHackStore', 'Chrome', '1.0.0']
    });

    waSock.ev.on('creds.update', saveCreds);

    waSock.ev.on('messages.upsert', async m => {
        if (m.type !== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid.split('@')[0];
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const t = text.trim().toLowerCase();

        // COMANDO DE MUSICA
        if (t.startsWith('.musica ')) {
            const url = text.split(' ')[1];
            await waSock.sendMessage(msg.key.remoteJid, { text: "⏳ *Procesando audio...*" });
            try {
                const stream = ytdl(url, { quality: 'highestaudio' });
                await waSock.sendMessage(msg.key.remoteJid, { audio: { stream: stream }, mimetype: 'audio/mp3', ptt: true });
            } catch (e) {
                await waSock.sendMessage(msg.key.remoteJid, { text: "❌ *Error al descargar.*" });
            }
        }
    });
}

iniciarWhatsApp();
console.log('Terminal de Samuel Hack Store en línea...');
