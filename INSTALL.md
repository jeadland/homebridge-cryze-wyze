# Installation Guide

## 1. Install the plugin

```bash
sudo npm install -g homebridge-cryze-wyze
```

Or install from the Homebridge UI once the package is published to npm.

## 2. Run the Cryze backend

This plugin expects Cryze to publish RTSP streams, for example:

```text
rtsp://10.0.1.190:8555/front_door
```

Use `docker-compose.example.yml` as a reference. On Josh's working setup:

- Cryze host: `10.0.1.190`
- Cryze RTSP port: `8555`
- Doorbell Pro stream: `front_door`

## 3. Configure Homebridge

```json
{
  "platform": "CryzeWyze",
  "name": "Cryze Wyze",
  "rtspHost": "10.0.1.190",
  "rtspPort": 8555,
  "cameras": [
    {
      "name": "Front Door",
      "streamName": "front_door",
      "model": "Doorbell Pro",
      "width": 1440,
      "height": 1440,
      "fps": 15,
      "audio": false
    }
  ]
}
```

Restart Homebridge after saving.

## 4. Verify

```bash
ffmpeg -rtsp_transport tcp -i rtsp://10.0.1.190:8555/front_door -t 3 -f null -
```

You should see H264 video details in the output.
