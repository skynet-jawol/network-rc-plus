const EventEmitter = require('events');

class TrackPlayer extends EventEmitter {
  constructor(trackService) {
    super();
    this.trackService = trackService;
    this.currentTrack = null;
    this.currentPointIndex = 0;
    this.isPlaying = false;
    this.playbackSpeed = 1;
    this.playInterval = null;
  }

  async loadTrack(trackId) {
    try {
      const track = await this.trackService.getTrackById(trackId);
      this.currentTrack = track;
      this.currentPointIndex = 0;
      this.emit('track-loaded', track);
    } catch (error) {
      console.error('加载轨迹失败:', error);
      throw error;
    }
  }

  play() {
    if (!this.currentTrack || this.isPlaying) return;

    this.isPlaying = true;
    this.playInterval = setInterval(() => {
      if (this.currentPointIndex >= this.currentTrack.points.length) {
        this.stop();
        return;
      }

      const point = this.currentTrack.points[this.currentPointIndex];
      const currentMarkers = this.getCurrentMarkers();
      
      this.emit('point-played', {
        point,
        progress: this.getProgress(),
        markers: currentMarkers
      });

      this.currentPointIndex++;
    }, this.calculateInterval());

    this.emit('playback-started', {
      track: this.currentTrack,
      speed: this.playbackSpeed
    });
  }

  pause() {
    if (!this.isPlaying) return;

    clearInterval(this.playInterval);
    this.isPlaying = false;
    this.emit('playback-paused', {
      currentPoint: this.currentTrack.points[this.currentPointIndex],
      progress: this.getProgress()
    });
  }

  stop() {
    if (!this.currentTrack) return;

    clearInterval(this.playInterval);
    this.isPlaying = false;
    this.currentPointIndex = 0;
    this.emit('playback-stopped');
  }

  setSpeed(speed) {
    if (speed <= 0) throw new Error('播放速度必须大于0');
    
    this.playbackSpeed = speed;
    if (this.isPlaying) {
      clearInterval(this.playInterval);
      this.play();
    }
    this.emit('speed-changed', speed);
  }

  seekTo(progress) {
    if (!this.currentTrack) return;
    if (progress < 0 || progress > 1) throw new Error('进度值必须在0-1之间');

    const targetIndex = Math.floor(progress * (this.currentTrack.points.length - 1));
    this.currentPointIndex = targetIndex;

    const point = this.currentTrack.points[targetIndex];
    const currentMarkers = this.getCurrentMarkers();

    this.emit('seeked', {
      point,
      progress: this.getProgress(),
      markers: currentMarkers
    });
  }

  getProgress() {
    if (!this.currentTrack || this.currentTrack.points.length === 0) return 0;
    return this.currentPointIndex / (this.currentTrack.points.length - 1);
  }

  getCurrentMarkers() {
    if (!this.currentTrack) return [];

    const currentTime = this.currentTrack.points[this.currentPointIndex].timestamp;
    return this.currentTrack.markers.filter(marker => 
      marker.timestamp <= currentTime
    );
  }

  calculateInterval() {
    // 根据轨迹点的时间戳计算实际的播放间隔
    if (!this.currentTrack || this.currentTrack.points.length < 2) {
      return 1000; // 默认1秒
    }

    const point1 = this.currentTrack.points[this.currentPointIndex];
    const point2 = this.currentTrack.points[this.currentPointIndex + 1];
    if (!point1 || !point2) return 1000;

    const timeDiff = new Date(point2.timestamp) - new Date(point1.timestamp);
    return Math.max(50, timeDiff / this.playbackSpeed); // 最小间隔50ms
  }
}

module.exports = TrackPlayer;