import {
  CameraStreamingDelegate,
  H264Level,
  H264Profile,
  Logger,
  PrepareStreamCallback,
  PrepareStreamRequest,
  PrepareStreamResponse,
  SnapshotRequest,
  SnapshotRequestCallback,
  SRTPCryptoSuites,
  StartStreamRequest,
  StreamRequestCallback,
  StreamRequestTypes,
  StreamingRequest,
} from 'homebridge';
import { ChildProcess, spawn } from 'child_process';

import { CryzeCameraConfig } from './cameraAccessory';
import { CryzeWyzeConfig } from './index';

interface PendingSession {
  address: string;
  videoPort: number;
  localVideoPort: number;
  videoCryptoSuite: SRTPCryptoSuites;
  videoSRTP: Buffer;
  videoSSRC: number;
}

interface OngoingSession {
  localVideoPort: number;
  process: ChildProcess;
}

const FFMPEG_H264_PROFILE_NAMES = ['baseline', 'main', 'high'];
const FFMPEG_H264_LEVEL_NAMES = ['3.1', '3.2', '4.0'];
const usedPorts = new Set<number>();

function getPort(): number {
  for (let port = 5011; ; port++) {
    if (!usedPorts.has(port)) {
      usedPorts.add(port);
      return port;
    }
  }
}

export class CryzeStreamingDelegate implements CameraStreamingDelegate {
  private readonly rtspUrl: string;
  private readonly ffmpegPath: string;
  private readonly pendingSessions: Record<string, PendingSession> = {};
  private readonly ongoingSessions: Record<string, OngoingSession> = {};

  constructor(
    private readonly log: Logger,
    private readonly config: CryzeWyzeConfig,
    private readonly camera: CryzeCameraConfig,
  ) {
    const host = config.rtspHost || 'localhost';
    const port = config.rtspPort || 8555;
    this.ffmpegPath = config.ffmpegPath || 'ffmpeg';
    this.rtspUrl = `rtsp://${host}:${port}/${camera.streamName}`;
  }

  handleSnapshotRequest(request: SnapshotRequest, callback: SnapshotRequestCallback): void {
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', this.rtspUrl,
      '-frames:v', '1',
      '-filter:v', `scale=${request.width}:${request.height}`,
      '-f', 'image2',
      '-vcodec', 'mjpeg',
      '-',
    ];

    const ffmpeg = spawn(this.ffmpegPath, args, { env: process.env });
    const chunks: Buffer[] = [];

    ffmpeg.stdout.on('data', chunk => chunks.push(chunk));
    ffmpeg.stderr.on('data', data => this.log.debug(`[${this.camera.name}] snapshot ffmpeg: ${String(data)}`));
    ffmpeg.on('error', error => callback(error));
    ffmpeg.on('exit', code => {
      if (code === 0) {
        callback(undefined, Buffer.concat(chunks));
      } else {
        callback(new Error(`Snapshot ffmpeg exited with code ${code}`));
      }
    });
  }

  prepareStream(request: PrepareStreamRequest, callback: PrepareStreamCallback): void {
    const video = request.video;
    const videoSSRC = Math.floor(Math.random() * 0xffffffff);
    const localVideoPort = getPort();

    this.pendingSessions[request.sessionID] = {
      address: request.targetAddress,
      videoPort: video.port,
      localVideoPort,
      videoCryptoSuite: video.srtpCryptoSuite,
      videoSRTP: Buffer.concat([video.srtp_key, video.srtp_salt]),
      videoSSRC,
    };

    const response: PrepareStreamResponse = {
      video: {
        port: localVideoPort,
        ssrc: videoSSRC,
        srtp_key: video.srtp_key,
        srtp_salt: video.srtp_salt,
      },
    };

    callback(undefined, response);
  }

  handleStreamRequest(request: StreamingRequest, callback: StreamRequestCallback): void {
    switch (request.type) {
      case StreamRequestTypes.START:
        this.startStream(request, callback);
        break;
      case StreamRequestTypes.RECONFIGURE:
        this.log.debug(`[${this.camera.name}] reconfigure requested: ${JSON.stringify(request.video)}`);
        callback();
        break;
      case StreamRequestTypes.STOP:
        this.stopStream(request.sessionID);
        callback();
        break;
    }
  }

  private startStream(request: StartStreamRequest, callback: StreamRequestCallback): void {
    const session = this.pendingSessions[request.sessionID];
    if (!session) {
      callback(new Error(`No prepared session for ${request.sessionID}`));
      return;
    }

    const profile = FFMPEG_H264_PROFILE_NAMES[request.video.profile as H264Profile] || 'high';
    const level = FFMPEG_H264_LEVEL_NAMES[request.video.level as H264Level] || '4.0';
    const mtu = request.video.mtu || 1316;

    const args = [
      '-rtsp_transport', 'tcp',
      '-re',
      '-i', this.rtspUrl,
      '-map', '0:v:0',
      '-an', '-sn', '-dn',
      '-vcodec', 'copy',
      '-payload_type', String(request.video.pt),
      '-ssrc', String(session.videoSSRC),
      '-f', 'rtp',
    ];

    if (session.videoCryptoSuite !== SRTPCryptoSuites.NONE) {
      args.push(
        '-srtp_out_suite', 'AES_CM_128_HMAC_SHA1_80',
        '-srtp_out_params', session.videoSRTP.toString('base64'),
        `srtp://${session.address}:${session.videoPort}?rtcpport=${session.videoPort}&localrtcpport=${session.localVideoPort}&pkt_size=${mtu}`,
      );
    } else {
      args.push(`rtp://${session.address}:${session.videoPort}?rtcpport=${session.videoPort}&localrtcpport=${session.localVideoPort}&pkt_size=${mtu}`);
    }

    this.log.info(`[${this.camera.name}] Starting stream ${request.video.width}x${request.video.height} ${request.video.fps}fps (${profile}/${level})`);
    this.log.debug(`[${this.camera.name}] ${this.ffmpegPath} ${args.join(' ')}`);

    const ffmpeg = spawn(this.ffmpegPath, args, { env: process.env });
    let started = false;

    ffmpeg.stderr.on('data', data => {
      const line = String(data);
      this.log.debug(`[${this.camera.name}] ffmpeg: ${line}`);
      if (!started && /frame=|Output #0|Press \[q\]/.test(line)) {
        started = true;
        callback();
      }
    });

    ffmpeg.on('error', error => {
      this.log.error(`[${this.camera.name}] FFmpeg failed: ${error.message}`);
      if (!started) {
        callback(error);
      }
    });

    ffmpeg.on('exit', (code, signal) => {
      this.log.debug(`[${this.camera.name}] FFmpeg exited code=${code} signal=${signal}`);
      usedPorts.delete(session.localVideoPort);
      delete this.ongoingSessions[request.sessionID];
      if (!started && code !== 0) {
        callback(new Error(`FFmpeg exited before stream started: ${code}`));
      }
    });

    this.ongoingSessions[request.sessionID] = {
      localVideoPort: session.localVideoPort,
      process: ffmpeg,
    };
    delete this.pendingSessions[request.sessionID];
  }

  private stopStream(sessionId: string): void {
    const session = this.ongoingSessions[sessionId];
    if (!session) {
      return;
    }

    usedPorts.delete(session.localVideoPort);
    session.process.kill('SIGKILL');
    delete this.ongoingSessions[sessionId];
    this.log.info(`[${this.camera.name}] Stopped stream`);
  }
}
