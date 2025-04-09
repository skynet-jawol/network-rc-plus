/**
 * 认证模块入口文件
 */

const { JWTAuth, JWTAuthError } = require('./JWTAuth');
const { AccessControl, AccessControlError } = require('./AccessControl');

module.exports = {
  JWTAuth,
  JWTAuthError,
  AccessControl,
  AccessControlError
};