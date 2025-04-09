/**
 * 日志管理器
 * 负责统一管理日志系统的各个功能
 */

const winston = require('winston');
const path = require('path');
const config = require('./config');
const LoggerStorage = require('../loggerStorage');

class LogManager {
  constructor() {
    this.storage = new LoggerStorage();
    this.initLogger();
  }

  initLogger() {
    const format = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => {
          const moduleInfo = info.module ? `[${info.module}] ` : '';
          const eventInfo = info.event ? `(${info.event}) ` : '';
          const deviceInfo = info.deviceId ? `<${info.deviceId}> ` : '';
          const extraInfo = info.data ? `\n${JSON.stringify(info.data, null, 2)}` : '';
          return `${info.timestamp} ${info.level}: ${moduleInfo}${eventInfo}${deviceInfo}${info.message}${extraInfo}`;
        }
      )
    );

    const transports = [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: path.join(config.storage.files.dirname, 'fatal.log'),
        level: 'fatal',
        maxsize: config.storage.files.maxSize,
        maxFiles: config.storage.files.maxFiles,
        tailable: true,
        zippedArchive: config.storage.files.compress
      }),
      new winston.transports.File({
        filename: path.join(config.storage.files.dirname, 'error.log'),
        level: 'error',
        maxsize: config.storage.files.maxSize,
        maxFiles: config.storage.files.maxFiles,
        tailable: true,
        zippedArchive: config.storage.files.compress
      }),
      new winston.transports.File({
        filename: path.join(config.storage.files.dirname, 'all.log'),
        maxsize: config.storage.files.maxSize,
        maxFiles: config.storage.files.maxFiles,
        tailable: true,
        zippedArchive: config.storage.files.compress
      })
    ];

    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      levels: config.levels,
      format,
      transports
    });

    winston.addColors({
      fatal: 'red',
      error: 'red',
      warn: 'yellow',
      info: 'green',
      debug: 'white',
      trace: 'gray'
    });
  }

  log(level, module, event, message, deviceId = '', data = null) {
    // 验证日志级别和模块是否有效
    if (!config.levels.hasOwnProperty(level)) {
      throw new Error(`无效的日志级别: ${level}`);
    }
    if (!config.modules.hasOwnProperty(module)) {
      throw new Error(`无效的模块名称: ${module}`);
    }

    // 记录到 Winston 日志
    this.logger.log({
      level,
      module: config.modules[module].name,
      event,
      deviceId,
      message,
      data
    });

    // 保存到数据库
    this.storage.savelog(level, module, event, deviceId, message, data);
  }

  async query(options) {
    return await this.storage.queryLogs(options);
  }

  async getMetrics(options) {
    return await this.storage.queryMetrics(options);
  }

  saveMetric(module, metricType, value, unit = null, threshold = null) {
    this.storage.saveMetric(module, metricType, value, unit, threshold);
  }
}

module.exports = new LogManager();