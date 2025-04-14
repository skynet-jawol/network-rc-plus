const express = require('express');
const router = express.Router();
const GPSManager = require('../gps/GPSManager');

const gpsManager = new GPSManager();

// 获取可用串口列表
router.get('/ports', async (req, res) => {
  try {
    const ports = await gpsManager.listPorts();
    res.json(ports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取当前GPS配置
router.get('/config', (req, res) => {
  try {
    const config = gpsManager.getConfig();
    config.connected = gpsManager.isConnected();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新GPS配置
router.post('/config', async (req, res) => {
  try {
    await gpsManager.updateConfig(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动GPS
router.post('/start', async (req, res) => {
  try {
    await gpsManager.initialize();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 停止GPS
router.post('/stop', async (req, res) => {
  try {
    await gpsManager.stop();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取GPS验证规则
router.get('/validation-rules', (req, res) => {
  try {
    const rules = gpsManager.getValidationRules();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新GPS验证规则
router.post('/validation-rules', (req, res) => {
  try {
    gpsManager.updateValidationRules(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;