const EventEmitter = require('events');
const GPSConfigService = require('./GPSConfigService');
const GPSParser = require('./GPSParser');

class GPSManager extends EventEmitter {
  constructor() {
    super();
    this.configService = new GPSConfigService();
    this.parser = new GPSParser();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 配置服务事件监听
    this.configService.on('raw-data', (data) => {
      const parsedData = this.parser.parseNMEA(data);
      if (parsedData) {
        this.emit('gps-data', parsedData);
      }
    });

    this.configService.on('error', (error) => {
      this.emit('error', error);
    });

    // 解析器事件监听
    this.parser.on('error', (error) => {
      this.emit('error', { type: 'parser', ...error });
    });

    ['gga', 'rmc', 'gsa', 'gsv'].forEach(type => {
      this.parser.on(type, (data) => {
        this.emit(`gps-${type}`, data);
      });
    });
  }

  async initialize(config) {
    try {
      await this.configService.initialize(config);
      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', { type: 'initialization', message: error.message });
      throw error;
    }
  }

  async updateConfig(config) {
    try {
      await this.configService.updateConfig(config);
      return true;
    } catch (error) {
      this.emit('error', { type: 'config-update', message: error.message });
      throw error;
    }
  }

  async listPorts() {
    return await this.configService.listPorts();
  }

  getConfig() {
    return this.configService.getConfig();
  }

  isConnected() {
    return this.configService.isConnected();
  }

  async stop() {
    try {
      await this.configService.stop();
      this.emit('stopped');
      return true;
    } catch (error) {
      this.emit('error', { type: 'stop', message: error.message });
      throw error;
    }
  }

  // 更新解析器验证规则
  updateValidationRules(rules) {
    Object.assign(this.parser.validationRules, rules);
    this.emit('validation-rules-updated', this.parser.validationRules);
  }

  // 获取当前验证规则
  getValidationRules() {
    return { ...this.parser.validationRules };
  }
}

module.exports = GPSManager;