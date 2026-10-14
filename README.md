# Resender

A Telegram userbot that **copies** messages from channels where forwarding and
saving are restricted ("restrict saving content" / protected content), and
**re-posts fresh copies** — with no *"Forwarded from"* header — into a
destination chat you control. Same idea as Junction bot / @spycopy_bot.

## Why it needs your account (not just a bot token)

A plain Bot API bot **cannot** read arbitrary private channels and **cannot**
bypass the "restrict saving content" flag — Telegram blocks that for bots and
for official clients.

A **user account over MTProto** can, because:

- a user account can view any channel it has **joined**, and
- the "restrict saving" flag only disables the Save/Forward buttons in official
  clients — it does **not** stop an MTProto client from downloading the bytes.

So this tool logs in with **your account** to read + download, then re-uploads a
fresh copy to the destination. Delivery can be done as your account
(`DELIVERY=userbot`) or as your bot (`DELIVERY=bot`).

## Stack

- Node.js + [GramJS](https://github.com/gram-js/gramjs) (`telegram` package, MTProto)
- No database; config in `.env` + `config.json`

## Setup

### 1. Get API credentials

Go to https://my.telegram.org → **API development tools** → create an app.
Copy the **api_id** and **api_hash** into `.env`:

```
API_ID=1234567
API_HASH=0123456789abcdef0123456789abcdef
```

Your bot token is already set in `.env` (`BOT_TOKEN`). It's only used if you set
`DELIVERY=bot`.

### 2. Install

```bash
npm install
```

### 3. Log in (one time)

```bash
npm run login
```

Enter your phone number, the login code Telegram sends you, and your 2FA
password if you have one. It prints a `USER_SESSION=...` string — paste that line
into `.env`. (This replaces re-logging-in every run. Keep it secret.)

### 4. Configure routes

Edit `config.json`:

```json
{
  "options": { "albumWaitMs": 1500, "logLevel": "info" },
  "routes": [
    { "source": "@private_source", "dest": "@my_mirror", "footer": "", "dropCaption": false }
  ]
}
```

- **source** — the channel to copy FROM. Your account must have **joined** it.
  Accepts `@username`, a numeric id like `-1001234567890`, or a public `t.me/...`
  link. (For private invite links, join the channel first in the Telegram app.)
- **dest** — where to re-post. Your account (or the bot, if `DELIVERY=bot`) must
  be able to post there.
- **footer** — optional text appended to every caption (e.g. `"\n\nvia @me"`).
  When set, original text formatting on that message is dropped.
- **dropCaption** — `true` to strip the original caption entirely.

You can add many routes, and point several sources at one destination.

### 5. Run

```bash
npm start
```

Leave it running. New posts in the source channels are copied to the
destinations in real time. Supports text, photos, videos, documents, audio,
voice notes, GIFs, stickers, and albums.

## Finding a numeric channel id

If `@username` resolution fails (private channel without a public username),
use the numeric id. Easiest way: forward one message from the channel to
[@userinfobot](https://t.me/userinfobot), or run while connected and check the
logs. Channel ids look like `-1001234567890`.

## Delivery as the bot

Set `DELIVERY=bot` in `.env` and **add the bot as an admin** of each destination
channel (with "Post Messages" permission). The user account still does the
reading/downloading; the bot only publishes.

## Running continuously

- Keep it alive with [pm2](https://pm2.keymetrics.io/): `pm2 start npm --name resender -- start`
- Or Docker, a systemd service, etc. It only needs outbound network + the files.

## Troubleshooting

- **"Cannot resolve source ..."** — your account hasn't joined that channel, or
  the id/username is wrong. Join it in the app, then restart.
- **"Cannot resolve dest ..."** — with `DELIVERY=bot`, the bot isn't in the
  destination; add it as admin. With `DELIVERY=userbot`, your account can't post
  there.
- **"USER_SESSION is invalid or expired"** — run `npm run login` again.
- **Nothing copies** — confirm the source actually posts while the bot runs
  (it mirrors new messages, not history), and that `logLevel` is `info`/`debug`.

## Responsible use

Only mirror channels you're entitled to access, and respect copyright, privacy,
and Telegram's Terms of Service. "Restrict saving content" is often a deliberate
choice by the channel owner — redistributing their material can be a ToS or
copyright violation. You are responsible for how you use this.
