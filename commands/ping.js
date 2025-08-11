const { performance } = require('perf_hooks');

module.exports = {
    name: 'ping',
    alias: ['speed', 'pong'],
    category: 'general',
    desc: 'Checks the bot response speed.',
    async run(m, { conn }) {
        const start = performance.now();
        await m.reply('*Pinging...*');
        const end = performance.now();
        const speed = (end - start).toFixed(2);

        await m.reply(
            `*Pong!*\n_Response speed:_ ${speed} ms\n\n— 𝐌𝐑ܮ𝐃𝐄𝐕『ᴾᴿᴵ́ᴹᴱ́』`
        );
    }
};