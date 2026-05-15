# Publish Handoff for Codex

Repo: https://github.com/jeadland/homebridge-cryze-wyze
Current tag/release: v1.0.0
Build status on Pi 5: `npm run build` passes.
NPM status: NOT published yet. Homebridge plugin search will not show it until it is published to npm.

## Goal
Publish `homebridge-cryze-wyze` to npm from Josh's Mac, where npm CLI is already authenticated, then verify it appears in npm and can be installed by Homebridge.

## Steps on Mac

```bash
# 1. Clone repo
cd ~/Code # or wherever Josh keeps projects
git clone git@github.com:jeadland/homebridge-cryze-wyze.git
cd homebridge-cryze-wyze

# 2. Verify npm auth
npm whoami

# 3. Install/build/test
npm install
npm run build
npm pack --dry-run

# 4. Verify package name availability
npm view homebridge-cryze-wyze name version || true

# 5. Publish public package
npm publish --access public

# 6. Verify publication
npm view homebridge-cryze-wyze name version description repository.url
```

## If npm publish fails

### 403 / package name permission
The package name might be taken or npm account may not have rights. Pick a new name, e.g.:

- `homebridge-cryze-wyze-camera`
- `homebridge-wyze-cryze`
- `@jeadland/homebridge-cryze-wyze`

If changing package name:

1. Edit `package.json` `name` field.
2. Edit README install command.
3. Commit and tag patch version:

```bash
git add package.json README.md INSTALL.md
git commit -m "Rename npm package"
npm version patch
git push --follow-tags
npm publish --access public
```

### OTP required
Enter npm 2FA code when prompted.

### Build fails on Mac
Fix TypeScript errors, then:

```bash
npm run build
git add -A
git commit -m "Fix build before npm publish"
git push
npm publish --access public
```

## After publish

Homebridge UI plugin search relies on npm. It should become searchable shortly after publish, but may take several minutes.

Test install on Pi 4 Homebridge host:

```bash
ssh pi@10.0.1.22
sudo npm install -g homebridge-cryze-wyze
sudo systemctl restart homebridge
```

Then Homebridge UI -> Plugins -> search `cryze` or `homebridge-cryze-wyze`.

## Current working Homebridge config reference

Cryze backend is on Pi 5 at `10.0.1.190`, RTSP port `8555`.
Doorbell Pro stream path is `front_door`.

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

## Important caveat
This npm package is currently a public plugin scaffold that expects a working Cryze RTSP backend. It does not yet fully automate Cryze container installation. README/INSTALL explain this.
