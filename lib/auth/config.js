/**
 * 认证和访问控制配置文件
 */

module.exports = {
  jwt: {
    // JWT密钥，建议在生产环境中使用环境变量设置
    secret: process.env.JWT_SECRET || 'network-rc-secret-key',
    // 令牌过期时间
    expiresIn: '24h',
    // 刷新令牌过期时间
    refreshExpiresIn: '7d'
  },

  // 访问控制配置
  accessControl: {
    // 默认角色
    defaultRole: 'guest',
    
    // 角色权限配置
    roles: {
      admin: ['*'],
      user: [
        'control:basic',
        'control:advanced',
        'video:view',
        'video:config',
        'audio:listen',
        'audio:speak',
        'audio:config',
        'gps:view',
        'gps:config'
      ],
      guest: [
        'video:view',
        'audio:listen'
      ]
    },

    // API访问限制配置
    rateLimit: {
      // 时间窗口（毫秒）
      windowMs: 15 * 60 * 1000,
      // 在时间窗口内的最大请求数
      max: 100
    }
  },

  // 敏感数据加密配置
  encryption: {
    // 加密算法
    algorithm: 'aes-256-gcm',
    // 密钥（建议使用环境变量）
    key: process.env.ENCRYPTION_KEY || 'network-rc-encryption-key',
    // IV长度
    ivLength: 16
  }
};