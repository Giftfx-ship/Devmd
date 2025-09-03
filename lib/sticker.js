import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { spawn } from 'child_process'
import { fileTypeFromBuffer } from 'file-type'
import webp from 'node-webpmux'
import fetch from 'node-fetch'
import ffmpeg from 'fluent-ffmpeg'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeExifImg } from './exif.js'

const execAsync = promisify(exec)
const tmp = path.join(process.cwd(), 'tmp') // __dirname not available in ESM

/**
 * Image to Sticker
 */
function sticker2(img, url) {
  return new Promise(async (resolve, reject) => {
    try {
      if (url) {
        let res = await fetch(url)
        if (res.status !== 200) throw await res.text()
        img = await res.buffer()
      }
      let inp = path.join(tmp, `${Date.now()}.jpeg`)
      await fs.promises.writeFile(inp, img)

      let ff = spawn('ffmpeg', [
        '-y',
        '-i', inp,
        '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1',
        '-f', 'png',
        '-'
      ])
      ff.on('error', reject)
      ff.on('close', async () => {
        await fs.promises.unlink(inp)
      })

      let bufs = []
      const [_spawnprocess, ..._spawnargs] = [
        ...(support.gm ? ['gm'] : support.magick ? ['magick'] : []),
        'convert', 'png:-', 'webp:-'
      ]
      let im = spawn(_spawnprocess, _spawnargs)
      im.on('error', reject)
      im.stdout.on('data', chunk => bufs.push(chunk))
      ff.stdout.pipe(im.stdin)
      im.on('exit', () => resolve(Buffer.concat(bufs)))
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Image/Video to Sticker (XTeam API)
 */
async function sticker3(img, url, packname, author) {
  url = url ? url : await uploadFile(img)
  let res = await fetch('https://api.xteam.xyz/sticker/wm?' + new URLSearchParams({
    url,
    packname,
    author
  }))
  return await res.buffer()
}

/**
 * Image to Sticker (simple ffmpeg)
 */
async function sticker4(img, url) {
  if (url) {
    let res = await fetch(url)
    if (res.status !== 200) throw await res.text()
    img = await res.buffer()
  }
  return await ffmpeg(img, [
    '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1'
  ], 'jpeg', 'webp')
}

async function sticker5(img, url, packname, author, categories = [''], extra = {}) {
  const { Sticker } = await import('wa-sticker-formatter')
  const stickerMetadata = {
    type: 'default',
    pack: packname,
    author,
    categories,
    ...extra
  }
  return (new Sticker(img ? img : url, stickerMetadata)).toBuffer()
}

/**
 * Convert using fluent-ffmpeg
 */
function sticker6(img, url) {
  return new Promise(async (resolve, reject) => {
    if (url) {
      let res = await fetch(url)
      if (res.status !== 200) throw await res.text()
      img = await res.buffer()
    }
    const type = await fileTypeFromBuffer(img) || {
      mime: 'application/octet-stream',
      ext: 'bin'
    }
    if (type.ext == 'bin') return reject(img)

    const tmpPath = path.join(process.cwd(), `tmp/${Date.now()}.${type.ext}`)
    const out = `${tmpPath}.webp`
    await fs.promises.writeFile(tmpPath, img)

    let Fffmpeg = /video/i.test(type.mime) ? ffmpeg(tmpPath).inputFormat(type.ext) : ffmpeg(tmpPath).input(tmpPath)
    Fffmpeg
      .on('error', err => {
        console.error(err)
        fs.promises.unlink(tmpPath)
        reject(img)
      })
      .on('end', async () => {
        fs.promises.unlink(tmpPath)
        resolve(await fs.promises.readFile(out))
      })
      .addOutputOptions([
        `-vcodec`, `libwebp`, `-vf`,
        `scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`
      ])
      .toFormat('webp')
      .save(out)
  })
}

/**
 * Add WhatsApp JSON Exif Metadata
 */
async function addExif(webpSticker, packname, author, categories = [''], extra = {}) {
  const img = new webp.Image()
  const stickerPackId = crypto.randomBytes(32).toString('hex')
  const json = {
    'sticker-pack-id': stickerPackId,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': categories,
    ...extra
  }
  let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
  let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  let exif = Buffer.concat([exifAttr, jsonBuffer])
  exif.writeUIntLE(jsonBuffer.length, 14, 4)
  await img.load(webpSticker)
  img.exif = exif
  return await img.save(null)
}

/**
 * Convert media to WebP and add metadata
 */
async function sticker(isImage, url, packname, author) {
  try {
    const response = await fetch(url)
    const buffer = await response.buffer()
    const stickerBuffer = await writeExifImg(buffer, {
      packname: packname || 'WhatsApp Bot',
      author: author || '@bot'
    })
    return stickerBuffer
  } catch (error) {
    console.error('Error in sticker creation:', error)
    return null
  }
}

const support = {
  ffmpeg: true,
  ffprobe: true,
  ffmpegWebp: true,
  convert: true,
  magick: false,
  gm: false,
  find: false
}

export {
  sticker,
  sticker2,
  sticker3,
  sticker4,
  sticker5,
  sticker6,
  addExif,
  support
}
