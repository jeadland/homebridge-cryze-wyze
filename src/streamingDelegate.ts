import { Logger, API, StreamRequestCallback, PrepareStreamRequest, PrepareStreamResponse, StartStreamRequest, StreamSessionIdentifier } from 'homebridge';
import { spawn, ChildProcess } from 'child_process';

export class StreamingDelegate {
  private readonly log: Logger;
  private readonly config: any;
  private readonly streamName: string;
  private readonly api: API;
  private readonly rtspUrl: string;
  private ongoingSessions: Map<string, ChildProcess> = new Map();

  constructor(log: Logger, config: any, streamName: string, api: API) {
    this.log = log;
    this.config = config;
    this.streamName = streamName;
    this.api = api;
    this.rtspUrl = `rtsp://${config.rtspHost || '10.0.1.190'}:${config.rtspPort || '8555'}/${streamName}`;
    this.log.debug(`RTSP URL: ${this.rtspUrl}`);
  }

  getSupportedVideoStreamConfiguration(): any {
    return {
      codec: {
        profiles: [0, 1, 2],
        levels: [0, 1, 2]
      },
      videoAttrs: {
        width: { min: 320, max: 1920 },
        height: { min: 240, max: 1080 }
      }
    };
  }

  getSupportedAudioStreamConfiguration(): any {
    return {
      comfort_noise: false,
      codecs: [{
        type: 0,
        samplerate: 0
      }]
    };
  }

  getSupportedRTPConfiguration(): any {
    return {
      srtp_crypto_suite: 0
    };
  }

  getStreamingStatus(): any {
    return {
      status: 0
    };
  }

  async handleSetupEndpoints(request: PrepareStreamRequest, callback: StreamRequestCallback): Promise<void> {
    this.log.info(`Setting up stream for ${this.streamName}`);
    
    const response: PrepareStreamResponse = {
      video: {
        port: request.video.port,
        srtp_parameters: request.video.srtp_parameters,
        ssrc: Math.floor(Math.random() * 1000000)
      },
      audio: {
        port: request.audio.port,
        srtp_parameters: request.audio.srtp_parameters,
        ssrc: Math.floor(Math.random() * 1000000)
      }
    };

    callback(null, response);
  }

  async handleSelectedStreamConfiguration(request: StartStreamRequest, callback: StreamRequestCallback): Promise<void> {
    const sessionId = request.sessionID;
    
    if (request.type === 'start') {
      this.log.info(`Starting stream: ${this.streamName}`);
      this.startFFmpeg(sessionId, request);
      callback(null);
    } else if (request.type === 'stop') {
      this.log.info(`Stopping stream: ${this.streamName}`);
      this.stopFFmpeg(sessionId);
      callback(null);
    }
  }

  private startFFmpeg(sessionId: string, request: StartStreamRequest): void {
    const ffmpegPath = 'ffmpeg';
    const args = [
      '-rtsp_transport', 'tcp',
      '-re', '-i', this.rtspUrl,
      '-analyzeduration', '15000000',
      '-probesize', '10000000',
      '-vcodec', 'copy',
      '-acodec', 'copy',
      '-f', 'mpegts',
      `srtp://${request.video.proxy_rtp_ip}:${request.video.port}?rtcpport=${request.video.port}&pkt_size=1316`
    ];

    this.log.debug(`FFmpeg command: ${ffmpegPath} ${args.join(' ')}`);

    const ffmpeg = spawn(ffmpegPath, args);
    this.ongoingSessions.set(sessionId, ffmpeg);

    ffmpeg.on('error', (err) => {
      this.log.error(`FFmpeg error: ${err}`);
    });

    ffmpeg.on('close', (code) => {
      this.log.debug(`FFmpeg exited with code ${code}`);
      this.ongoingSessions.delete(sessionId);
    });
  }

  private stopFFmpeg(sessionId: string): void {
    const ffmpeg = this.ongoingSessions.get(sessionId);
    if (ffmpeg) {
      ffmpeg.kill('SIGTERM');
      this.ongoingSessions.delete(sessionId);
    }
  }
}