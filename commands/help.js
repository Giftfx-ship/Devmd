const settings = require('../settings');
const fs = require('fs');
const path = require('path');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
    
.          「 ✰ 𝑨𝒏𝒅𝒓𝒐𝒎𝒆𝒅𝒂 𝕏Ɽ 」

✰ ✰ ✰ *STATS*✰
• ᴅᴇᴠᴇʟᴏᴘᴇʀ : ᴢᴇᴅ 🛸
• ʟɪʙʀᴀʀʏ : Bailey's 📚
• ᴘʀᴇғɪx : .
• ɢᴀʟᴀxɪᴇꜱ/ᴛᴏᴏʟꜱ: 2500
• Oʀʙɪᴛᴀʟ ᴍᴀss/ Rᴀᴍ : 24.93 GB/61.79 GB 💽
• ʜᴏsᴛ : Linux 🖥️
✰ ✰ ✰ ✰ ✰

.         𝑨𝒏𝒅𝒓𝒐𝒎𝒆𝒅𝒂 𝕏 𝙲𝚘𝚖𝚖𝚊𝚗𝚍𝚜


┏━━━━━ *Ai* ━━━━━━━✰ 
✰ bot
✰ dalle
✰ gpt
✰ chart
✰ calcul
✰ gemini2
✰ bot
✰ dalle
✰ ai
✰ gpt
✰ idea
┗━━━━━━━━━━━━

 ┏━━━━ *MISC* ━━━━━━━━✰ 
✰ owner
✰ dev
✰ support
✰ developer
✰ deployer
✰ poll
✰ script
✰ test1
✰ alive
✰ anti-delete
✰ telegramsc
✰ deploy
✰ calc
✰ time
✰ tempmail
✰ broadcast
✰ guessage
✰ guesscountry
✰ guessgender
✰ menu3
✰ code
✰ repo
✰ ping
✰ desc
✰ runtime
✰ test
✰ uptime
✰ ss
✰ undefined
✰ vcf
✰ getallmembers
✰ channel
✰ group1
✰ update
✰ vision
✰ leonard
✰ hack2
✰ problem
✰ wallpaper1
┗━━━━━━━━━━━━

┏━━━━━━ *GROUP* ━━━━━✰ 
✰ quote
✰ kickall
✰ onlyadmin
✰ welcome
✰ goodbye
✰ antipromote
✰ antidemote
✰ add
✰ disap-off
✰ disap
✰ req
✰ disap90
✰ reject
✰ disap7
✰ disap1
✰ approve
✰ vcf10
✰ tagall
✰ invite
✰ promote
✰ demote
✰ remove
✰ info
✰ antilink
✰ antibot
✰ group
✰ gname
✰ gdesc
✰ revoke
✰ gpp
✰ hidetag
✰ automute
✰ autounmute
✰ fkick
✰ nsfw
✰ antiword
✰ antilink-all
✰ warn
┗━━━━━━━━━━━━

┏━━━━ *MENU* ━━━━━━━━✰ 
✰ lena
✰ help
✰ menu2
✰ menu
┗━━━━━━━━━━━━

 ┏━━━━━━ *USER* ━━━━━━━✰
✰ tgs
✰ crew
✰ left
✰ join
✰ jid
✰ block
✰ unblock
✰ ban
✰ bangroup
✰ sudo
✰ save
✰ mention
✰ spam
✰ reboot
┗━━━━━━━━━━━━

 ┏━━━━━━ *FACT* ━━━━━✰ 
✰ fact
✰ quotes
✰ del
┗━━━━━━━━━━━━

 ┏━━━━━ *SEARCH* ━━━━✰ 
✰ define
✰ lyrics
✰ google
✰ imdb
✰ github
✰ img
✰ video
✰ stickersearch
✰ lyrics
✰ weather
┗━━━━━━━━━━━━

┏━━━━━━ *FUN* ━━━━━✰ 
✰ hack
✰ ranime
✰ fancy
✰ profile
✰ quote
✰ rank
✰ toprank
┗━━━━━━━━━━━━

┏━━━━━ *CONVERTER* ━━━━━✰
✰ emomix
✰ sticker
✰ scrop
✰ take
✰ write
✰ photo
✰ trt
✰ url
┗━━━━━━━━━━━━

┏━━━━━ *AUDIO* ━━━━━━━✰ 
✰ deep
✰ bass
✰ reverse
✰ slow
✰ smooth
✰ tempo
✰ nightcore
┗━━━━━━━━━━━━

┏━━━━━ *RELIGION* ━━━━━━━✰ 
✰ bible
┗━━━━━━━━━━━━

┏━━━━━━━ *PHOTO EDIT* ━━━✰
✰ shit
✰ wasted
✰ wanted
✰ trigger
✰ trash
✰ rip
✰ sepia
✰ rainbow
✰ hitler
✰ invert
✰ jail
✰ affect
✰ beautiful
✰ blur
✰ circle
✰ facepalm
✰ greyscale
✰ joke
┗━━━━━━━━━━━━

┏━━━━━━ *G∆MES* ━━━━✰ 
✰ riddle
✰ guessflag
✰ chifumi
✰ quizz
┗━━━━━━━━━━━━

┏━━━━━━ *AI* ━━━━━━✰
✰ bing
✰ brainshop
✰ 🤔
✰  Boniphacea
✰ gemini
✰ gpt7
✰ generate
✰ extract
✰ bing
✰ bing2
✰ ilama
✰ beautify
✰ gta
✰ lulcat
✰ sadcat
✰ nokia
✰ unforgivable
✰ 1917
✰ cartoon
✰ underwater
✰ watercolor
✰ gfx
✰ gfx2
✰ gfx3
✰ gfx4
✰ gfx5
✰ gfx6
✰ pooh
✰ oogway
✰ drake
✰ biden
✰ drip
✰ clown
✰ ad
✰ blur
✰ meme
✰ pet
✰ alert
✰ caution
┗━━━━━━━━━━━━

