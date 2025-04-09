const express = require('express');
const router = express.Router();
const LoggerQuery = require('../loggerQuery');
const loggerQuery = new LoggerQuery();

// 查询日志列表
router.get('/logs', async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      level,
      module,
      event,
      deviceId,
      keyword,
      limit = 100,
      offset = 0
    } = req.query;

    const result = await loggerQuery.queryLogs({
      startTime,
      endTime,
      level,
      module,
      event,
      deviceId,
      keyword,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取日志统计信息
router.get('/logs/stats', async (req, res) => {
  try {
    const { startTime, endTime, module } = req.query;
    const result = await loggerQuery.getLogStats({
      startTime,
      endTime,
      module
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 导出日志
router.get('/logs/export', async (req, res) => {
  try {
    const {
      startTime,
      endTime,
      level,
      module,
      format = 'json'
    } = req.query;

    const result = await loggerQuery.exportLogs({
      startTime,
      endTime,
      level,
      module,
      format
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    const filename = `logs_${new Date().toISOString()}.${result.format}`;
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(result.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;