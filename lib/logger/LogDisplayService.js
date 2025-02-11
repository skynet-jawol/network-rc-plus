/**
 * 日志展示服务
 * 提供日志数据的展示、统计分析和导出功能
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

class LogDisplayService {
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * 获取列表视图数据
   * @param {Object} options 查询选项
   * @param {Object} options.sort 排序选项
   * @param {Object} options.filter 过滤选项
   * @param {Array} options.columns 显示列
   * @returns {Promise<Object>} 列表数据
   */
  async getListView(options) {
    const query = this._buildListQuery(options);
    const data = await this.storage.queryLogs(query);
    return this._formatListData(data, options.columns);
  }

  /**
   * 获取统计分析数据
   * @param {Object} options 统计选项
   * @returns {Promise<Object>} 统计数据
   */
  async getStatistics(options) {
    const stats = {
      errorRate: await this._calculateErrorRate(options),
      moduleHealth: await this._calculateModuleHealth(options),
      performanceTrends: await this._getPerformanceTrends(options)
    };
    return stats;
  }

  /**
   * 导出日志数据
   * @param {Object} options 导出选项
   * @param {string} options.format 导出格式 (json|csv)
   * @param {Array} options.fields 导出字段
   * @returns {Promise<string>} 导出文件路径
   */
  async exportLogs(options) {
    const data = await this.storage.queryLogs(options.query);
    const exportPath = path.join(config.storage.files.dirname, `export_${Date.now()}.${options.format}`);
    
    if (options.format === 'json') {
      await this._exportAsJSON(data, exportPath, options.fields);
    } else if (options.format === 'csv') {
      await this._exportAsCSV(data, exportPath, options.fields);
    }

    return exportPath;
  }

  /**
   * 构建列表查询条件
   * @private
   */
  _buildListQuery(options) {
    const query = {};
    
    if (options.filter) {
      Object.assign(query, options.filter);
    }

    if (options.sort) {
      query.sort = options.sort;
    }

    return query;
  }

  /**
   * 格式化列表数据
   * @private
   */
  _formatListData(data, columns) {
    if (!columns || columns.length === 0) {
      return data;
    }

    return data.map(item => {
      const formattedItem = {};
      columns.forEach(column => {
        formattedItem[column] = item[column];
      });
      return formattedItem;
    });
  }

  /**
   * 计算错误率
   * @private
   */
  async _calculateErrorRate(options) {
    const totalQuery = { timestamp: options.timeRange };
    const errorQuery = { 
      timestamp: options.timeRange,
      level: { $in: ['error', 'fatal'] }
    };

    const [total, errors] = await Promise.all([
      this.storage.countLogs(totalQuery),
      this.storage.countLogs(errorQuery)
    ]);

    return (errors / total) * 100;
  }

  /**
   * 计算模块健康度
   * @private
   */
  async _calculateModuleHealth(options) {
    const modules = Object.keys(config.modules);
    const health = {};

    for (const module of modules) {
      const query = {
        timestamp: options.timeRange,
        module
      };

      const [total, errors] = await Promise.all([
        this.storage.countLogs(query),
        this.storage.countLogs({ ...query, level: { $in: ['error', 'fatal'] } })
      ]);

      health[module] = {
        total,
        errors,
        healthScore: total > 0 ? ((total - errors) / total) * 100 : 100
      };
    }

    return health;
  }

  /**
   * 获取性能趋势数据
   * @private
   */
  async _getPerformanceTrends(options) {
    const query = {
      timestamp: options.timeRange,
      module: 'performance'
    };

    const logs = await this.storage.queryLogs(query);
    return this._aggregatePerformanceData(logs);
  }

  /**
   * 聚合性能数据
   * @private
   */
  _aggregatePerformanceData(logs) {
    return logs.reduce((acc, log) => {
      const timestamp = new Date(log.timestamp).toISOString().split('T')[0];
      if (!acc[timestamp]) {
        acc[timestamp] = {
          cpu: [],
          memory: [],
          network: []
        };
      }

      if (log.data) {
        if (log.data.cpu) acc[timestamp].cpu.push(log.data.cpu);
        if (log.data.memory) acc[timestamp].memory.push(log.data.memory);
        if (log.data.network) acc[timestamp].network.push(log.data.network);
      }

      return acc;
    }, {});
  }

  /**
   * 导出为JSON格式
   * @private
   */
  async _exportAsJSON(data, filePath, fields) {
    const exportData = fields ? this._formatListData(data, fields) : data;
    await fs.promises.writeFile(filePath, JSON.stringify(exportData, null, 2));
  }

  /**
   * 导出为CSV格式
   * @private
   */
  async _exportAsCSV(data, filePath, fields) {
    const exportFields = fields || Object.keys(data[0] || {});
    const header = exportFields.join(',') + '\n';
    
    const rows = data.map(item => {
      return exportFields.map(field => {
        const value = item[field];
        return typeof value === 'object' ? JSON.stringify(value) : value;
      }).join(',');
    }).join('\n');

    await fs.promises.writeFile(filePath, header + rows);
  }
}

module.exports = LogDisplayService;