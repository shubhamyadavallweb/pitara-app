# Integration Overview

This document tracks external services wired into Pitara (Admin panel + Mobile app).

## 1. Bunny.net Storage

| Env Var | Where | Description |
|---------|-------|-------------|
| `VITE_BUNNY_API_KEY` | Admin-panel `.env` | Storage Zone API key (write access) |
| `VITE_BUNNY_STORAGE_ZONE` | Admin-panel `.env` | Name of Bunny Storage Zone (e.g. `pitara-media`) |
| `VITE_BUNNY_PULL_ZONE_URL` | Admin-panel & Mobile `.env` | Public CDN base URL, e.g. `https://cdn.pitara.com` |

Upload helper: `src/lib/bunny.ts` performs `PUT https://storage.bunnycdn.com/{zone}/{path}` with `AccessKey` header.

Paths we store:

* Poster → `series/{seriesId}/poster.{ext}`  ⇒ saved to `series_meta.image_url`
* Episode video → `series/{seriesId}/episodes/{episodeNumber}/{filename}`
* Episode thumbnail → `series/{seriesId}/episodes/{episodeNumber}/thumb.{ext}`  ⇒ saved to `episodes.thumbnail_url`

## 2. Supabase Tables

* `series_meta` – poster URL (`image_url`) + `status` changes from `uploading` → `active` after Bunny upload.
* `episodes` – receives `video_url` & `thumbnail_url` directly after each Bunny upload.
* `notifications` – Admin panel already inserts rows; triggers push delivery.
* `device_tokens` – (new) mobile clients will save their FCM / APNS tokens here.

## 3. Push Notifications

* Edge Function `send-push` (to be added in `supabase/functions/`) listens for `INSERT` on `notifications` and sends FCM/APNS messages to all rows in `device_tokens`.
* Mobile app displays lock-screen alert; In-app updates already handled via Supabase realtime.

## 4. Next Steps

1. Implement Supabase edge function `send-push`.
2. Add token registration in mobile app (Expo / FCM).
3. (Optional) Progress tracking for large video uploads – Bunny API supports multipart.

_Last updated: {{DATE}}_ 