# SocialForge — Automated Video Processing & FFmpeg Engine

## 1. Engine Architecture & Scope

The SocialForge video subsystem automates the production of high-engagement vertical videos (9:16 aspect ratio, 1080x1920) optimized for Instagram Reels, TikTok, and YouTube Shorts.

The pipeline executes inside the `apps/worker` Docker container via a dedicated FFmpeg subprocess pipeline.

```
[Raw Video Footage / B-Roll] 
           +
[Voiceover Audio / Speech Track] 
           +
[Background Music Track] 
           +
[SRT / VTT Subtitle File] 
           +
[Brand Logo & Outro Card]
           │
           ▼
[FFmpeg Composition Pipeline:
  - 9:16 Scale / Center Crop / Blur Padding
  - Audio Normalization & Sidechain Ducking (-12dB)
  - Styled Brand Font Subtitle Burn-In
  - Logo Watermark & Outro Bumper Stitching]
           │
           ▼
[Rendered 1080x1920 H.264 / AAC MP4] ➔ [Upload to S3 / MinIO]
```

---

## 2. Video Pipeline Composition Stages

### Stage 1: Aspect Ratio Normalization (9:16 1080x1920)
Non-vertical videos (e.g., 16:9 landscape or 1:1 square) are converted using a professional blurred background backdrop:
```bash
# FFmpeg filter: Foreground scaled to fit, background scaled and blurred to fill 1080x1920
[0:v]split=2[bg_in][fg_in];
[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg_blurred];
[fg_in]scale=1080:1920:force_original_aspect_ratio=decrease[fg_scaled];
[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2[base_video]
```

### Stage 2: Audio Mixing & Dynamic Sidechain Ducking
When the voiceover / narrator speaks, the background music volume automatically attenuates to ensure crisp speech intelligibility:
```bash
# Background music is ducked by sidechaining against the voiceover track
[bg_music][voiceover]sidechaincompress=threshold=0.1:ratio=4:attack=50:release=300[mixed_audio]
```

### Stage 3: Dynamic Caption / Subtitle Burning
Subtitles are rendered directly onto the video frames using the `subtitles` / `ass` filter with brand typography and styling:
```bash
-vf "subtitles=captions.srt:force_style='FontName=Inter,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,MarginV=180'"
```

### Stage 4: Brand Watermark & Outro Bumper
- Brand logo bug is placed in the upper right/left safe margin ($x=40, y=40$).
- An animated or static 2-second call-to-action outro bumper is concatenated to the tail of the clip.

---

## 3. Worker Concurrency & Resource Isolation

FFmpeg encoding is heavily CPU and memory intensive. Unchecked parallel renders can starve API and database connections.

1. **Strict Worker Concurrency Limit**:
   - The BullMQ worker for `queue:render-video` is constrained to `concurrency: 2` per node.
2. **Container Resource Limits**:
   - In `docker-compose.yml`, the worker container is assigned dedicated CPU and memory ceilings (`cpus: '4.0'`, `memory: 6G`).
3. **Execution Timeouts**:
   - Every FFmpeg subprocess call is bound by a strict timeout (e.g., 180 seconds). Processes exceeding this limit are terminated via `SIGKILL` to prevent orphan zombie processes.
4. **Scratch Storage Cleanup**:
   - Intermediate frame caches, temporary WAV cuts, and subtitle files are written to `/tmp/socialforge-render/{jobId}/` and purged via an asynchronous `finally` cleanup block.
