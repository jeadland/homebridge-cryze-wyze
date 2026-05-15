import {
  API,
  APIEvent,
  Categories,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';

import { CryzeCameraAccessory, CryzeCameraConfig } from './cameraAccessory';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

export interface CryzeWyzeConfig extends PlatformConfig {
  name: string;
  rtspHost?: string;
  rtspPort?: number;
  ffmpegPath?: string;
  cameras?: CryzeCameraConfig[];
}

export class CryzeWyzePlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: CryzeWyzeConfig,
    public readonly api: API,
  ) {
    this.log.info('Initializing Cryze Wyze platform');

    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      this.discoverConfiguredCameras();
    });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.debug(`Loading cached accessory: ${accessory.displayName}`);
    this.accessories.push(accessory);
  }

  private discoverConfiguredCameras(): void {
    const cameras = this.config.cameras ?? [];

    if (!cameras.length) {
      this.log.warn('No cameras configured. Add cameras in Homebridge UI or config.json.');
    }

    const configuredUuids = new Set<string>();

    for (const camera of cameras) {
      const streamName = camera.streamName || camera.wyzeName;
      if (!camera.name || !streamName) {
        this.log.warn(`Skipping invalid camera config: ${JSON.stringify(camera)}`);
        continue;
      }

      const uuid = this.api.hap.uuid.generate(`cryze-wyze:${streamName}`);
      configuredUuids.add(uuid);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        existingAccessory.context.camera = { ...camera, streamName };
        this.api.updatePlatformAccessories([existingAccessory]);
        new CryzeCameraAccessory(this, existingAccessory, { ...camera, streamName });
        this.log.info(`Restored camera: ${camera.name}`);
      } else {
        const accessory = new this.api.platformAccessory(camera.name, uuid, Categories.CAMERA);
        accessory.context.camera = { ...camera, streamName };
        new CryzeCameraAccessory(this, accessory, { ...camera, streamName });
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.info(`Added camera: ${camera.name}`);
      }
    }

    const staleAccessories = this.accessories.filter(accessory => !configuredUuids.has(accessory.UUID));
    if (staleAccessories.length) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, staleAccessories);
      for (const accessory of staleAccessories) {
        this.log.info(`Removed stale camera: ${accessory.displayName}`);
      }
    }
  }
}

export default (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, CryzeWyzePlatform);
};
