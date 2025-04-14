/**
 * WebRTC性能监控配置文件
 */

module.exports = {
  // 网络质量阈值配置
  networkQualityThresholds: {
    excellent: {
      rtt: 150,      // 4G网络环境下的往返时延阈值（毫秒）
      packetsLost: 2, // 丢包率阈值（百分比）
      jitter: 40     // 抖动阈值（毫秒）
    },
    good: {
      rtt: 300,
      packetsLost: 5,
      jitter: 70
    },
    fair: {
      rtt: 500,
      packetsLost: 10,
      jitter: 120
    }
  },

  // 视频编码参数配置
  videoEncodingParams: {
    bitrate: {
      min: 100000,    // 最小码率（bps）
      max: 4000000,   // 最大码率（bps）
      default: 800000  // 默认码率（bps），降低默认值以适应4G网络
    },
    frameRate: {
      min: 10,        // 降低最小帧率以应对弱网环境
      max: 60,        // 最大帧率
      default: 24     // 默认帧率，降低以节省带宽
    },
    resolution: {
      scales: [0.5, 0.75, 1.0, 1.5, 2.0], // 增加更细粒度的分辨率缩放选项
      defaultScale: 0.75  // 默认使用较低分辨率
    }
  },

  // 性能监控配置
  monitoringConfig: {
    statsInterval: 500,      // 缩短统计数据采集间隔以提高响应速度
    optimizationInterval: 1000, // 缩短优化参数调整间隔
    minSamplesRequired: 3     // 降低最小样本数量要求以加快响应
  },

  // 自适应调整策略配置
  adaptiveStrategy: {
    bitrateAdjustment: {
      decrease: -0.4,  // 更激进的码率降低比例
      increase: 0.1    // 更保守的码率提升比例
    },
    frameRateAdjustment: {
      decrease: -6,    // 更平滑的帧率降低步长
      increase: 4      // 更保守的帧率提升步长
    },
    // 拥塞控制策略
    congestionControl: {
      rttThreshold: 600,     // 降低RTT阈值以更早触发拥塞控制
      recoveryTimeout: 3000,  // 缩短恢复超时时间
      maxRetries: 5,         // 增加最大重试次数
      // 新增：快速恢复策略
      fastRecovery: {
        enabled: true,
        threshold: 400,      // 快速恢复触发阈值
        stepSize: 0.2       // 恢复步长
      },
      // 新增：带宽预估策略
      bandwidthEstimation: {
        windowSize: 5,       // 采样窗口大小
        weightRecent: 0.7    // 最近样本权重
      }
    },
    // 新增：抖动缓冲策略
    jitterBuffer: {
      initial: 200,         // 初始缓冲时间（毫秒）
      min: 100,            // 最小缓冲时间
      max: 400,            // 最大缓冲时间
      adjustmentStep: 50   // 调整步长
    }
  }
};