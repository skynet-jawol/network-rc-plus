/**
 * 权限控制模块
 */

const { NetworkRCError } = require('../errors');

class AccessControlError extends NetworkRCError {
  static ERROR_CODES = {
    PERMISSION_DENIED: 4101,
    ROLE_NOT_FOUND: 4102,
    INVALID_PERMISSION: 4103
  };

  constructor(code, details = null) {
    const message = AccessControlError.getErrorMessage(code);
    super(code, message, details);
  }

  static getErrorMessage(code) {
    switch (code) {
      case this.ERROR_CODES.PERMISSION_DENIED:
        return '权限不足';
      case this.ERROR_CODES.ROLE_NOT_FOUND:
        return '角色不存在';
      case this.ERROR_CODES.INVALID_PERMISSION:
        return '无效的权限设置';
      default:
        return '权限控制错误';
    }
  }
}

class AccessControl {
  constructor(config) {
    this.roles = new Map();
    this.permissions = new Map();
    this.config = config;
    this.setupRoles();
  }

  setupRoles() {
    // 从配置文件加载角色和权限
    const { roles } = this.config.accessControl;
    Object.entries(roles).forEach(([role, permissions]) => {
      this.addRole(role, permissions);
    });
  }

  addRole(role, permissions) {
    if (!Array.isArray(permissions)) {
      throw new AccessControlError(
        AccessControlError.ERROR_CODES.INVALID_PERMISSION,
        '权限必须是数组格式'
      );
    }
    this.roles.set(role, new Set(permissions));
  }

  removeRole(role) {
    if (!this.roles.has(role)) {
      throw new AccessControlError(
        AccessControlError.ERROR_CODES.ROLE_NOT_FOUND
      );
    }
    this.roles.delete(role);
  }

  hasPermission(role, permission) {
    const rolePermissions = this.roles.get(role);
    if (!rolePermissions) {
      throw new AccessControlError(
        AccessControlError.ERROR_CODES.ROLE_NOT_FOUND
      );
    }

    return rolePermissions.has('*') || rolePermissions.has(permission);
  }

  middleware(permission) {
    return (req, res, next) => {
      const { role } = req.user || {};

      if (!role || !this.hasPermission(role, permission)) {
        throw new AccessControlError(
          AccessControlError.ERROR_CODES.PERMISSION_DENIED
        );
      }

      next();
    };
  }
}

module.exports = {
  AccessControl,
  AccessControlError
};