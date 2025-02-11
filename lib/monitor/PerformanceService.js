/**
 * 性能监控服务
 */

const express = require('express');
const WebSocket = require('ws');
const PerformanceMonitor = require('./PerformanceMonitor');
const { NetworkRCError } = require('../errors');

class PerformanceService {
  constructor(app, options = {}) {
    this.app = app;
    this.monitor = new PerformanceMonitor(options);
    this.clients = new Set();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupEventHandlers();
  }

  start() {
    try {
      this.monitor.start();
    } catch (error) {
      throw new NetworkRCError(5001, '性能监控服务启动失败', error);
    }
  }

  stop() {
    try {
      this.monitor.stop();
    } catch (error) {
      throw new NetworkRCError(5002, '性能监控服务停止失败', error);
    }
  }

  setupRoutes() {
    const router = express.Router();

    // 获取当前性能指标
    router.get('/metrics', (req, res) => {
      try {
        const metrics = this.monitor.getMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({
          error: '获取性能指标失败',
          details: error.message
        });
      }
    });

    // 更新监控配置
    router.post('/config', (req, res) => {
      try {
        const { interval, thresholds } = req.body;
        Object.assign(this.monitor.options, {
          interval: interval || this.monitor.options.interval,
          thresholds: { ...this.monitor.options.thresholds, ...thresholds }
        });

        // 重启监控以应用新配置
        this.monitor.stop();
        this.monitor.start();

        res.json({ message: '监控配置更新成功' });
      } catch (error) {
        res.status(500).json({
          error: '更新监控配置失败',
          details: error.message
        });
      }
    });

    this.app.use('/api/performance', router);
  }

  setupEventHandlers() {
    // 处理性能指标超过阈值的事件
    this.monitor.on('threshold_exceeded', (data) => {
      console.warn(`性能警告: ${data.metric} 超过阈值`, data);
      // 这里可以集成告警系统
    });

    // 处理监控错误
    this.monitor.on('error', (error) => {
      console.error('性能监控错误:', error);
      // 这里可以集成错误报告系统
    });

    // 处理性能指标更新
    this.monitor.on('metrics', (metrics) => {
      this.broadcastMetrics(metrics);
    });
  }

  setupWebSocket() {
    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', (ws) => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      // 发送当前性能指标
      ws.send(JSON.stringify({
        type: 'metrics',
        data: this.monitor.getMetrics()
      }));
    });

    this.app.on('upgrade', (request, socket, head) => {
      if (request.url === '/api/performance/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    });
  }

  broadcastMetrics(metrics) {
    const message = JSON.stringify({
      type: 'metrics',
      data: metrics
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

module.exports = PerformanceService;