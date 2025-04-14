const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./logger/config');

class LoggerStorage {
  constructor() {
    const dbPath = config.storage.database.filename;
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('无法连接到日志数据库:', err);
      } else {
        this.initDatabase();
      }
    });
  }

  initDatabase() {
    const logTableSQL = `
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        level TEXT NOT NULL,
        module TEXT NOT NULL,
        event TEXT NOT NULL,
        device_id TEXT,
        message TEXT NOT NULL,
        data TEXT,
        FOREIGN KEY(module) REFERENCES modules(name)
      )`;

    const metricsTableSQL = `
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        module TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT,
        threshold REAL,
        FOREIGN KEY(module) REFERENCES modules(name)
      )`;

    const modulesTableSQL = `
      CREATE TABLE IF NOT EXISTS modules (
        name TEXT PRIMARY KEY,
        display_name TEXT NOT NULL
      )`;

    this.db.serialize(() => {
      this.db.run(logTableSQL);
      this.db.run(metricsTableSQL);
      this.db.run(modulesTableSQL);
      
      // 创建索引
      this.db.run('CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_logs_module ON logs(module)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_logs_event ON logs(event)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_metrics_module ON metrics(module)');
      
      // 初始化模块数据
      this.initModules();
      
      // 设置自动清理任务
      this.setupCleanupTask();
    });
  }

  initModules() {
    const modules = config.modules;
    const stmt = this.db.prepare('INSERT OR REPLACE INTO modules (name, display_name) VALUES (?, ?)');
    
    for (const [name, module] of Object.entries(modules)) {
      stmt.run(name, module.name);
    }
    
    stmt.finalize();
  }

  setupCleanupTask() {
    // 每天执行一次清理
    setInterval(() => {
      this.cleanupOldData();
      if (config.storage.database.vacuum) {
        this.vacuumDatabase();
      }
    }, 24 * 60 * 60 * 1000);
  }

  cleanupOldData() {
    const retention = config.storage.database.retention;
    const cutoffDate = new Date(Date.now() - retention * 1000).toISOString();

    this.db.run('DELETE FROM logs WHERE timestamp < ?', cutoffDate);
    this.db.run('DELETE FROM metrics WHERE timestamp < ?', cutoffDate);
  }

  vacuumDatabase() {
    this.db.run('VACUUM');
  }

  savelog(level, module, event, deviceId, message, data) {
    const sql = `INSERT INTO logs (level, module, event, device_id, message, data)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    this.db.run(sql, [
      level,
      module,
      event,
      deviceId,
      message,
      data ? JSON.stringify(data) : null
    ]);
  }

  saveMetric(module, metricType, value, unit = null, threshold = null) {
    const sql = `INSERT INTO metrics (module, metric_type, value, unit, threshold)
                 VALUES (?, ?, ?, ?, ?)`;
    
    this.db.run(sql, [module, metricType, value, unit, threshold]);
  }

  async queryLogs(options = {}) {
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
    } = options;

    let conditions = [];
    let params = [];

    if (startTime) {
      conditions.push('timestamp >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('timestamp <= ?');
      params.push(endTime);
    }
    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }
    if (module) {
      conditions.push('module = ?');
      params.push(module);
    }
    if (event) {
      conditions.push('event = ?');
      params.push(event);
    }
    if (deviceId) {
      conditions.push('device_id = ?');
      params.push(deviceId);
    }
    if (keyword) {
      conditions.push('(message LIKE ? OR data LIKE ?)');
      params.push(`%${keyword}%`);
      params.push(`%${keyword}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async queryMetrics(options = {}) {
    const {
      startTime,
      endTime,
      module,
      metricType,
      limit = 100,
      offset = 0
    } = options;

    let conditions = [];
    let params = [];

    if (startTime) {
      conditions.push('timestamp >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('timestamp <= ?');
      params.push(endTime);
    }
    if (module) {
      conditions.push('module = ?');
      params.push(module);
    }
    if (metricType) {
      conditions.push('metric_type = ?');
      params.push(metricType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM metrics ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getLogsCount(options = {}) {
    const {
      startTime,
      endTime,
      level,
      module,
      event,
      deviceId,
      keyword
    } = options;

    let conditions = [];
    let params = [];

    if (startTime) {
      conditions.push('timestamp >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('timestamp <= ?');
      params.push(endTime);
    }
    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }
    if (module) {
      conditions.push('module = ?');
      params.push(module);
    }
    if (event) {
      conditions.push('event = ?');
      params.push(event);
    }
    if (deviceId) {
      conditions.push('device_id = ?');
      params.push(deviceId);
    }
    if (keyword) {
      conditions.push('(message LIKE ? OR data LIKE ?)');
      params.push(`%${keyword}%`);
      params.push(`%${keyword}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*) as count FROM logs ${whereClause}`;

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  async getLogStats(options = {}) {
    const { startTime, endTime, module } = options;
    let conditions = [];
    let params = [];

    if (startTime) {
      conditions.push('timestamp >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('timestamp <= ?');
      params.push(endTime);
    }
    if (module) {
      conditions.push('module = ?');
      params.push(module);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queries = [
      {
        name: 'levelStats',
        sql: `SELECT level, COUNT(*) as count FROM logs ${whereClause} GROUP BY level`
      },
      {
        name: 'moduleStats',
        sql: `SELECT module, COUNT(*) as count FROM logs ${whereClause} GROUP BY module`
      },
      {
        name: 'hourlyStats',
        sql: `SELECT strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
              COUNT(*) as count FROM logs ${whereClause}
              GROUP BY hour ORDER BY hour DESC LIMIT 24`
      }
    ];

    const stats = {};

    for (const query of queries) {
      stats[query.name] = await new Promise((resolve, reject) => {
        this.db.all(query.sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }

    return stats;
  }

  async getLogsCount(options = {}) {
    const {
      startTime,
      endTime,
      level,
      module,
      event,
      deviceId,
      keyword
    } = options;

    let conditions = [];
    let params = [];

    if (startTime) {
      conditions.push('timestamp >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('timestamp <= ?');
      params.push(endTime);
    }
    if (level) {
      conditions.push('level = ?');
      params.push(level);
    }
    if (module) {
      conditions.push('module = ?');
      params.push(module);
    }
    if (event) {
      conditions.push('event = ?');
      params.push(event);
    }
    if (deviceId) {
      conditions.push('device_id = ?');
      params.push(deviceId);
    }
    if (keyword) {
      conditions.push('(message LIKE ? OR data LIKE ?)');
      params.push(`%${keyword}%`);
      params.push(`%${keyword}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*) as count FROM logs ${whereClause}`;

    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  async getLogStats(options = {}) {
    const { startTime, endTime, module } = options;
    let conditions = [];
    let params = [];

    if (startTime) {
      conditions.push('timestamp >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('timestamp <= ?');
      params.push(endTime);
    }
    if (module) {
      conditions.push('module = ?');
      params.push(module);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queries = [
      {
        name: 'levelStats',
        sql: `SELECT level, COUNT(*) as count FROM logs ${whereClause} GROUP BY level`
      },
      {
        name: 'moduleStats',
        sql: `SELECT module, COUNT(*) as count FROM logs ${whereClause} GROUP BY module`
      },
      {
        name: 'hourlyStats',
        sql: `SELECT strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
              COUNT(*) as count FROM logs ${whereClause}
              GROUP BY hour ORDER BY hour DESC LIMIT 24`
      }
    ];

    const stats = {};

    for (const query of queries) {
      stats[query.name] = await new Promise((resolve, reject) => {
        this.db.all(query.sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }

    return stats;
  }

  close() {
    this.db.close();
  }
}

module.exports = LoggerStorage;