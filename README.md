# Homebridge Cryze Wyze Plugin

[![npm version](https://badge.fury.io/js/homebridge-cryze-wyze.svg)](https://badge.fury.io/js/homebridge-cryze-wyze)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Homebridge plugin that integrates Wyze cameras into Apple HomeKit using [Cryze](https://github.com/xerootg/cryze) as the backend bridge. **Supports Doorbell Pro and Battery Cam Pro** - cameras that don't work with the traditional Wyze Bridge.

## Features

- ✅ **Full HomeKit Secure Video support** (with compatible iCloud+ plan)
- ✅ **Doorbell Pro support** - works with the video doorbell
- ✅ **Battery Cam Pro support** - works with battery-powered cameras
- ✅ **Automatic camera discovery** - finds all your Wyze cameras
- ✅ **Docker-based** - runs Cryze in container for stability
- ✅ **Motion detection** - receive notifications on your devices
- ✅ **Two-way audio** - speak through your cameras
- ✅ **Local processing** - streams stay on your network

## Requirements

- Raspberry Pi 4 (4GB+ RAM recommended) or similar Linux host
- Docker and Docker Compose installed
- Homebridge installed and running
- Wyze account with cameras set up

## Quick Start

```bash
# Install the plugin
npm install -g homebridge-cryze-wyze

# Or via Homebridge UI:
# 1. Go to Plugins
# 2. Search "homebridge-cryze-wyze"
# 3. Click Install
```

## Configuration

Add this to your Homebridge `config.json`:

```json
{
  "platform": "CryzeWyze",
  "name": "Cryze Wyze",
  "cryzeApiUrl": "http://localhost:8080",
  "rtspPort": 8555,
  "cameras": [
    {
      "name": "Front Door",
      "wyzeName": "front_door",
      "unbridge": false
    }
  ]
}
```

### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3'
services:
  cryze_api:
    image: ghcr.io/xerootg/cryze-api:latest
    ports:
      - "8080:8080"
    environment:
      - WYZE_EMAIL=your@email.com
      - WYZE_PASSWORD=yourpassword
    volumes:
      - ./data:/data

  cryze_android:
    image: ghcr.io/xerootg/cryze-android:latest
    privileged: true
    ports:
      - "8555:8554"
    environment:
      - CRYZE_BACKEND_URL=http://cryze_api:8080
```

## How It Works

1. **Cryze** runs an Android container that connects to Wyze's P2P servers
2. **Cryze API** manages credentials and camera discovery
3. **MediaMTX** receives RTSP streams from the Android container
4. **This Plugin** bridges RTSP streams to HomeKit

## Troubleshooting

### Cameras not appearing
- Check Cryze API is running: `curl http://localhost:8080/cameras`
- Verify RTSP streams: `ffplay rtsp://localhost:8555/front_door`

### Video not loading
- Ensure Docker containers are running: `docker-compose ps`
- Check logs: `docker-compose logs -f`

### Connection issues
- Verify Wyze credentials are correct
- Check firewall rules for port 8555
- Ensure cameras are online in Wyze app

## Credits

- [Cryze](https://github.com/xerootg/cryze) by xerootg - The core bridge software
- Original threading fixes by Akiva/OpenClaw

## License

MIT License - See LICENSE file
