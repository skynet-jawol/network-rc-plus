/**
 * 敏感数据加密模块
 */

const crypto = require('crypto');
const { NetworkRCError } = require('../errors');

class EncryptionError extends NetworkRCError {
  static ERROR_CODES = {
    ENCRYPTION_FAILED: 4201,
    DECRYPTION_FAILED: 4202,
    INVALID_KEY: 4203
  };

  constructor(code, details = null) {
    const message = EncryptionError.getErrorMessage(code);
    super(code, message, details);
  }

  static getErrorMessage(code) {
    switch (code) {
      case this.ERROR_CODES.ENCRYPTION_FAILED:
        return '加密失败';
      case this.ERROR_CODES.DECRYPTION_FAILED:
        return '解密失败';
      case this.ERROR_CODES.INVALID_KEY:
        return '无效的加密密钥';
      default:
        return '加密错误';
    }
  }
}

class Encryption {
  constructor(config) {
    this.config = config;
    this.validateConfig();
  }

  validateConfig() {
    const { key, algorithm, ivLength } = this.config.encryption;
    if (!key || typeof key !== 'string') {
      throw new EncryptionError(
        EncryptionError.ERROR_CODES.INVALID_KEY
      );
    }
    this.key = Buffer.from(key);
    this.algorithm = algorithm;
    this.ivLength = ivLength;
  }

  encrypt(data) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new EncryptionError(
        EncryptionError.ERROR_CODES.ENCRYPTION_FAILED,
        error.message
      );
    }
  }

  decrypt(encryptedData) {
    try {
      const { iv, encrypted, authTag } = encryptedData;
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new EncryptionError(
        EncryptionError.ERROR_CODES.DECRYPTION_FAILED,
        error.message
      );
    }
  }
}

module.exports = {
  Encryption,
  EncryptionError
};