const Logger = require('./logger');

class LoggerUtil {
  constructor(module) {
    this.module = module;
  }

  _log(level, message, event = '', deviceId = '', data = null) {
    Logger.log({
      level,
      module: this.module,
      event,
      deviceId,
      message,
      data
    });
  }

  fatal(message, event = '', deviceId = '', data = null) {
    this._log('fatal', message, event, deviceId, data);
  }

  error(message, event = '', deviceId = '', data = null) {
    this._log('error', message, event, deviceId, data);
  }

  warn(message, event = '', deviceId = '', data = null) {
    this._log('warn', message, event, deviceId, data);
  }

  info(message, event = '', deviceId = '', data = null) {
    this._log('info', message, event, deviceId, data);
  }

  debug(message, event = '', deviceId = '', data = null) {
    this._log('debug', message, event, deviceId, data);
  }

  trace(message, event = '', deviceId = '', data = null) {
    this._log('trace', message, event, deviceId, data);
  }
}

module.exports = LoggerUtil;