// lib/sticker.js
import fs from "fs";
import { tmpdir } from "os";
import crypto from "crypto";
import ff from "fluent-ffmpeg";
import webp from "node-webpmux";
import path from "path";

// Generate random tmp filename
function randomFile(ext) {
  return path.join(
    tmpdir(),
    `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`
  );
}

// Convert image to webp
async function imageToWebp(media) {
  const tmpFileIn = randomFile("jpg");
  const tmpFileOut = randomFile("webp");

  fs.writeFileSync(tmpFileIn, media);

  await new Promise((resolve, reject) => {
    ff(tmpFileIn)
      .on("error", reject)
      .on("end", resolve)
      .addOutputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15," +
          "pad=320:320:-1:-1:color=white@0.0," +
          "split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];" +
          " [b][p] paletteuse",
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });

  const buff = fs.readFileSync(tmpFileOut);
  fs.unlinkSync(tmpFileOut);
  fs.unlinkSync(tmpFileIn);

  return buff;
}

// Convert video to webp
async function videoToWebp(media) {
  const tmpFileIn = randomFile("mp4");
  const tmpFileOut = randomFile("webp");

  fs.writeFileSync(tmpFileIn, media);

  await new Promise((resolve, reject) => {
    ff(tmpFileIn)
      .on("error", reject)
      .on("end", resolve)
      .addOutputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15," +
          "pad=320:320:-1:-1:color=white@0.0," +
          "split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];" +
          " [b][p] paletteuse",
        "-loop",
        "0",
        "-ss",
        "00:00:00",
        "-t",
        "00:00:05",
        "-preset",
        "default",
        "-an",
        "-vsync",
        "0",
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });

  const buff = fs.readFileSync(tmpFileOut);
  fs.unlinkSync(tmpFileOut);
  fs.unlinkSync(tmpFileIn);

  return buff;
}

// Core EXIF writer
async function writeExifFile(media, metadata, isVideo = false) {
  const tmpFileIn = randomFile("webp");
  const tmpFileOut = randomFile("webp");

  fs.writeFileSync(tmpFileIn, media);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-id": "https://github.com/mruniquehacker/Knightbot",
      "sticker-pack-name": metadata.packname || "",
      "sticker-pack-publisher": metadata.author || "",
      "emojis": metadata.categories ? metadata.categories : [""],
    };

    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x16, 0x00,
      0x00, 0x00,
    ]);

    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    await img.load(tmpFileIn);
    fs.unlinkSync(tmpFileIn);

    img.exif = exif;
    await img.save(tmpFileOut);

    return tmpFileOut;
  }
}

// Wrappers for clarity
async function writeExifImg(media, metadata) {
  const wMedia = await imageToWebp(media);
  return await writeExifFile(wMedia, metadata, false);
}

async function writeExifVid(media, metadata) {
  const wMedia = await videoToWebp(media);
  return await writeExifFile(wMedia, metadata, true);
}

async function writeExif(media, metadata) {
  let wMedia = "";
  if (/webp/.test(media.mimetype)) wMedia = media.data;
  else if (/image/.test(media.mimetype)) wMedia = await imageToWebp(media.data);
  else if (/video/.test(media.mimetype)) wMedia = await videoToWebp(media.data);

  return await writeExifFile(wMedia, metadata);
}

export { imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExif };
