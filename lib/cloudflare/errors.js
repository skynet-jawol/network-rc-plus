const { NetworkRCError } = require('../errors');

class CloudflareError extends NetworkRCError {
  constructor(code, message, details = null) {
    super(code, message, details);
  }
}

class CloudflareConfigError extends CloudflareError {
  constructor(message, details = null) {
    super('CLOUDFLARE_CONFIG_ERROR', message, details);
  }
}

class CloudflareConnectionError extends CloudflareError {
  constructor(message, details = null) {
    super('CLOUDFLARE_CONNECTION_ERROR', message, details);
  }
}

class CloudflareAuthenticationError extends CloudflareError {
  constructor(message, details = null) {
    super('CLOUDFLARE_AUTH_ERROR', message, details);
  }
}

module.exports = {
  CloudflareError,
  CloudflareConfigError,
  CloudflareConnectionError,
  CloudflareAuthenticationError
};