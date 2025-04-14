/**
 * Network RC 错误处理中间件
 */

const { NetworkRCError, ErrorCodes } = require('./index');
const logger = require('../logger');

// 开发环境错误处理中间件
const developmentErrorHandler = (err, req, res, next) => {
  // 记录错误日志
  logger.error('错误详情:', {
    code: err.code,
    message: err.message,
    details: err.details,
    severity: err.severity,
    timestamp: err.timestamp,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const error = {
    code: err.code || ErrorCodes.SYSTEM_ERROR,
    message: err.message,
    details: err.details,
    severity: err.severity,
    timestamp: err.timestamp,
    stack: err.stack
  };

  res.status(err instanceof NetworkRCError ? 400 : 500).json(error);
};

// 生产环境错误处理中间件
const productionErrorHandler = (err, req, res, next) => {
  // 记录错误日志
  logger.error('错误详情:', {
    code: err.code,
    message: err.message,
    details: err.details,
    severity: err.severity,
    timestamp: err.timestamp,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const error = {
    code: err.code || ErrorCodes.SYSTEM_ERROR,
    message: err.message,
    details: err.details,
    severity: err.severity,
    timestamp: err.timestamp
  };

  // 生产环境不返回堆栈信息
  res.status(err instanceof NetworkRCError ? 400 : 500).json(error);
};

// 未捕获的Promise rejection处理
const handleUncaughtRejection = (reason, promise) => {
  logger.error('未捕获的Promise rejection:', {
    reason,
    promise
  });
};

// 未捕获的异常处理
const handleUncaughtException = (error) => {
  logger.error('未捕获的异常:', error);
  // 对于未捕获的异常，建议进行进程退出
  process.exit(1);
};

// 初始化错误处理
const initializeErrorHandling = (app) => {
  // 注册全局错误处理中间件
  if (process.env.NODE_ENV === 'development') {
    app.use(developmentErrorHandler);
  } else {
    app.use(productionErrorHandler);
  }

  // 注册未捕获的Promise rejection处理器
  process.on('unhandledRejection', handleUncaughtRejection);

  // 注册未捕获的异常处理器
  process.on('uncaughtException', handleUncaughtException);
};

module.exports = {
  developmentErrorHandler,
  productionErrorHandler,
  initializeErrorHandling
};