const { exec } = require('child_process');
const path = require('path');
const status = require('./status');

class CameraServer {
  constructor() {
    this.cameraProcess = null;
    this.streamParams = {
      resolution: '1280x720',
      framerate: 30,
      bitrate: '2500k',
      keyframeInterval: 30,
      bufferSize: 4096,
      latency: 300,
      codec: 'h264',
      profile: 'high',
      level: '4.1',
      intraRefresh: 'adaptive'
    };
  }

  startStream(options = {}) {
    try {
      // 合并默认参数和自定义参数
      const streamParams = { ...this.streamParams, ...options };
      
      const command = `libcamera-vid -t 0 --width ${streamParams.resolution.split('x')[0]} --height ${streamParams.resolution.split('x')[1]} ` +
        `--framerate ${streamParams.framerate} --bitrate ${streamParams.bitrate} --keyframe ${streamParams.keyframeInterval} ` +
        `--flush --info-text "%Y-%m-%d %X" -o -`;
      
      this.cameraProcess = exec(command);
      
      this.cameraProcess.stdout.on('data', (data) => {
        console.log(`Camera Stream: ${data.length} bytes`);
      });
      
      this.cameraProcess.stderr.on('data', (data) => {
        console.error(`Camera Error: ${data}`);
        status.update('camera', 'error');
      if(data.includes('Failed to start camera')) {
        console.error('libcamera硬件初始化失败，请检查摄像头连接');
      }
      });
      
      this.cameraProcess.on('close', (code) => {
        console.log(`Camera process exited with code ${code}`);
        if (code !== 0) {
          setTimeout(() => this.startStream(options), 5000);
        }
      });
      
      return { status: 'success', message: 'Camera stream started' };
    } catch (err) {
      console.error(`Camera启动失败: ${err.message}`);
      throw new Error('Camera启动失败');
    }
  }

  stopStream() {
    if (this.cameraProcess) {
      this.cameraProcess.kill();
      this.cameraProcess = null;
    }
  }

  updateStreamParams(params) {
    this.streamParams = { ...this.streamParams, ...params };
    return this.streamParams;
  }
}

module.exports = new CameraServer();
