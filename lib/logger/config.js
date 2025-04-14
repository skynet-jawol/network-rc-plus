/**
 * 日志系统配置文件
 */

module.exports = {
  // 日志等级定义
  levels: {
    fatal: 0,  // 系统崩溃或无法恢复的错误
    error: 1,  // 功能模块异常但系统可运行
    warn: 2,   // 性能下降或配置异常
    info: 3,   // 正常操作记录
    debug: 4,  // 详细操作流程
    trace: 5   // 最详细的调试信息
  },

  // 功能模块分类
  modules: {
    controller: {
      name: '控制器',
      events: {
        command: '控制指令',
        status: '设备状态',
        operation: '操作事件',
        warning: '异常警告'
      }
    },
    video: {
      name: '视频模块',
      events: {
        stream: '视频流状态',
        encoding: '编码参数',
        quality: '画面质量',
        connection: 'WebRTC连接'
      }
    },
    audio: {
      name: '音频模块',
      events: {
        stream: '音频流状态',
        volume: '音量控制',
        quality: '通话质量',
        device: '设备状态'
      }
    },
    gps: {
      name: 'GPS模块',
      events: {
        position: '位置数据',
        signal: '信号质量',
        warning: '异常警告',
        track: '轨迹记录'
      }
    },
    network: {
      name: '网络连接',
      events: {
        tunnel: 'Cloudflare状态',
        webrtc: 'WebRTC质量',
        performance: '性能指标',
        error: '连接异常'
      }
    },
    system: {
      name: '系统运行',
      events: {
        lifecycle: '系统事件',
        resource: '资源使用',
        error: '系统异常',
        config: '配置变更'
      }
    }
  },

  // 存储配置
  storage: {
    // 日志文件配置
    files: {
      maxSize: 104857600, // 单文件最大100MB
      maxFiles: 30,       // 保留30天
      compress: true,     // 启用压缩
      dirname: process.env.NODE_ENV === 'development' ? './logs' : '/home/pi/.network-rc/logs'
    },
    
    // 数据库配置
    database: {
      filename: process.env.NODE_ENV === 'development' ? './logs/logs.db' : '/home/pi/.network-rc/logs/logs.db',
      maxSize: 1073741824, // 数据库最大1GB
      vacuum: true,        // 启用自动清理
      retention: 2592000   // 保留30天数据(秒)
    }
  }
};