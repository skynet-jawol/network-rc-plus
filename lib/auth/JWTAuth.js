/**
 * JWT认证模块
 */

const jwt = require('jsonwebtoken');
const { NetworkRCError } = require('../errors');

class JWTAuthError extends NetworkRCError {
  static ERROR_CODES = {
    TOKEN_INVALID: 4001,
    TOKEN_EXPIRED: 4002,
    TOKEN_MISSING: 4003,
    UNAUTHORIZED: 4004
  };

  constructor(code, details = null) {
    const message = JWTAuthError.getErrorMessage(code);
    super(code, message, details);
  }

  static getErrorMessage(code) {
    switch (code) {
      case this.ERROR_CODES.TOKEN_INVALID:
        return 'Token无效';
      case this.ERROR_CODES.TOKEN_EXPIRED:
        return 'Token已过期';
      case this.ERROR_CODES.TOKEN_MISSING:
        return 'Token缺失';
      case this.ERROR_CODES.UNAUTHORIZED:
        return '未授权访问';
      default:
        return '认证错误';
    }
  }
}

class JWTAuth {
  constructor(secret, options = {}) {
    this.secret = secret;
    this.options = {
      expiresIn: '24h',
      ...options
    };
  }

  generateToken(payload) {
    return jwt.sign(payload, this.secret, this.options);
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new JWTAuthError(JWTAuthError.ERROR_CODES.TOKEN_EXPIRED);
      }
      throw new JWTAuthError(JWTAuthError.ERROR_CODES.TOKEN_INVALID);
    }
  }

  middleware() {
    return (req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw new JWTAuthError(JWTAuthError.ERROR_CODES.TOKEN_MISSING);
      }

      try {
        const decoded = this.verifyToken(token);
        req.user = decoded;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = {
  JWTAuth,
  JWTAuthError
};