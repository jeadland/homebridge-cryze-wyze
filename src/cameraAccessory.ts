import { PlatformAccessory, Service, PlatformConfig } from 'homebridge';
import { StreamingDelegate } from './streamingDelegate';

interface CameraDevice {
  name: string;
  deviceId: string;
  streamName: string;
}

export class CameraAccessory {
  private accessory: PlatformAccessory;
  private cameraService: Service;
  private motionService?: Service;
  private streamingDelegate: StreamingDelegate;

  constructor(platform: any, accessory: PlatformAccessory, device: CameraDevice) {
    this.accessory = accessory;
    const { api, config, log } = platform;

    // Set accessory information
    this.accessory.getService(api.hap.Service.AccessoryInformation)!
      .setCharacteristic(api.hap.Characteristic.Manufacturer, 'Wyze')
      .setCharacteristic(api.hap.Characteristic.Model, 'Camera')
      .setCharacteristic(api.hap.Characteristic.SerialNumber, device.deviceId);

    // Create camera service
    this.cameraService = this.accessory.addService(api.hap.Service.CameraRTPStreamManagement);
    this.motionService = this.accessory.addService(api.hap.Service.MotionSensor, device.name);

    // Setup streaming delegate
    this.streamingDelegate = new StreamingDelegate(
      log,
      config,
      device.streamName,
      api
    );

    this.cameraService.setCharacteristic(
      api.hap.Characteristic.SupportedVideoStreamConfiguration,
      this.streamingDelegate.getSupportedVideoStreamConfiguration()
    );

    this.cameraService.setCharacteristic(
      api.hap.Characteristic.SupportedAudioStreamConfiguration,
      this.streamingDelegate.getSupportedAudioStreamConfiguration()
    );

    this.cameraService.setCharacteristic(
      api.hap.Characteristic.SupportedRTPConfiguration,
      this.streamingDelegate.getSupportedRTPConfiguration()
    );

    this.cameraService.setCharacteristic(
      api.hap.Characteristic.StreamingStatus,
      this.streamingDelegate.getStreamingStatus()
    );

    // Handle stream management
    this.cameraService.getCharacteristic(api.hap.Characteristic.SetupEndpoints)
      .onSet(this.streamingDelegate.handleSetupEndpoints.bind(this.streamingDelegate));

    this.cameraService.getCharacteristic(api.hap.Characteristic.SelectedRTPStreamConfiguration)
      .onSet(this.streamingDelegate.handleSelectedStreamConfiguration.bind(this.streamingDelegate));

    log.info(`Camera configured: ${device.name}`);
  }
}