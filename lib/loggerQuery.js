const LoggerStorage = require('./loggerStorage');

class LoggerQuery {
  constructor() {
    this.storage = new LoggerStorage();
  }

  /**
   * 查询日志
   * @param {Object} options 查询选项
   * @param {Date} options.startTime 开始时间
   * @param {Date} options.endTime 结束时间
   * @param {string} options.level 日志等级
   * @param {string} options.module 模块名称
   * @param {string} options.event 事件类型
   * @param {string} options.deviceId 设备ID
   * @param {string} options.keyword 关键字搜索
   * @param {number} options.limit 每页条数
   * @param {number} options.offset 偏移量
   * @returns {Promise<Object>} 查询结果
   */
  async queryLogs(options = {}) {
    try {
      const logs = await this.storage.queryLogs(options);
      const total = await this.storage.getLogsCount(options);
      return {
        success: true,
        data: {
          logs,
          total,
          limit: options.limit || 100,
          offset: options.offset || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取日志统计信息
   * @param {Object} options 统计选项
   * @param {Date} options.startTime 开始时间
   * @param {Date} options.endTime 结束时间
   * @param {string} options.module 模块名称
   * @returns {Promise<Object>} 统计结果
   */
  async getLogStats(options = {}) {
    try {
      const stats = await this.storage.getLogStats(options);
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 导出日志
   * @param {Object} options 导出选项
   * @param {Date} options.startTime 开始时间
   * @param {Date} options.endTime 结束时间
   * @param {string} options.level 日志等级
   * @param {string} options.module 模块名称
   * @param {string} options.format 导出格式 (json/csv)
   * @returns {Promise<Object>} 导出结果
   */
  async exportLogs(options = {}) {
    try {
      const logs = await this.storage.queryLogs({
        ...options,
        limit: null // 导出时不限制数量
      });

      const format = options.format || 'json';
      let result;

      if (format === 'csv') {
        result = this._convertToCSV(logs);
      } else {
        result = JSON.stringify(logs, null, 2);
      }

      return {
        success: true,
        data: result,
        format
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 将日志数据转换为CSV格式
   * @private
   * @param {Array} logs 日志数据
   * @returns {string} CSV格式的数据
   */
  _convertToCSV(logs) {
    const headers = ['时间', '等级', '模块', '事件', '设备ID', '消息', '数据'];
    const rows = logs.map(log => [
      log.timestamp,
      log.level,
      log.module || '',
      log.event || '',
      log.device_id || '',
      log.message,
      log.data ? JSON.stringify(log.data) : ''
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }
}

module.exports = LoggerQuery;