┏━━━━━ *PHOTOS* ━━━━✰ 
✰ wallpaper
✰ random
✰ nature
┗━━━━━━━━━━━━

┏━━━━━━ *FUN* ━━━━━✰
✰ lines
✰ insult
✰ dare
✰ truth
┗━━━━━━━━━━━━

┏━━━━━━━ *TOOLS* ━━━✰
✰ encrypt
✰ enhance
┗━━━━━━━━━
┏━━━━━━ *DOWNLOAD* ━━━━✰
✰ gitclone
✰ tiktok-dl
✰ image-dl
✰ instagram
✰ insta-story
✰ video-dl
✰ twitter-dl
✰ mediafire
✰ fb
✰ fb2
✰ apk
✰ igdl
✰ fbdl
✰ tiktok
✰ fbdl2
✰ play
✰ song
✰ play
✰ song
✰ video
✰ videodoc
┗━━━━━━━━━━━━
┏━━━━━ *MISC* ━━━━━━━✰
✰ element
┗━━━━━━━━━━━━

┏━━━━━ *LOGO V1* ━━━━━━━✰
✰ birthday1
✰ birthday2
✰ birthday3
✰ birthday4
✰ birthday5
✰ birthday6
✰ birthday7
✰ comic
✰ zodiac
✰ matrix
✰ road
✰ bear
✰ bokeh
✰ firework
✰ gaming
✰ captain
✰ toxic
✰ business
✰ joker
✰ cloud
✰ tattoo
✰ pentakill
✰ halloween1
✰ horror
✰ halloween2
✰ women's-day
✰ valentine
✰ lightening
✰ shadow
✰ magma
✰ typography
✰ lava
✰ 1918
✰ batman
✰ blood
✰ christmas
┗━━━━━━━━━━━━

┏━━━━━━ *HENTAI* ━━━━✰
✰ hwaifu
✰ trap
✰ hneko
✰ blowjob
✰ hentaivid
┗━━━━━━━━━━━━

┏━━━━━━━━ *OOWNER* ━━━✰
✰ setvar
✰ getallvar
✰ getvar
┗━━━━━━━━

┏━━━━━ *OWNER-SETTINGS* ━━━✰
✰ settings
✰ setprefix
✰ linkmenu
✰ warncount
✰ botname
┗━━━━━━━

┏━━━━━━━ *LOGO V2* ━━━━✰
✰ hacker
✰ dragonball
✰ naruto
✰ didong
✰ wall
✰ summer
✰ neonlight
✰ greenneon
✰ glitch
✰ devil
✰ boom
✰ water
✰ snow
✰ transformer
✰ thunder
✰ harrypotter
✰ cat
✰ whitegold
✰ lightglow
✰ thor
✰ neon
✰ purple
✰ gold
✰ arena
✰ incandescent
✰ gif×1
┗━━━━━━━━━━━━

┏━━━ *IMAGE-GEN* ━━━✰
✰ text2prompt
┗━━━━━━━━━━━━

┏━━━━━━ *REACTIONS* ━━━✰
✰ bully
✰ cuddle
✰ cry
✰ hug
✰ awoo
✰ kiss
✰ lick
✰ pat
✰ smug
✰ bonk
✰ yeet
✰ blush
✰ smile
✰ wave
✰ highfive
✰ handhold
✰ nom
✰ bite
✰ glomp
✰ slap
✰ kill
✰ kick
✰ happy
✰ wink
✰ poke
✰ dance
✰ cringe
┗━━━━━━━━━━━━

┏━━━━━━ *PREFERENCES* ━━✰
✰ setcmd
✰ delcmd
✰ allcmd
┗━━━━━━━━━━━━

┏━ *CALC* ━━━━━━━━━✰
✰ math
┗━━━━━━━━━━━━

┏━━━━ *NEWS* ━━━━━━━✰
✰ technews
┗━━━━━━━━━━━━

┏━━ *TTS* ━━━━━━━━━✰
✰ dit
✰ itta
✰ say
┗━━━━━━━━━━━━

┏━━ *GENERAL* ━━━━━━━✰
✰ vv
┗━━━━━━

┏━━ *MISC* ━✰
✰ waifu
✰ neko
✰ shinobu
✰ megumin
✰ cosplay
✰ couplepp
┗━━━━━━━━━━━━

> ©:𝑨𝒏𝒅𝒓𝒐𝒎𝒆𝒅𝒂, ᴢᴇᴅ 2025`;
    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(chatId, {
                image: imageBuffer,
                caption: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '0029VajbiIfAjPXO45zG2i2c@newsletter',
                        newsletterName: '𝑨𝒏𝒅𝒓𝒐𝒎𝒆𝒅𝒂 𝕏Ɽ',
                        serverMessageId: -1
                    }
                }
            },{ quoted: message });
        } else {
            console.error('Bot image not found at:', imagePath);
            await sock.sendMessage(chatId, { 
                text: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '0029VajbiIfAjPXO45zG2i2c@newsletter',
                        newsletterName: '𝑨𝒏𝒅𝒓𝒐𝒎𝒆𝒅𝒂 𝕏Ɽ',
                        serverMessageId: -1
                    } 
                }
            });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: helpMessage });
    }
}
module.exports = helpCommand;