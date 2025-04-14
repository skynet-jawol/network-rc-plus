const { exec } = require('child_process');
const path = require('path');
const TTS = require('./tts');
const status = require('./status');
const { changeLedStatus } = require('./led');

class CloudflareZeroTrust {
  constructor() {
    this.tunnelProcess = null;
  }

  async startTunnel(config) {
    try {
      await TTS("开始Cloudflare Zero Trust隧道连接").end;
      
      // 启动隧道
      this.tunnelProcess = exec(`cloudflared tunnel --config ${path.resolve(__dirname, config)}`);
      
      this.tunnelProcess.stdout.on('data', (data) => {
        console.log(`Cloudflare Tunnel: ${data}`);
        if (data.includes('Connected')) {
          changeLedStatus('penetrated');
        }
      });
      
      this.tunnelProcess.stderr.on('data', (data) => {
        console.error(`Cloudflare Tunnel Error: ${data}`);
        changeLedStatus('error');
        
        // 分类处理常见错误
        if (data.includes('credentials')) {
          status.update('cloudflare', 'auth_error');
        } else if (data.includes('connection')) {
          status.update('cloudflare', 'conn_error');
        } else {
          status.update('cloudflare', 'error');
        }
      });
      
      this.tunnelProcess.on('close', (code) => {
        console.log(`Cloudflare Tunnel process exited with code ${code}`);
        if (code !== 0) {
          status.update('cloudflare', 'reconnecting');
          setTimeout(() => this.startTunnel(config), 10000);
        } else {
          status.update('cloudflare', 'disconnected');
        }
      });
      
      return { status: 'success', message: 'Cloudflare Tunnel started' };
    } catch (err) {
      console.error(`Cloudflare Tunnel启动失败: ${err.message}`);
      throw new Error('Cloudflare Tunnel启动失败');
    }
  }

  stopTunnel() {
    if (this.tunnelProcess) {
      this.tunnelProcess.kill();
      this.tunnelProcess = null;
    }
  }
}

module.exports = new CloudflareZeroTrust();