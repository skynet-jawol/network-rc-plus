/**
 * 告警通知服务模块
 */

const nodemailer = require('nodemailer');
const axios = require('axios');
const EventEmitter = require('events');
const AlertError = require('./AlertError');

class NotificationService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      email: {
        enabled: false,
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: ''
        },
        recipients: []
      },
      webhook: {
        enabled: false,
        urls: []
      },
      ui: {
        enabled: true,
        showIcon: true,
        showPopup: true,
        playSound: true,
        colorCoding: true
      },
      customNotifiers: new Map(),
      ...config
    };

    if (this.config.email.enabled) {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.email.host,
        port: this.config.email.port,
        secure: this.config.email.secure,
        auth: this.config.email.auth
      });
    }
  }

  // 发送邮件通知
  async sendEmailNotification(alert) {
    if (!this.config.email.enabled || !this.emailTransporter) {
      return;
    }

    const mailOptions = {
      from: this.config.email.auth.user,
      to: this.config.email.recipients.join(','),
      subject: `Network RC Alert: ${alert.message}`,
      text: this.formatAlertMessage(alert),
      html: this.formatAlertHtml(alert)
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
    } catch (error) {
      throw AlertError.notificationFailed({
        type: 'email',
        error: error.message
      });
    }
  }

  // 发送Webhook通知
  async sendWebhookNotification(alert) {
    if (!this.config.webhook.enabled || !this.config.webhook.urls.length) {
      return;
    }

    const payload = {
      timestamp: Date.now(),
      alert: {
        code: alert.code,
        message: alert.message,
        details: alert.details
      }
    };

    const errors = [];
    for (const url of this.config.webhook.urls) {
      try {
        await axios.post(url, payload);
      } catch (error) {
        errors.push({
          url,
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      throw AlertError.notificationFailed({
        type: 'webhook',
        errors
      });
    }
  }

  // 格式化告警文本消息
  formatAlertMessage(alert) {
    return `
告警类型: ${alert.message}
告警代码: ${alert.code}
告警时间: ${new Date().toLocaleString()}
告警详情: ${JSON.stringify(alert.details, null, 2)}
    `.trim();
  }

  // 格式化告警HTML消息
  formatAlertHtml(alert) {
    return `
      <h2>Network RC 告警通知</h2>
      <p><strong>告警类型:</strong> ${alert.message}</p>
      <p><strong>告警代码:</strong> ${alert.code}</p>
      <p><strong>告警时间:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>告警详情:</strong></p>
      <pre>${JSON.stringify(alert.details, null, 2)}</pre>
    `;
  }

  // 发送UI通知
  async sendUINotification(alert) {
    if (!this.config.ui.enabled) {
      return;
    }

    // 通过WebSocket发送告警到前端
    if (global.wss) {
      global.wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'alert',
            data: {
              type: alert.code,
              message: alert.message,
              level: this.getAlertLevel(alert),
              timestamp: Date.now(),
              details: alert.details,
              config: {
                showIcon: this.config.ui.showIcon,
                showPopup: this.config.ui.showPopup,
                playSound: this.config.ui.playSound,
                colorCoding: this.config.ui.colorCoding
              }
            }
          }));
        }
      });
    }
  }

  // 获取告警级别
  getAlertLevel(alert) {
    if (alert.code >= 4100 && alert.code < 4200) {
      return 'error';
    } else if (alert.code >= 4000 && alert.code < 4100) {
      return 'warn';
    }
    return 'info';
  }

  // 添加自定义通知器
  addCustomNotifier(name, handler) {
    this.config.customNotifiers.set(name, handler);
  }

  // 移除自定义通知器
  removeCustomNotifier(name) {
    this.config.customNotifiers.delete(name);
  }

  // 发送所有配置的通知
  async sendAllNotifications(alert) {
    const promises = [
      this.sendEmailNotification(alert),
      this.sendWebhookNotification(alert),
      this.sendUINotification(alert)
    ];

    // 执行自定义通知器
    for (const [name, handler] of this.config.customNotifiers) {
      try {
        const result = handler(alert);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        this.emit('notification_error', {
          type: name,
          error: error.message
        });
      }
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Failed to send some notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;