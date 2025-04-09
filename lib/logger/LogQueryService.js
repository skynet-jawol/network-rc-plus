/**
 * 日志查询服务
 * 提供高级日志查询和分析功能
 */

const config = require('./config');

class LogQueryService {
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * 按时间范围查询日志
   * @param {Object} options 查询选项
   * @param {Date} options.startTime 开始时间
   * @param {Date} options.endTime 结束时间
   * @param {number} options.limit 每页记录数
   * @param {number} options.offset 偏移量
   * @returns {Promise<Object>} 查询结果
   */
  async queryByTimeRange(options) {
    const query = {
      timestamp: {
        $gte: options.startTime.getTime(),
        $lte: options.endTime.getTime()
      },
      limit: options.limit || 20,
      offset: options.offset || 0
    };
    return await this.storage.queryLogs(query);
  }

  /**
   * 按模块筛选日志
   * @param {Object} options 查询选项
   * @param {string|string[]} options.modules 模块名称或数组
   * @param {number} options.limit 每页记录数
   * @param {number} options.offset 偏移量
   * @returns {Promise<Object>} 查询结果
   */
  async queryByModules(options) {
    const modules = Array.isArray(options.modules) ? options.modules : [options.modules];
    const query = {
      module: { $in: modules },
      limit: options.limit || 20,
      offset: options.offset || 0
    };
    return await this.storage.queryLogs(query);
  }

  /**
   * 按日志等级过滤
   * @param {Object} options 查询选项
   * @param {string|string[]} options.levels 日志等级或数组
   * @param {number} options.limit 每页记录数
   * @param {number} options.offset 偏移量
   * @returns {Promise<Object>} 查询结果
   */
  async queryByLevels(options) {
    const levels = Array.isArray(options.levels) ? options.levels : [options.levels];
    const query = {
      level: { $in: levels },
      limit: options.limit || 20,
      offset: options.offset || 0
    };
    return await this.storage.queryLogs(query);
  }

  /**
   * 关键字搜索
   * @param {Object} options 查询选项
   * @param {string} options.keyword 搜索关键字
   * @param {string[]} options.fields 搜索字段
   * @param {number} options.limit 每页记录数
   * @param {number} options.offset 偏移量
   * @returns {Promise<Object>} 查询结果
   */
  async searchByKeyword(options) {
    const query = {
      $or: options.fields.map(field => ({
        [field]: { $regex: options.keyword, $options: 'i' }
      })),
      limit: options.limit || 20,
      offset: options.offset || 0
    };
    return await this.storage.queryLogs(query);
  }

  /**
   * 组合查询
   * @param {Object} options 查询选项
   * @returns {Promise<Object>} 查询结果
   */
  async advancedQuery(options) {
    const query = {};

    // 时间范围
    if (options.startTime && options.endTime) {
      query.timestamp = {
        $gte: options.startTime.getTime(),
        $lte: options.endTime.getTime()
      };
    }

    // 模块筛选
    if (options.modules) {
      const modules = Array.isArray(options.modules) ? options.modules : [options.modules];
      query.module = { $in: modules };
    }

    // 日志等级
    if (options.levels) {
      const levels = Array.isArray(options.levels) ? options.levels : [options.levels];
      query.level = { $in: levels };
    }

    // 关键字搜索
    if (options.keyword && options.fields) {
      query.$or = options.fields.map(field => ({
        [field]: { $regex: options.keyword, $options: 'i' }
      }));
    }

    // 分页
    query.limit = options.limit || 20;
    query.offset = options.offset || 0;

    return await this.storage.queryLogs(query);
  }
}

module.exports = LogQueryService;