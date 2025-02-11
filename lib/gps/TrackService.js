const EventEmitter = require('events');
const path = require('path');
const TrackDatabase = require('./TrackDatabase');

class TrackService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.tracks = [];
    this.currentTrack = null;
    this.isRecording = false;
    this.db = new TrackDatabase(options);
    this.initialize();
  }

  async initialize() {
    try {
      await this.db.initialize();
      await this.loadTracks();
    } catch (error) {
      console.error('初始化轨迹服务失败:', error);
    }
  }

  startRecording() {
    if (this.isRecording) return;
    
    this.currentTrack = {
      id: Date.now().toString(),
      startTime: new Date(),
      points: [],
      markers: [],
      metadata: {
        name: `轨迹 ${new Date().toLocaleString()}`,
        description: '',
        distance: 0,
        duration: 0
      }
    };
    
    this.isRecording = true;
    this.emit('recording-started', this.currentTrack);
  }

  addTrackPoint(point) {
    if (!this.isRecording || !this.currentTrack) return;

    const lastPoint = this.currentTrack.points[this.currentTrack.points.length - 1];
    if (lastPoint) {
      const distance = this.calculateDistance(lastPoint, point);
      this.currentTrack.metadata.distance += distance;
    }

    this.currentTrack.points.push({
      ...point,
      timestamp: new Date(),
    });

    this.emit('track-point-added', point);
  }

  addMarker(marker) {
    if (!this.isRecording || !this.currentTrack) return;

    const newMarker = {
      ...marker,
      id: Date.now().toString(),
      timestamp: new Date()
    };

    this.currentTrack.markers.push(newMarker);
    this.emit('marker-added', newMarker);
  }

  async stopRecording() {
    if (!this.isRecording || !this.currentTrack) return;

    this.currentTrack.endTime = new Date();
    this.currentTrack.metadata.duration = 
      (this.currentTrack.endTime - this.currentTrack.startTime) / 1000;

    await this.saveTrack(this.currentTrack);
    
    this.isRecording = false;
    this.emit('recording-stopped', this.currentTrack);
    this.currentTrack = null;
  }

  async saveTrack(track) {
    try {
      await this.db.saveTrack(track);
      this.tracks.push(track);
      this.emit('track-saved', track);
    } catch (error) {
      console.error('保存轨迹失败:', error);
      throw error;
    }
  }

  async loadTracks() {
    try {
      this.tracks = await this.db.getAllTracks();
      this.emit('tracks-loaded', this.tracks);
    } catch (error) {
      console.error('加载轨迹失败:', error);
      throw error;
    }
  }

  async getTrackById(trackId) {
    try {
      const track = await this.db.getTrackById(trackId);
      if (!track) throw new Error('轨迹不存在');
      return track;
    } catch (error) {
      console.error('获取轨迹失败:', error);
      throw error;
    }
  }

  async deleteTrack(trackId) {
    try {
      await this.db.deleteTrack(trackId);
      this.tracks = this.tracks.filter(track => track.id !== trackId);
      this.emit('track-deleted', trackId);
    } catch (error) {
      console.error('删除轨迹失败:', error);
      throw error;
    }
  }

  calculateDistance(point1, point2) {
    const R = 6371e3; // 地球半径（米）
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}

module.exports = TrackService;