const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');
const logger = require('../logger');
const status = require('../status');

// GPS模块单例
let instance = null;

class GPS extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.parser = null;
    this.isConnected = false;
    this.position = {
      lat: null,
      lng: null,
      altitude: null,
      speed: null,
      course: null,
      satellites: 0,
      timestamp: null,
      fix: false
    };
    this.updateInterval = null;
    this.config = {
      devicePath: '/dev/ttyAMA0',  // 默认树莓派GPIO串口
      baudRate: 9600,              // 默认波特率
      updateFrequency: 1000,       // 位置更新频率(毫秒)
      enabled: false               // 是否启用GPS
    };

    // 从配置中加载GPS设置
    if (status.config.gps) {
      this.config = { ...this.config, ...status.config.gps };
    }
  }

  /**
   * 初始化GPS连接
   */
  async init() {
    if (!this.config.enabled) {
      logger.info('GPS功能未启用');
      return;
    }

    try {
      logger.info(`正在连接GPS设备: ${this.config.devicePath}`);
      
      this.port = new SerialPort({
        path: this.config.devicePath,
        baudRate: this.config.baudRate
      });
      
      this.parser = this.port.pipe(new ReadlineParser());
      
      this.port.on('open', () => {
        logger.info('GPS设备连接成功');
        this.isConnected = true;
        this.emit('connected');
      });
      
      this.port.on('error', (err) => {
        logger.error(`GPS设备连接错误: ${err.message}`);
        this.isConnected = false;
        this.emit('error', err);
      });
      
      this.port.on('close', () => {
        logger.info('GPS设备连接关闭');
        this.isConnected = false;
        this.emit('disconnected');
      });
      
      this.parser.on('data', (data) => {
        this.parseNMEA(data);
      });
      
      // 设置定时广播位置信息
      this.startPositionUpdates();
      
    } catch (err) {
      logger.error(`GPS初始化失败: ${err.message}`);
      this.emit('error', err);
    }
  }

  /**
   * 开始定时广播位置更新
   */
  startPositionUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      if (this.isConnected && this.position.fix) {
        // 广播位置信息到前端
        this.broadcastPosition();
      }
    }, this.config.updateFrequency);
  }

  /**
   * 广播位置信息到前端
   */
  broadcastPosition() {
    // 通过status模块广播GPS信息
    status.emit('status-info', {
      label: 'gps',
      value: this.position,
      color: this.position.fix ? 'green' : 'red'
    });
  }

  /**
   * 解析NMEA数据
   * @param {string} data - NMEA数据行
   */
  parseNMEA(data) {
    try {
      // 检查数据是否为有效的NMEA语句
      if (!data.startsWith('$')) return;
      
      const parts = data.split(',');
      const messageType = parts[0];
      
      // 解析不同类型的NMEA消息
      switch (messageType) {
        case '$GPGGA': // GPS固定数据
          this.parseGGA(parts);
          break;
        case '$GPRMC': // 推荐最小定位信息
          this.parseRMC(parts);
          break;
        case '$GPVTG': // 地面速度信息
          this.parseVTG(parts);
          break;
      }
      
      // 发出数据更新事件
      this.emit('data', this.position);
      
    } catch (err) {
      logger.error(`NMEA解析错误: ${err.message}`);
    }
  }

  /**
   * 解析GGA消息 (GPS固定数据)
   * @param {string[]} parts - 分割后的NMEA消息部分
   */
  parseGGA(parts) {
    // $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
    // 时间,纬度,N/S,经度,E/W,定位质量,卫星数,水平精度,海拔高度,单位,大地水准面高度,单位,差分时间,差分站ID
    
    // 检查定位质量 (0=无效, 1=GPS固定, 2=DGPS固定)
    const fixQuality = parseInt(parts[6], 10);
    this.position.fix = fixQuality > 0;
    
    if (this.position.fix) {
      // 解析纬度 (格式: ddmm.mmmm)
      if (parts[2] && parts[3]) {
        const rawLat = parseFloat(parts[2]);
        const latDeg = Math.floor(rawLat / 100);
        const latMin = rawLat - (latDeg * 100);
        let lat = latDeg + (latMin / 60);
        if (parts[3] === 'S') lat = -lat;
        this.position.lat = parseFloat(lat.toFixed(6));
      }
      
      // 解析经度 (格式: dddmm.mmmm)
      if (parts[4] && parts[5]) {
        const rawLng = parseFloat(parts[4]);
        const lngDeg = Math.floor(rawLng / 100);
        const lngMin = rawLng - (lngDeg * 100);
        let lng = lngDeg + (lngMin / 60);
        if (parts[5] === 'W') lng = -lng;
        this.position.lng = parseFloat(lng.toFixed(6));
      }
      
      // 卫星数量
      if (parts[7]) {
        this.position.satellites = parseInt(parts[7], 10);
      }
      
      // 海拔高度
      if (parts[9]) {
        this.position.altitude = parseFloat(parts[9]);
      }
    }
  }

  /**
   * 解析RMC消息 (推荐最小定位信息)
   * @param {string[]} parts - 分割后的NMEA消息部分
   */
  parseRMC(parts) {
    // $GPRMC,123519,A,4807.038,N,01131.000,E,022.4,084.4,230394,003.1,W*6A
    // 时间,状态,纬度,N/S,经度,E/W,速度,航向,日期,磁偏角,磁偏角方向,校验和
    
    // 检查定位状态 (A=有效, V=无效)
    const status = parts[2];
    this.position.fix = status === 'A';
    
    if (this.position.fix) {
      // 解析纬度 (格式: ddmm.mmmm)
      if (parts[3] && parts[4]) {
        const rawLat = parseFloat(parts[3]);
        const latDeg = Math.floor(rawLat / 100);
        const latMin = rawLat - (latDeg * 100);
        let lat = latDeg + (latMin / 60);
        if (parts[4] === 'S') lat = -lat;
        this.position.lat = parseFloat(lat.toFixed(6));
      }
      
      // 解析经度 (格式: dddmm.mmmm)
      if (parts[5] && parts[6]) {
        const rawLng = parseFloat(parts[5]);
        const lngDeg = Math.floor(rawLng / 100);
        const lngMin = rawLng - (lngDeg * 100);
        let lng = lngDeg + (lngMin / 60);
        if (parts[6] === 'W') lng = -lng;
        this.position.lng = parseFloat(lng.toFixed(6));
      }
      
      // 解析速度 (节 转换为 km/h)
      if (parts[7]) {
        const speedKnots = parseFloat(parts[7]);
        this.position.speed = parseFloat((speedKnots * 1.852).toFixed(2)); // 1节 = 1.852 km/h
      }
      
      // 解析航向角度
      if (parts[8]) {
        this.position.course = parseFloat(parts[8]);
      }
      
      // 解析日期和时间
      if (parts[1] && parts[9]) {
        const time = parts[1]; // 格式: hhmmss.sss
        const date = parts[9]; // 格式: ddmmyy
        
        const hours = parseInt(time.substring(0, 2), 10);
        const minutes = parseInt(time.substring(2, 4), 10);
        const seconds = parseInt(time.substring(4, 6), 10);
        
        const day = parseInt(date.substring(0, 2), 10);
        const month = parseInt(date.substring(2, 4), 10) - 1; // 月份从0开始
        const year = 2000 + parseInt(date.substring(4, 6), 10); // 假设是21世纪
        
        this.position.timestamp = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      }
    }
    
    // 检查状态 (A=有效, V=无效)
    const status = parts[2];
    this.position.fix = status === 'A';
    
    if (this.position.fix) {
      // 解析时间和日期
      if (parts[1] && parts[9]) {
        const time = parts[1];
        const date = parts[9];
        // 格式: 时间=hhmmss.sss, 日期=ddmmyy
        const hours = parseInt(time.substring(0, 2), 10);
        const minutes = parseInt(time.substring(2, 4), 10);
        const seconds = parseInt(time.substring(4, 6), 10);
        const day = parseInt(date.substring(0, 2), 10);
        const month = parseInt(date.substring(2, 4), 10) - 1; // 月份从0开始
        const year = 2000 + parseInt(date.substring(4, 6), 10); // 假设是21世纪
        
        this.position.timestamp = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      }
      
      // 解析速度 (节)
      if (parts[7]) {
        // 转换节到千米/小时 (1节 = 1.852 km/h)
        this.position.speed = parseFloat(parts[7]) * 1.852;
      }
      
      // 解析航向 (真北度数)
      if (parts[8]) {
        this.position.course = parseFloat(parts[8]);
      }
    }
  }

  /**
   * 解析VTG消息 (地面速度信息)
   * @param {string[]} parts - 分割后的NMEA消息部分
   */
  /**
   * 解析VTG消息 (地面速度信息)
   * @param {string[]} parts - 分割后的NMEA消息部分
   */
  parseVTG(parts) {
    // $GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48
    // 真北航向,T,磁北航向,M,地面速度(节),N,地面速度(公里/小时),K,校验和
    
    // 解析真北航向
    if (parts[1]) {
      this.position.course = parseFloat(parts[1]);
    }
    
    // 解析地面速度(公里/小时)
    if (parts[7]) {
      this.position.speed = parseFloat(parts[7]);
    }
    // $GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48
    // 真航向,T,磁航向,M,地速(节),N,地速(公里/小时),K,校验和
    
    // 解析地速 (公里/小时)
    if (parts[7]) {
      this.position.speed = parseFloat(parts[7]);
    }
  }

  /**
   * 更新GPS配置
   * @param {Object} config - 新的GPS配置
   */
  updateConfig(config) {
    // 更新配置
    this.config = { ...this.config, ...config };
    
    // 保存到全局配置
    status.saveConfig({ gps: this.config });
    
    // 如果设备已连接且配置发生变化，需要重新连接
    if (this.isConnected) {
      this.disconnect();
      if (this.config.enabled) {
        setTimeout(() => this.init(), 1000);
      }
    } else if (this.config.enabled) {
      // 如果之前未连接但现在启用了GPS，则初始化连接
      this.init();
    }
    
    // 更新位置广播频率
    this.startPositionUpdates();
  }

  /**
   * 断开GPS连接
   */
  disconnect() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.port && this.isConnected) {
      this.port.close((err) => {
        if (err) {
          logger.error(`关闭GPS设备错误: ${err.message}`);
        } else {
          logger.info('GPS设备已断开连接');
        }
      });
    }
    
    this.isConnected = false;
  }
}

// 创建GPS实例
const gps = new GPS();

/**
 * 获取GPS模块实例
 * @returns {GPS} GPS模块实例
 */
module.exports = (() => {
  if (!instance) {
    instance = new GPS();
  }
  return instance;
})();