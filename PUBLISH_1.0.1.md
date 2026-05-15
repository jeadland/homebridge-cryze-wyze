# Publish 1.0.1

Version 1.0.0 was published but has a runtime bug: it imports `hap-nodejs` directly. Homebridge plugins should not rely on `hap-nodejs` being resolvable as a separate runtime module.

The fix is committed and tagged:

- Repo: https://github.com/jeadland/homebridge-cryze-wyze
- Commit: 7866756
- Tag: v1.0.1

## Publish from Mac

```bash
cd /path/to/homebridge-cryze-wyze
git pull --tags
npm install
npm run build
npm publish --access public
npm view homebridge-cryze-wyze version
```

Expected final output:

```text
1.0.1
```

## Verified on Pi 4 before npm publish

A locally packed fixed build was installed on the Homebridge Pi and Homebridge logs showed:

```text
Loaded plugin: homebridge-cryze-wyze@1.0.0
Registering platform 'homebridge-cryze-wyze.CryzeWyze'
[Cryze Wyze Plugin Test] Initializing Cryze Wyze platform
[Cryze Wyze Plugin Test] Configured Cryze Wyze camera: Front Door Cryze Plugin (front_door)
[Cryze Wyze Plugin Test] Added camera: Front Door Cryze Plugin
```

After 1.0.1 is published, install on Pi 4:

```bash
ssh pi@10.0.1.22
sudo npm install -g homebridge-cryze-wyze@1.0.1
sudo systemctl restart homebridge
```
