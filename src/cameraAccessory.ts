import {
  AudioStreamingCodecType,
  AudioStreamingSamplerate,
  H264Level,
  H264Profile,
  PlatformAccessory,
  SRTPCryptoSuites,
  Service,
} from 'homebridge';
import { CameraController } from 'hap-nodejs';

import { CryzeWyzePlatform } from './index';
import { CryzeStreamingDelegate } from './streamingDelegate';

export interface CryzeCameraConfig {
  name: string;
  wyzeName?: string;
  streamName?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  width?: number;
  height?: number;
  fps?: number;
  audio?: boolean;
}

export class CryzeCameraAccessory {
  private readonly cameraController: CameraController;
  private readonly motionService?: Service;

  constructor(
    private readonly platform: CryzeWyzePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly camera: CryzeCameraConfig,
  ) {
    const { Service, Characteristic } = this.platform.api.hap;

    accessory.getService(Service.AccessoryInformation)
      ?.setCharacteristic(Characteristic.Manufacturer, camera.manufacturer || 'Wyze')
      .setCharacteristic(Characteristic.Model, camera.model || 'Cryze Camera')
      .setCharacteristic(Characteristic.SerialNumber, camera.serialNumber || camera.streamName || camera.name);

    const delegate = new CryzeStreamingDelegate(platform.log, platform.config, camera);

    this.cameraController = new CameraController({
      cameraStreamCount: 2,
      delegate,
      streamingOptions: {
        supportedCryptoSuites: [
          SRTPCryptoSuites.AES_CM_128_HMAC_SHA1_80,
          SRTPCryptoSuites.NONE,
        ],
        video: {
          codec: {
            profiles: [H264Profile.BASELINE, H264Profile.MAIN, H264Profile.HIGH],
            levels: [H264Level.LEVEL3_1, H264Level.LEVEL3_2, H264Level.LEVEL4_0],
          },
          resolutions: [
            [camera.width || 1440, camera.height || 1440, camera.fps || 15],
            [1280, 720, 15],
            [640, 360, 15],
            [320, 180, 15],
          ],
        },
        audio: camera.audio === false ? undefined : {
          comfort_noise: false,
          codecs: [{
            type: AudioStreamingCodecType.OPUS,
            audioChannels: 1,
            samplerate: [AudioStreamingSamplerate.KHZ_16],
          }],
        },
      },
      sensors: {
        motion: true,
      },
    });

    accessory.configureController(this.cameraController);
    this.motionService = this.cameraController.motionService;
    this.motionService?.updateCharacteristic(Characteristic.MotionDetected, false);

    platform.log.info(`Configured Cryze Wyze camera: ${camera.name} (${camera.streamName})`);
  }
}
