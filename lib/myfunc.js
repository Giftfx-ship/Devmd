// lib/utils.js
/**
 * Mrdev COMPANY XMD - A WhatsApp Bot
 * Utils (ESM version)
 */

import { proto, getContentType, delay } from '@whiskeysockets/baileys';
import chalk from 'chalk';
import fs from 'fs';
import Crypto from 'crypto';
import axios from 'axios';
import moment from 'moment-timezone';
import { sizeFormatter } from 'human-readable';
import util from 'util';
import Jimp from 'jimp';
import path from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Time helpers ----------
export const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000);

export const generateMessageTag = (epoch) => {
  let tag = unixTimestampSeconds().toString();
  if (epoch) tag += '.--' + epoch;
  return tag;
};

export const processTime = (timestamp, now) => {
  return moment.duration(now - moment(timestamp * 1000)).asSeconds();
};

// ---------- Random / buffer helpers ----------
export const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;

export const getBuffer = async (url, options) => {
  try {
    const res = await axios({
      method: 'GET',
      url,
      headers: { DNT: 1, 'Upgrade-Insecure-Request': 1 },
      responseType: 'arraybuffer',
      ...(options || {}),
    });
    return res.data;
  } catch (err) {
    return err;
  }
};

export const getImg = getBuffer;

export const fetchJson = async (url, options) => {
  try {
    const res = await axios({
      method: 'GET',
      url,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
      },
      ...(options || {}),
    });
    return res.data;
  } catch (err) {
    return err;
  }
};

// ---------- Formatting helpers ----------
export function runtime(seconds) {
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d > 0 ? d + (d === 1 ? ' day, ' : ' days, ') : '';
  const hDisplay = h > 0 ? h + (h === 1 ? ' hour, ' : ' hours, ') : '';
  const mDisplay = m > 0 ? m + (m === 1 ? ' minute, ' : ' minutes, ') : '';
  const sDisplay = s > 0 ? s + (s === 1 ? ' second' : ' seconds') : '';
  return dDisplay + hDisplay + mDisplay + sDisplay;
}

export const clockString = (ms) => {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, 0)).join(':');
};

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export const isUrl = (url) =>
  typeof url === 'string' &&
  url.match(
    new RegExp(
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/,
      'gi'
    )
  );

export const getTime = (format, date) => {
  if (date) return moment(date).locale('id').format(format);
  return moment.tz('Asia/Jakarta').locale('id').format(format);
};

export const formatDate = (n, locale = 'id') => {
  const d = new Date(n);
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
};

