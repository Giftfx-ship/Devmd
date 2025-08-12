// video.js
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            await sock.sendMessage(chatId, { text: '🎥 What video do you want to download?' }, { quoted: message });
            return;
        }

        // Determine if input is a YouTube link
        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
        } else {
            // Search YouTube for the video
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { text: '❌ No videos found!' }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
            await sock.sendMessage(chatId, {
                image: { url: videoThumbnail },
                caption: `*${videoTitle}*\n\n> _Downloading your video..._`
            }, { quoted: message });
        }

        // Validate YouTube URL
        let urls = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/gi);
        if (!urls) {
            await sock.sendMessage(chatId, { text: '❌ This is not a valid YouTube link!' }, { quoted: message });
            return;
        }

        const apiUrl = `https://api.dreaded.site/api/ytdl/video?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl, { headers: { 'Accept': 'application/json' } });

        if (response.status !== 200 || !response.data?.result?.download?.url) {
            await sock.sendMessage(chatId, { text: '❌ Failed to fetch video from the API.' }, { quoted: message });
            return;
        }

        const videoDownloadUrl = response.data.result.download.url;
        const title = response.data.result.download.filename || 'video.mp4';
        const filename = title;

        // Try sending video directly from URL
        try {
            await sock.sendMessage(chatId, {
                video: { url: videoDownloadUrl },
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `*${title}*\n\n> *_Downloaded by Mr Dev_*`
            }, { quoted: message });
            return;
        } catch (err) {
            console.log('[video.js] Direct send failed:', err.message);
        }

        // Fallback: download and convert
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempFile = path.join(tempDir, `${Date.now()}.mp4`);
        const convertedFile = path.join(tempDir, `converted_${Date.now()}.mp4`);

        let buffer;
        try {
            const videoRes = await axios.get(videoDownloadUrl, { responseType: 'arraybuffer' });
            buffer = Buffer.from(videoRes.data);
        } catch (err) {
            await sock.sendMessage(chatId, { text: '❌ Failed to download the video file.' }, { quoted: message });
            return;
        }

        if (!buffer || buffer.length < 1024) {
            await sock.sendMessage(chatId, { text: '❌ Downloaded file is empty or too small.' }, { quoted: message });
            return;
        }
        fs.writeFileSync(tempFile, buffer);

        try {
            await execPromise(`ffmpeg -i "${tempFile}" -c:v libx264 -c:a aac -preset fast -crf 23 -movflags +faststart "${convertedFile}"`);
            const stats = fs.statSync(convertedFile);
            if (stats.size > 62 * 1024 * 1024) {
                await sock.sendMessage(chatId, { text: '⚠ Video is too large for WhatsApp.' }, { quoted: message });
                return;
            }
            await sock.sendMessage(chatId, {
                video: { url: convertedFile },
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `*${title}*\n\n> *_Downloaded by Mr Dev_*`
            }, { quoted: message });
        } catch (err) {
            console.log('[video.js] Conversion failed:', err.message);
            await sock.sendMessage(chatId, {
                video: fs.readFileSync(tempFile),
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `*${title}*\n\n> *_Downloaded by Mr Dev_*`
            }, { quoted: message });
        }

        // Clean up
        setTimeout(() => {
            [tempFile, convertedFile].forEach(file => {
                if (fs.existsSync(file)) fs.unlinkSync(file);
            });
        }, 5000);

    } catch (error) {
        console.log('📹 Video Command Error:', error.message);
        await sock.sendMessage(chatId, { text: '❌ Download failed: ' + error.message }, { quoted: message });
    }
}

module.exports = videoCommand;
