const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class TrackDatabase {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(process.cwd(), 'data', 'tracks.db');
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          await this.createTables();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        start_time DATETIME,
        end_time DATETIME,
        distance REAL,
        duration INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS track_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track_id TEXT,
        latitude REAL,
        longitude REAL,
        altitude REAL,
        speed REAL,
        timestamp DATETIME,
        FOREIGN KEY (track_id) REFERENCES tracks(id)
      )`,
      `CREATE TABLE IF NOT EXISTS markers (
        id TEXT PRIMARY KEY,
        track_id TEXT,
        latitude REAL,
        longitude REAL,
        title TEXT,
        description TEXT,
        timestamp DATETIME,
        FOREIGN KEY (track_id) REFERENCES tracks(id)
      )`
    ];

    for (const query of queries) {
      await this.run(query);
    }
  }

  async saveTrack(track) {
    const { id, metadata, startTime, endTime, points, markers } = track;
    
    await this.run(
      'INSERT INTO tracks (id, name, description, start_time, end_time, distance, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, metadata.name, metadata.description, startTime, endTime, metadata.distance, metadata.duration]
    );

    for (const point of points) {
      await this.run(
        'INSERT INTO track_points (track_id, latitude, longitude, altitude, speed, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [id, point.latitude, point.longitude, point.altitude, point.speed, point.timestamp]
      );
    }

    for (const marker of markers) {
      await this.run(
        'INSERT INTO markers (id, track_id, latitude, longitude, title, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [marker.id, id, marker.latitude, marker.longitude, marker.title, marker.description, marker.timestamp]
      );
    }
  }

  async getTrackById(trackId) {
    const track = await this.get('SELECT * FROM tracks WHERE id = ?', [trackId]);
    if (!track) return null;

    const points = await this.all('SELECT * FROM track_points WHERE track_id = ? ORDER BY timestamp', [trackId]);
    const markers = await this.all('SELECT * FROM markers WHERE track_id = ? ORDER BY timestamp', [trackId]);

    return {
      id: track.id,
      startTime: new Date(track.start_time),
      endTime: new Date(track.end_time),
      points,
      markers,
      metadata: {
        name: track.name,
        description: track.description,
        distance: track.distance,
        duration: track.duration
      }
    };
  }

  async getAllTracks() {
    return this.all('SELECT * FROM tracks ORDER BY start_time DESC');
  }

  async deleteTrack(trackId) {
    await this.run('DELETE FROM track_points WHERE track_id = ?', [trackId]);
    await this.run('DELETE FROM markers WHERE track_id = ?', [trackId]);
    await this.run('DELETE FROM tracks WHERE id = ?', [trackId]);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = TrackDatabase;