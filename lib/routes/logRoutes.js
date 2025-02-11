/**
 * 日志查询路由
 * 提供日志查询的RESTful API接口
 */

const express = require('express');
const router = express.Router();
const LogQueryService = require('../logger/LogQueryService');
const LogManager = require('../logger/LogManager');

class LogRoutes {
  constructor() {
    this.logManager = new LogManager();
    this.queryService = new LogQueryService(this.logManager.storage);
    this.initRoutes();
  }

  initRoutes() {
    // 基础查询接口
    router.get('/query', async (req, res) => {
      try {
        const { startTime, endTime, modules, levels, keyword, fields, limit, offset } = req.query;
        const options = {
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: endTime ? new Date(endTime) : undefined,
          modules: modules ? modules.split(',') : undefined,
          levels: levels ? levels.split(',') : undefined,
          keyword,
          fields: fields ? fields.split(',') : undefined,
          limit: parseInt(limit) || 20,
          offset: parseInt(offset) || 0
        };

        const result = await this.queryService.advancedQuery(options);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // 按时间范围查询
    router.get('/query/time-range', async (req, res) => {
      try {
        const { startTime, endTime, limit, offset } = req.query;
        if (!startTime || !endTime) {
          throw new Error('开始时间和结束时间是必需的');
        }

        const result = await this.queryService.queryByTimeRange({
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          limit: parseInt(limit) || 20,
          offset: parseInt(offset) || 0
        });

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // 按模块查询
    router.get('/query/modules', async (req, res) => {
      try {
        const { modules, limit, offset } = req.query;
        if (!modules) {
          throw new Error('模块参数是必需的');
        }

        const result = await this.queryService.queryByModules({
          modules: modules.split(','),
          limit: parseInt(limit) || 20,
          offset: parseInt(offset) || 0
        });

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // 按日志等级查询
    router.get('/query/levels', async (req, res) => {
      try {
        const { levels, limit, offset } = req.query;
        if (!levels) {
          throw new Error('日志等级参数是必需的');
        }

        const result = await this.queryService.queryByLevels({
          levels: levels.split(','),
          limit: parseInt(limit) || 20,
          offset: parseInt(offset) || 0
        });

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    // 关键字搜索
    router.get('/query/search', async (req, res) => {
      try {
        const { keyword, fields, limit, offset } = req.query;
        if (!keyword || !fields) {
          throw new Error('关键字和搜索字段是必需的');
        }

        const result = await this.queryService.searchByKeyword({
          keyword,
          fields: fields.split(','),
          limit: parseInt(limit) || 20,
          offset: parseInt(offset) || 0
        });

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    });

    return router;
  }
}

module.exports = LogRoutes;