export const tanggal = (numer) => {
  const myMonths = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const myDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
  const tgl = new Date(numer);
  const day = tgl.getDate();
  const bulan = tgl.getMonth();
  let thisDay = myDays[tgl.getDay()];
  const yy = tgl.getYear();
  const year = yy < 1000 ? yy + 1900 : yy;
  return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`;
};

export const jam = (numer, options = {}) => {
  const format = options.format ? options.format : 'HH:mm';
  const timeZone = options?.timeZone;
  const j = timeZone ? moment(numer).tz(timeZone).format(format) : moment(numer).format(format);
  return `${j}`;
};

export const formatp = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
});

export const json = (x) => JSON.stringify(x, null, 2);
export const format = (...args) => util.format(...args);

export const logic = (check, inp, out) => {
  if (inp.length !== out.length) throw new Error('Input and Output must have same length');
  for (let i in inp) if (util.isDeepStrictEqual(check, inp[i])) return out[i];
  return null;
};

export const generateProfilePicture = async (buffer) => {
  const jimp = await Jimp.read(buffer);
  const min = jimp.getWidth();
  const max = jimp.getHeight();
  const cropped = jimp.crop(0, 0, min, max);
  return {
    img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
    preview: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
  };
};

export const bytesToSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const getSizeMedia = (input) =>
  new Promise((resolve, reject) => {
    if (/http/.test(input)) {
      axios.get(input).then((res) => {
        const length = parseInt(res.headers['content-length']);
        const size = bytesToSize(length, 3);
        if (!isNaN(length)) resolve(size);
      });
    } else if (Buffer.isBuffer(input)) {
      const length = Buffer.byteLength(input);
      const size = bytesToSize(length, 3);
      if (!isNaN(length)) resolve(size);
    } else {
      reject('Unsupported input for getSizeMedia');
    }
  });

export const parseMention = (text = '') =>
  [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net');

export const getGroupAdmins = (participants = []) => {
  const admins = [];
  for (const i of participants) {
    if (i?.admin === 'superadmin' || i?.admin === 'admin') admins.push(i.id);
  }
  return admins;
};

// ---------- Serializer ----------
/**
 * Serialize Message
 * @param {import('@whiskeysockets/baileys').WASocket} conn
 * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} m
 * @param {any} store
 */
export const smsg = (conn, m, store) => {
  if (!m) return m;
  const M = proto.WebMessageInfo;

  if (m.key) {
    m.id = m.key.id;
    m.isBaileys = m.id?.startsWith('BAE5') && m.id.length === 16;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat?.endsWith('@g.us');
    const jidGuess = m.fromMe && conn.user?.id ? conn.user.id : (m.participant || m.key.participant || m.chat || '');
    m.sender = conn.decodeJid ? conn.decodeJid(jidGuess) : jidGuess;
    if (m.isGroup) m.participant = (conn.decodeJid ? conn.decodeJid(m.key.participant) : m.key.participant) || '';
  }

  if (m.message) {
    m.mtype = getContentType(m.message);
    m.msg =
      m.mtype === 'viewOnceMessage'
        ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
        : m.message[m.mtype];

    m.body =
      m.message.conversation ||
      m.msg.caption ||
      m.msg.text ||
      (m.mtype === 'listResponseMessage' && m.msg.singleSelectReply?.selectedRowId) ||
      (m.mtype === 'buttonsResponseMessage' && m.msg.selectedButtonId) ||
      (m.mtype === 'viewOnceMessage' && m.msg.caption) ||
      m.text;

    const quoted = (m.quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null);
    m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : [];

    if (m.quoted) {
      let type = getContentType(quoted);
      m.quoted = quoted[type];

      if (type === 'productMessage') {
        type = getContentType(m.quoted);
        m.quoted = m.quoted[type];
      }
      if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };

      m.quoted.mtype = type;
      m.quoted.id = m.msg.contextInfo.stanzaId;
      m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
      m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
      m.quoted.sender = conn.decodeJid ? conn.decodeJid(m.msg.contextInfo.participant) : m.msg.contextInfo.participant;
      m.quoted.fromMe = m.quoted.sender === (conn.user && conn.user.id);
      m.quoted.text =
        m.quoted.text ||
        m.quoted.caption ||
        m.quoted.conversation ||
        m.quoted.contentText ||
        m.quoted.selectedDisplayText ||
        m.quoted.title ||
        '';

      m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];

      m.getQuotedObj = m.getQuotedMessage = async () => {
        if (!m.quoted.id) return false;
        const q = await store.loadMessage(m.chat, m.quoted.id, conn);
        return smsg(conn, q, store);
        // ^ re-use same serializer
      };

      const vM = (m.quoted.fakeObj = M.fromObject({
        key: {
          remoteJid: m.quoted.chat,
          fromMe: m.quoted.fromMe,
          id: m.quoted.id,
        },
        message: quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {}),
      }));

      m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key });
      m.quoted.copyNForward = (jid, forceForward = false, options = {}) =>
        conn.copyNForward(jid, vM, forceForward, options);
      m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
    }
  }

  if (m.msg?.url) m.download = () => conn.downloadMediaMessage(m.msg);

  m.text =
    m.msg?.text ||
    m.msg?.caption ||
    m.message?.conversation ||
    m.msg?.contentText ||
    m.msg?.selectedDisplayText ||
    m.msg?.title ||
    '';

  m.reply = (text, chatId = m.chat, options = {}) =>
    Buffer.isBuffer(text)
      ? conn.sendMedia(chatId, text, 'file', '', m, { ...options })
      : conn.sendText(chatId, text, m, { ...options });

  m.copy = () => smsg(conn, M.fromObject(M.toObject(m)));
  m.copyNForward = (jid = m.chat, forceForward = false, options = {}) =>
    conn.copyNForward(jid, m, forceForward, options);

  return m;
};

// ---------- Image resize ----------
export const reSize = (buffer, w, h) =>
  new Promise(async (resolve) => {
    const img = await Jimp.read(buffer);
    const out = await img.resize(w, h).getBufferAsync(Jimp.MIME_JPEG);
    resolve(out);
  });

// ---------- Hot reload ----------
let watcher;
try {
  watcher = fs.watch(__filename, () => {
    console.log(chalk.redBright(`Update ${__filename}`));
  });
} catch {}
