# Troubleshooting

## Camera appears in HomeKit but video does not load

1. Verify Cryze stream works:

```bash
ffmpeg -rtsp_transport tcp -i rtsp://YOUR_HOST:8555/front_door -t 3 -f null -
```

2. Confirm Homebridge can reach Cryze host:

```bash
nc -zv YOUR_HOST 8555
```

3. Check Homebridge logs:

```bash
tail -f /var/lib/homebridge/homebridge.log
```

## Wyze Bridge says Doorbell Pro unsupported

That is expected. Docker Wyze Bridge/TUTK path does not support newer Gateway/Mars cameras like Doorbell Pro. This plugin exists to use Cryze's newer protocol path instead.

## FFmpeg exits immediately

Try disabling audio in config:

```json
"audio": false
```

Doorbell Pro streams often include G711/PCMU audio that can complicate HomeKit playback. Video-only is the most reliable baseline.

## Cryze Android container crashes

Make sure your Cryze Android source has the thread lifecycle fixes in both:

- `RemuxerAudioSource.kt`
- `RemuxerVideoSource.kt`

The bug is repeated `HandlerThread.start()` calls causing `IllegalThreadStateException`.
