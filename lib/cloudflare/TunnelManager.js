const { NetworkRCError } = require('../errors');
const { CloudflareAPI } = require('./index');
const logger = require('../logger');

class TunnelManager {
  constructor(config) {
    this.config = config;
    this.api = new CloudflareAPI(config.token);
    this.tunnelId = null;
    this.tunnelConfig = null;
  }

  async createTunnel(name) {
    try {
      const tunnel = await this.api.createTunnel({
        name,
        config: {
          ingress: [
            {
              hostname: `${name}.network-rc.com`,
              service: `http://localhost:${this.config.localPort}`
            }
          ]
        }
      });
      this.tunnelId = tunnel.id;
      this.tunnelConfig = tunnel.config;
      return tunnel;
    } catch (error) {
      logger.error('创建Cloudflare Tunnel失败:', error);
      throw new NetworkRCError('TUNNEL_CREATE_ERROR', '创建隧道失败', error);
    }
  }

  async deleteTunnel() {
    if (!this.tunnelId) {
      throw new NetworkRCError('TUNNEL_NOT_FOUND', '隧道未创建');
    }
    try {
      await this.api.deleteTunnel(this.tunnelId);
      this.tunnelId = null;
      this.tunnelConfig = null;
    } catch (error) {
      logger.error('删除Cloudflare Tunnel失败:', error);
      throw new NetworkRCError('TUNNEL_DELETE_ERROR', '删除隧道失败', error);
    }
  }

  async getTunnelStatus() {
    if (!this.tunnelId) {
      return { status: 'not_created' };
    }
    try {
      const status = await this.api.getTunnelStatus(this.tunnelId);
      return status;
    } catch (error) {
      logger.error('获取隧道状态失败:', error);
      throw new NetworkRCError('TUNNEL_STATUS_ERROR', '获取隧道状态失败', error);
    }
  }

  async updateDNS(hostname) {
    try {
      await this.api.createDNSRecord({
        type: 'CNAME',
        name: hostname,
        content: `${this.tunnelId}.cfargotunnel.com`,
        proxied: true
      });
    } catch (error) {
      logger.error('更新DNS记录失败:', error);
      throw new NetworkRCError('DNS_UPDATE_ERROR', '更新DNS记录失败', error);
    }
  }

  async configureTunnelAccess(policy) {
    try {
      await this.api.updateAccessPolicy(this.tunnelId, policy);
    } catch (error) {
      logger.error('配置访问策略失败:', error);
      throw new NetworkRCError('ACCESS_POLICY_ERROR', '配置访问策略失败', error);
    }
  }
}

module.exports = TunnelManager;