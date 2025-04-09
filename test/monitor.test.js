const { WebRTCPerformanceService } = require('../lib/monitor');

describe('WebRTC性能监控服务测试', () => {
  let performanceService;

  beforeEach(() => {
    performanceService = new WebRTCPerformanceService();
  });

  afterEach(() => {
    performanceService.stopMonitoring();
  });

  test('性能监控服务初始化', () => {
    expect(performanceService).toBeDefined();
    expect(performanceService.networkMonitor).toBeDefined();
    expect(performanceService.optimizer).toBeDefined();
    expect(performanceService.controlPriority).toBeDefined();
  });

  test('控制指令优先级处理', () => {
    const command = {
      type: 'emergency_stop',
      data: { value: true }
    };

    const results = performanceService.handleCommand(command);
    expect(Array.isArray(results)).toBe(true);

    const queueStatus = performanceService.controlPriority.getQueueStatus();
    expect(queueStatus).toHaveProperty('queueLength');
    expect(queueStatus).toHaveProperty('processingCount');
    expect(queueStatus).toHaveProperty('highPriorityCount');
  });

  test('性能报告生成', () => {
    const report = performanceService.getPerformanceReport();
    
    expect(report).toHaveProperty('networkStats');
    expect(report).toHaveProperty('queueStatus');
    expect(report).toHaveProperty('encodingParams');
    expect(report).toHaveProperty('isMonitoring');

    expect(report.networkStats).toHaveProperty('rtt');
    expect(report.networkStats).toHaveProperty('packetsLost');
    expect(report.networkStats).toHaveProperty('jitter');
  });

  test('性能历史数据查询', () => {
    const history = performanceService.getPerformanceHistory(30);
    
    expect(history).toHaveProperty('networkQuality');
    expect(Array.isArray(history.networkQuality)).toBe(true);
  });

  test('网络质量评估', () => {
    const stats = performanceService.networkMonitor.getCurrentStats();
    
    expect(stats).toHaveProperty('quality');
    expect(['excellent', 'good', 'fair', 'poor']).toContain(stats.quality);
  });

  test('指令批处理机制', () => {
    const commands = [
      { type: 'direction', data: { value: 'forward' } },
      { type: 'speed', data: { value: 50 } },
      { type: 'brake', data: { value: true } }
    ];

    commands.forEach(cmd => {
      performanceService.handleCommand(cmd);
    });

    const batch = performanceService.controlPriority.getNextBatch();
    expect(Array.isArray(batch)).toBe(true);
    expect(batch.length).toBeLessThanOrEqual(5); // 默认批处理大小
  });

  test('性能监控开启和停止', () => {
    performanceService.startMonitoring();
    expect(performanceService.isMonitoring).toBe(true);

    performanceService.stopMonitoring();
    expect(performanceService.isMonitoring).toBe(false);
  });
});