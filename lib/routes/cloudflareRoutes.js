const express = require('express');
const router = express.Router();
const TunnelManager = require('../cloudflare/TunnelManager');
const TrafficStats = require('../cloudflare/TrafficStats');
const logger = require('../logger');

let tunnelManager = null;
let trafficStats = null;

// 初始化Tunnel管理器
router.post('/init', async (req, res) => {
  try {
    const { token, localPort } = req.body;
    tunnelManager = new TunnelManager({ token, localPort });
    res.json({ success: true });
  } catch (error) {
    logger.error('初始化Tunnel管理器失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 创建新的隧道
router.post('/tunnel', async (req, res) => {
  try {
    const { name } = req.body;
    const tunnel = await tunnelManager.createTunnel(name);
    trafficStats = new TrafficStats(tunnel.id, tunnelManager.api);
    trafficStats.startAutoUpdate();
    res.json(tunnel);
  } catch (error) {
    logger.error('创建隧道失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除隧道
router.delete('/tunnel', async (req, res) => {
  try {
    await tunnelManager.deleteTunnel();
    if (trafficStats) {
      trafficStats.stopAutoUpdate();
      trafficStats = null;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('删除隧道失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取隧道状态
router.get('/tunnel/status', async (req, res) => {
  try {
    const status = await tunnelManager.getTunnelStatus();
    res.json(status);
  } catch (error) {
    logger.error('获取隧道状态失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新DNS记录
router.post('/dns', async (req, res) => {
  try {
    const { hostname } = req.body;
    await tunnelManager.updateDNS(hostname);
    res.json({ success: true });
  } catch (error) {
    logger.error('更新DNS记录失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 配置访问策略
router.post('/access-policy', async (req, res) => {
  try {
    const { policy } = req.body;
    await tunnelManager.configureTunnelAccess(policy);
    res.json({ success: true });
  } catch (error) {
    logger.error('配置访问策略失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取流量统计
router.get('/stats', (req, res) => {
  try {
    if (!trafficStats) {
      throw new Error('流量统计服务未初始化');
    }
    const stats = trafficStats.formatStats();
    res.json(stats);
  } catch (error) {
    logger.error('获取流量统计失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;