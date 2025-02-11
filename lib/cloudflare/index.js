const { spawn } = require('child_process');
const path = require('path');
const TTS = require('../tts');
const status = require('../status');
const { changeLedStatus } = require('../led');
const logger = require('../logger');
const TrafficStats = require('./TrafficStats');

class CloudflareTunnel {
  constructor() {
    this.tunnelProcess = null;
    this.config = {
      token: '',
      hostname: '',
      tunnel_id: ''
    };
    this.trafficStats = new TrafficStats();
    this._initTrafficMonitoring();
  }

  _initTrafficMonitoring() {
    this.trafficStats.on('traffic-warning', ({ totalBytes }) => {
      TTS(`警告：流量使用已达到${Math.floor(totalBytes / (1024 * 1024 * 1024))}GB`);
    });

    this.trafficStats.on('traffic-critical', ({ totalBytes }) => {
      TTS(`警告：流量使用已达到临界值${Math.floor(totalBytes / (1024 * 1024 * 1024))}GB，请注意控制使用`);
    });

    setInterval(() => {
      status.updateStatus('cloudflare_traffic', this.trafficStats.getStats());
    }, 60000); // 每分钟更新一次状态
  }

  async start() {
    if (!this.config.token) {
      throw new Error('Cloudflare token is required');
    }

    try {
      await TTS('正在启动 Cloudflare 隧道').end;
      this.tunnelProcess = spawn('cloudflared', [
        'tunnel',
        '--token',
        this.config.token,
        'run'
      ]);

      this.tunnelProcess.stdout.on('data', (data) => {
        logger.info(`Cloudflare tunnel stdout: ${data}`);
        if (data.toString().includes('Connection established')) {
          changeLedStatus('penetrated');
          TTS('Cloudflare 隧道连接成功');
        }
      });

      this.tunnelProcess.stderr.on('data', (data) => {
        logger.error(`Cloudflare tunnel stderr: ${data}`);
      });

      this.tunnelProcess.on('exit', (code, signal) => {
        logger.error(`Cloudflare tunnel exited with code: ${code}, signal: ${signal}`);
        changeLedStatus('error');
        if (code !== 0) {
          logger.info('10秒后尝试重新连接隧道');
          TTS('隧道连接失败！10秒后重试');
          setTimeout(() => this.start(), 10000);
        }
      });
    } catch (error) {
      logger.error('Failed to start Cloudflare tunnel:', error);
      throw error;
    }
  }

  async stop() {
    if (this.tunnelProcess) {
      this.tunnelProcess.kill();
      this.tunnelProcess = null;
      await TTS('Cloudflare 隧道已停止').end;
      changeLedStatus('ready');
    }
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  getStatus() {
    return {
      running: !!this.tunnelProcess,
      config: this.config
    };
  }
}

module.exports = new CloudflareTunnel();