const express = require('express');
const router = express.Router();
const TrackService = require('../gps/TrackService');
const TrackPlayer = require('../gps/TrackPlayer');

class TrackRoutes {
  constructor(app) {
    this.trackService = app.trackService;
    this.trackPlayer = new TrackPlayer(this.trackService);
    this.setupRoutes();
  }

  setupRoutes() {
    // 获取轨迹列表
    router.get('/tracks', async (req, res) => {
      try {
        const tracks = await this.trackService.getTracks();
        res.json({
          success: true,
          data: tracks
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 获取轨迹详情
    router.get('/tracks/:id', async (req, res) => {
      try {
        const track = await this.trackService.getTrackById(req.params.id);
        if (!track) {
          return res.status(404).json({
            success: false,
            error: '轨迹不存在'
          });
        }
        res.json({
          success: true,
          data: track
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 开始记录轨迹
    router.post('/tracks/record/start', (req, res) => {
      try {
        this.trackService.startRecording();
        res.json({
          success: true,
          message: '开始记录轨迹'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 停止记录轨迹
    router.post('/tracks/record/stop', async (req, res) => {
      try {
        await this.trackService.stopRecording();
        res.json({
          success: true,
          message: '停止记录轨迹'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 添加轨迹标记
    router.post('/tracks/marker', (req, res) => {
      try {
        const { title, description, latitude, longitude } = req.body;
        this.trackService.addMarker({
          title,
          description,
          latitude,
          longitude
        });
        res.json({
          success: true,
          message: '添加标记成功'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 开始轨迹回放
    router.post('/tracks/:id/playback/start', async (req, res) => {
      try {
        await this.trackPlayer.loadTrack(req.params.id);
        this.trackPlayer.play();
        res.json({
          success: true,
          message: '开始轨迹回放'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 暂停轨迹回放
    router.post('/tracks/:id/playback/pause', (req, res) => {
      try {
        this.trackPlayer.pause();
        res.json({
          success: true,
          message: '暂停轨迹回放'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 停止轨迹回放
    router.post('/tracks/:id/playback/stop', (req, res) => {
      try {
        this.trackPlayer.stop();
        res.json({
          success: true,
          message: '停止轨迹回放'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 设置回放速度
    router.post('/tracks/:id/playback/speed', (req, res) => {
      try {
        const { speed } = req.body;
        this.trackPlayer.setSpeed(speed);
        res.json({
          success: true,
          message: '设置回放速度成功'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // 跳转到指定进度
    router.post('/tracks/:id/playback/seek', (req, res) => {
      try {
        const { progress } = req.body;
        this.trackPlayer.seekTo(progress);
        res.json({
          success: true,
          message: '跳转成功'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    return router;
  }
}

module.exports = TrackRoutes;