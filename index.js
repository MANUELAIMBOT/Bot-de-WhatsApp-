const TelegramBot = require('node-telegram-bot-api');
const { initializeApp } = require('firebase/app');
const { getDatabase } = require('firebase/database');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const ytdl = require('ytdl-core');

// CONFIGURACION DESDE VARIABLES DE ENTORNO DE RENDER
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const SUPER_ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);
const ADMIN_WA_NUMBERS = process.env.ADMIN_WA_NUMBERS.split(',');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ESTADOS DEL BOT
let botActivo = true;
let objetivoActual = null; // ID del número al que el bot reenvía mensajes
let waSock = null;

// ==========================================
// MODULO WHATSAPP (BAILEYS)
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

        const senderJid = msg.key.remoteJid;
        const senderNumber = senderJid.split('@')[0];
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // COMANDOS DE CONTROL (Solo Admins)
        if (ADMIN_WA_NUMBERS.includes(senderNumber)) {
            if (text === '.cerrar') {
                botActivo = false;
                await waSock.sendMessage(senderJid, { text: "🚫 *Bot desactivado.*" });
                return;
            }
            if (text === '.abrir') {
                botActivo = true;
                await waSock.sendMessage(senderJid, { text: "✅ *Bot activado.*" });
                return;
            }
            if (text.startsWith('.set ')) {
                objetivoActual = text.split(' ')[1] + "@s.whatsapp.net";
                await waSock.sendMessage(senderJid, { text: `🎯 *Intermediario activo para:* ${text.split(' ')[1]}` });
                return;
            }

            // REENVÍO (Intermediario)
            if (objetivoActual && !text.startsWith('.')) {
                await waSock.sendMessage(objetivoActual, { text: text });
                await waSock.sendMessage(senderJid, { text: `📤 *Enviado a ${objetivoActual.split('@')[0]}:* ${text}` });
                return;
            }
        }

        // COMANDO DE MUSICA (Si el bot está activo)
        if (botActivo && text.startsWith('.musica ')) {
            const url = text.split(' ')[1];
            await waSock.sendMessage(senderJid, { text: "⏳ *Procesando audio...*" });
            try {
                const stream = ytdl(url, { quality: 'highestaudio' });
                await waSock.sendMessage(senderJid, { audio: { stream: stream }, mimetype: 'audio/mp3', ptt: true });
            } catch (e) {
                await waSock.sendMessage(senderJid, { text: "❌ *Error al descargar.*" });
            }
        }
    });
}

iniciarWhatsApp();
console.log('Terminal de SAMUEL HACK en línea...');
