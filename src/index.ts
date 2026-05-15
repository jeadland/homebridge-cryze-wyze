import { API, PlatformConfig, StaticPlatformPlugin, Logger, PlatformAccessory } from 'homebridge';
import { CameraAccessory } from './cameraAccessory';

interface CryzeCamera {
  name: string;
  deviceId: string;
  streamName: string;
}

class CryzeWyzePlatform implements StaticPlatformPlugin {
  private readonly log: Logger;
  private readonly config: PlatformConfig;
  private readonly api: API;

  constructor(log: Logger, config: PlatformConfig, api: API) {
    this.log = log;
    this.config = config;
    this.api = api;

    this.log.debug('Finished initializing platform:', this.config.name);
  }

  async accessories(callback: (foundAccessories: PlatformAccessory[]) => void): Promise<void> {
    this.log.info('Loading cameras from Cryze...');

    try {
      // Fetch cameras from Cryze API
      const response = await fetch(`${this.config.cryzeApiUrl || 'http://localhost:8080'}/cameras`);
      const cameras: CryzeCamera[] = await response.json();

      this.log.info(`Found ${cameras.length} cameras`);

      const accessories = cameras.map(camera => {
        const uuid = this.api.hap.uuid.generate(camera.deviceId);
        const accessory = new this.api.platformAccessory(camera.name, uuid);

        accessory.context.device = camera;

        // Configure camera accessory
        new CameraAccessory(this, accessory, camera);

        return accessory;
      });

      callback(accessories);
    } catch (error) {
      this.log.error('Failed to load cameras:', error);
      callback([]);
    }
  }
}

module.exports = (api: API): void => {
  api.registerPlatform('CryzeWyze', CryzeWyzePlatform);
};