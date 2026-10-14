"use strict";

/**
 * Shared "copy a message faithfully to another chat" logic, used by both the
 * live mirror and the on-demand link fetcher.
 *
 * A "route" is any object shaped like:
 *   { destEntity, footer = "", dropCaption = false }
 */

const { Api } = require("telegram");
const { CustomFile } = require("telegram/client/uploads");
const { log } = require("./log");

function extFromMime(mime) {
  if (!mime) return "";
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
  };
  if (map[mime]) return map[mime];
  const sub = mime.split("/")[1];
  return sub ? "." + sub.split(";")[0] : "";
}

function fileNameFor(message) {
  if (message.photo) return "photo.jpg";
  const doc = message.document;
  if (doc) {
    const nameAttr = (doc.attributes || []).find(
      (a) => a instanceof Api.DocumentAttributeFilename
    );
    if (nameAttr && nameAttr.fileName) return nameAttr.fileName;
    const base =
      (message.video && "video") ||
      (message.voice && "voice") ||
      (message.audio && "audio") ||
      (message.gif && "animation") ||
      (message.sticker && "sticker") ||
      "file";
    return base + (extFromMime(doc.mimeType) || ".bin");
  }
  return "file.bin";
}

function isMediaLikeDocument(message) {
  const doc = message.document;
  if (!doc) return false;
  if (
    message.video ||
    message.audio ||
    message.voice ||
    message.videoNote ||
    message.gif ||
    message.sticker
  ) {
    return true;
  }
  return (doc.mimeType || "").startsWith("image/");
}

async function downloadToCustomFile(client, message) {
  const buffer = await client.downloadMedia(message, {});
  if (!buffer || !buffer.length) return null;
  const name = fileNameFor(message);
  return new CustomFile(name, buffer.length, "", buffer);
}

function captionFor(message, route) {
  if (route.dropCaption) return route.footer || "";
  const base = message.message || "";
  if (route.footer) return base ? base + route.footer : route.footer;
  return base;
}

async function copySingle(userClient, sender, message, route) {
  const dest = route.destEntity;
  const media = message.media;
  const isWebPage = media instanceof Api.MessageMediaWebPage;

  // Text-only (or link-preview-only) message.
  if (!media || isWebPage) {
    const text = captionFor(message, route);
    if (!text || !text.trim()) {
      log("debug", "skip: empty text message");
      return;
    }
    await sender.sendMessage(dest, {
      message: text,
      formattingEntities: route.footer ? undefined : message.entities,
      linkPreview: isWebPage,
    });
    return;
  }

  // Media message: download bytes and re-upload fresh.
  const file = await downloadToCustomFile(userClient, message);
  if (!file) {
    log("warn", "could not download media; sending caption only");
    const text = captionFor(message, route);
    if (text && text.trim()) {
      await sender.sendMessage(dest, { message: text });
    }
    return;
  }

  const opts = {
    file,
    caption: captionFor(message, route),
    formattingEntities: route.footer ? undefined : message.entities,
  };

  const doc = message.document;
  if (doc) {
    // Preserve video dimensions/duration/streaming, audio tags, voice, etc.
    opts.attributes = doc.attributes;
    if (!isMediaLikeDocument(message)) opts.forceDocument = true;
  }

  await sender.sendFile(dest, opts);
}

async function copyAlbum(userClient, sender, messages, route) {
  const dest = route.destEntity;
  const files = [];
  for (const m of messages) {
    const media = m.media;
    if (!media || media instanceof Api.MessageMediaWebPage) continue;
    const f = await downloadToCustomFile(userClient, m);
    if (f) files.push(f);
  }

  if (files.length === 0) {
    const first = messages.find((m) => (m.message || "").trim());
    if (first) await copySingle(userClient, sender, first, route);
    return;
  }

  const capMsg = messages.find((m) => (m.message || "").trim());
  const caption = capMsg ? captionFor(capMsg, route) : route.footer || "";

  await sender.sendFile(dest, {
    file: files,
    caption,
    formattingEntities: route.footer || !capMsg ? undefined : capMsg.entities,
  });
}

module.exports = { copySingle, copyAlbum };
