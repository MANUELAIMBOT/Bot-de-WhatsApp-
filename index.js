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

// ... (Todo el resto de tu código que tenías abajo sigue igual) ...
// (Asegúrate de dejar todas tus funciones de waSock, mediafireDl, etc., intactas)

iniciarWhatsApp();
console.log('Terminal de SAMUEL HACK  En linea...');
