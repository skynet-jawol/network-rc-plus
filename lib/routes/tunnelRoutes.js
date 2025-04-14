const express = require('express');
const router = express.Router();
const TunnelManager = require('../cloudflare/TunnelManager');
const { NetworkRCError } = require('../errors');
const logger = require('../logger');

let tunnelManager = null;

// 初始化Tunnel Manager
router.post('/init', async (req, res) => {
  try {
    const { token, localPort } = req.body;
    if (!token) {
      throw new NetworkRCError('INVALID_TOKEN', 'Cloudflare Token不能为空');
    }
    tunnelManager = new TunnelManager({ token, localPort });
    res.json({ success: true });
  } catch (error) {
    logger.error('初始化Tunnel失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 创建新的隧道
router.post('/create', async (req, res) => {
  try {
    if (!tunnelManager) {
      throw new NetworkRCError('NOT_INITIALIZED', '请先初始化Tunnel Manager');
    }
    const { name } = req.body;
    const tunnel = await tunnelManager.createTunnel(name);
    res.json(tunnel);
  } catch (error) {
    logger.error('创建隧道失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取隧道状态
router.get('/status', async (req, res) => {
  try {
    if (!tunnelManager) {
      throw new NetworkRCError('NOT_INITIALIZED', '请先初始化Tunnel Manager');
    }
    const status = await tunnelManager.getTunnelStatus();
    res.json(status);
  } catch (error) {
    logger.error('获取隧道状态失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除隧道
router.delete('/', async (req, res) => {
  try {
    if (!tunnelManager) {
      throw new NetworkRCError('NOT_INITIALIZED', '请先初始化Tunnel Manager');
    }
    await tunnelManager.deleteTunnel();
    res.json({ success: true });
  } catch (error) {
    logger.error('删除隧道失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新DNS配置
router.post('/dns', async (req, res) => {
  try {
    if (!tunnelManager) {
      throw new NetworkRCError('NOT_INITIALIZED', '请先初始化Tunnel Manager');
    }
    const { hostname } = req.body;
    await tunnelManager.updateDNS(hostname);
    res.json({ success: true });
  } catch (error) {
    logger.error('更新DNS配置失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 配置访问策略
router.post('/access-policy', async (req, res) => {
  try {
    if (!tunnelManager) {
      throw new NetworkRCError('NOT_INITIALIZED', '请先初始化Tunnel Manager');
    }
    const { policy } = req.body;
    await tunnelManager.configureTunnelAccess(policy);
    res.json({ success: true });
  } catch (error) {
    logger.error('配置访问策略失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;