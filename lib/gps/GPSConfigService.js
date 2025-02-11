const EventEmitter = require('events');
const SerialPort = require('serialport');

class GPSConfigService extends EventEmitter {
  constructor() {
    super();
    this.config = {
      port: '/dev/ttyUSB0',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      updateInterval: 1000, // 更新频率（毫秒）
      format: 'NMEA',      // GPS数据格式
      sentences: ['GGA', 'RMC', 'GSA', 'GSV'] // 需要解析的NMEA语句类型
    };
    
    this.serialPort = null;
    this.parser = null;
    this.updateTimer = null;
  }

  async initialize(config = {}) {
    try {
      // 合并配置
      this.config = { ...this.config, ...config };
      
      // 创建串口实例
      this.serialPort = new SerialPort({
        path: this.config.port,
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        stopBits: this.config.stopBits,
        parity: this.config.parity
      });

      // 创建NMEA解析器
      const { DelimiterParser } = require('@serialport/parser-delimiter');
      this.parser = this.serialPort.pipe(new DelimiterParser({ delimiter: '\r\n' }));

      // 设置事件监听
      this.setupEventListeners();

      // 启动更新定时器
      this.startUpdateTimer();

      this.emit('initialized', this.config);
      return true;
    } catch (error) {
      this.emit('error', { type: 'initialization', message: error.message });
      throw error;
    }
  }

  setupEventListeners() {
    this.serialPort.on('error', (error) => {
      this.emit('error', { type: 'serial', message: error.message });
    });

    this.parser.on('data', (data) => {
      this.emit('raw-data', data.toString());
    });
  }

  startUpdateTimer() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.emit('update-tick');
    }, this.config.updateInterval);
  }

  async updateConfig(newConfig) {
    const needsRestart = [
      'port',
      'baudRate',
      'dataBits',
      'stopBits',
      'parity'
    ].some(key => newConfig[key] !== undefined && newConfig[key] !== this.config[key]);

    if (needsRestart) {
      await this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (newConfig.updateInterval !== undefined) {
      this.startUpdateTimer();
    }

    if (needsRestart) {
      await this.initialize();
    }

    this.emit('config-updated', this.config);
  }

  async stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.serialPort && this.serialPort.isOpen) {
      return new Promise((resolve, reject) => {
        this.serialPort.close((error) => {
          if (error) {
            reject(error);
          } else {
            this.emit('stopped');
            resolve();
          }
        });
      });
    }
  }

  async listPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        vendorId: port.vendorId,
        productId: port.productId
      }));
    } catch (error) {
      this.emit('error', { type: 'port-list', message: error.message });
      throw error;
    }
  }

  getConfig() {
    return { ...this.config };
  }

  isConnected() {
    return this.serialPort && this.serialPort.isOpen;
  }
}

module.exports = GPSConfigService;