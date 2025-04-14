const { spawn, exec } = require("child_process");
const QRCode = require("qrcode");
const path = require("path");
const TTS = require("../tts");
const status = require("../status");
const { changeLedStatus } = require("../led");
const logger = require("../logger");

/**
 * 使用Cloudflare Zero Trust Tunnels建立隧道
 * @param {string} tunnelName - 隧道名称
 * @param {number} localPort - 本地端口
 */
async function startCloudflare(tunnelName, localPort) {
  try {
    await TTS("开始建立Cloudflare隧道!").end;
  } catch (e) {
    logger.info(e);
  }

  // 检查是否安装了cloudflared
  try {
    await exec("which cloudflared");
  } catch (e) {
    logger.error("未安装cloudflared，请先安装");
    changeLedStatus("error");
    await TTS("未安装Cloudflare客户端，请先安装").end;
    return;
  }

  // 启动Cloudflare隧道
  const cloudflare = spawn("cloudflared", [
    "tunnel",
    "--url",
    `http://localhost:${localPort}`,
    "--no-autoupdate"
  ]);

  cloudflare.on("exit", (code, signal) => {
    logger.error(`Cloudflare隧道退出 code:${code}, ${signal}`);
    changeLedStatus("error");
    if (code !== 0) {
      logger.info(`10秒后再次尝试建立隧道。`);
      TTS(`隧道建立失败！10秒后再次尝试。`);
      setTimeout(() => {
        startCloudflare(tunnelName, localPort);
      }, 10000);
    }
  });

  cloudflare.stdout.on("data", async (data) => {
    const dataStr = data.toString();
    logger.info(`Cloudflare stdout ${dataStr}`);

    // 检测隧道URL
    const urlMatch = dataStr.match(/https:\/\/[\w\d-]+\.trycloudflare\.com/);
    if (urlMatch) {
      const url = urlMatch[0];
      status.cloudflareUrl = url;
      // 更新配置中的URL，使前端可以显示
      status.saveConfig({ cloudflareUrl: url });
      changeLedStatus("penetrated");
      TTS(
        `隧道建立成功！使用 ${url} 进入遥控车控制界面。`,
        { reg: "1" }
      );
      QRCode.toString(url, { type: "terminal" }, function (err, qrcode) {
        if (!err) {
          console.info(qrcode);
        }
      });
    }

    if (dataStr.indexOf("error") > -1 || dataStr.indexOf("Error") > -1) {
      changeLedStatus("error");
    }
  });

  cloudflare.stderr.on("data", async (data) => {
    logger.error(`Cloudflare stderr:${data}`);
  });
}

/**
 * 使用Cloudflare Zero Trust配置文件建立隧道
 * @param {string} configPath - 配置文件路径
 */
async function configCloudflare(configPath) {
  try {
    await TTS("开始建立Cloudflare隧道!").end;
    await TTS("使用配置文件建立隧道").end;
  } catch (e) {
    logger.info(e);
  }

  // 检查是否安装了cloudflared
  try {
    await exec("which cloudflared");
  } catch (e) {
    logger.error("未安装cloudflared，请先安装");
    changeLedStatus("error");
    await TTS("未安装Cloudflare客户端，请先安装").end;
    return;
  }

  // 使用配置文件启动Cloudflare隧道
  const cloudflare = spawn("cloudflared", [
    "tunnel",
    "--config",
    path.resolve(configPath),
    "run"
  ]);

  cloudflare.on("exit", (code, signal) => {
    logger.error(`Cloudflare隧道退出 code:${code}, ${signal}`);
    changeLedStatus("error");
    if (code !== 0) {
      logger.info(`10秒后再次尝试建立隧道。`);
      TTS(`隧道建立失败！10秒后再次尝试。`);
      setTimeout(() => {
        configCloudflare(configPath);
      }, 10000);
    }
  });

  cloudflare.stdout.on("data", async (data) => {
    const dataStr = data.toString();
    logger.info(`Cloudflare stdout ${dataStr}`);

    if (dataStr.indexOf("Connection established") > -1) {
      changeLedStatus("penetrated");
      // 尝试从输出中提取URL
      const urlMatch = dataStr.match(/https:\/\/[\w\d-]+\.[\w\d-]+\.[\w\d-]+/);
      if (urlMatch) {
        const url = urlMatch[0];
        // 更新配置中的URL，使前端可以显示
        status.saveConfig({ cloudflareUrl: url });
        TTS(`隧道建立成功！使用 ${url} 进入遥控车控制界面。`);
      } else {
        TTS("隧道建立成功！");
      }
    }

    if (dataStr.indexOf("error") > -1 || dataStr.indexOf("Error") > -1) {
      changeLedStatus("error");
    }
  });

  cloudflare.stderr.on("data", async (data) => {
    logger.error(`Cloudflare stderr:${data}`);
  });
}

exports.startCloudflare = startCloudflare;
exports.configCloudflare = configCloudflare;