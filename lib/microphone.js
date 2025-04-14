const { EventEmitter } = require("events");
const { execSync } = require("child_process");
const fs = require("fs");

class Microphone extends EventEmitter {
  constructor(options) {
    super(options);
    this.options = options;
    this.list = [];
    this.playing = false;
    this.streamer = undefined;
    this.audioSystem = this.detectAudioSystem();
    logger.info(`检测到音频系统: ${this.audioSystem}`);
  }
  
  /**
   * 检测当前系统使用的音频系统
   * @returns {string} "pipewire" 或 "pulseaudio"
   */
  detectAudioSystem() {
    try {
      // 检查PipeWire服务是否运行
      const pipewireRunning = execSync("systemctl --user is-active pipewire.service", { stdio: 'pipe' }).toString().trim() === "active";
      if (pipewireRunning) {
        return "pipewire";
      }
    } catch (error) {
      // 如果命令失败，可能是PipeWire未安装
    }
    return "pulseaudio";
  }

  /**
   * 获取麦克风设备列表
   */
  async getMicphoneList() {
    const output = execSync("LANG=en pactl list sources").toString();
    let matchList;
    
    if (this.audioSystem === "pipewire") {
      // PipeWire的pactl输出格式可能略有不同
      matchList = Array.from(
        output.matchAll(
          /Source #(\d+)[\s\S]+?Name: (.+)[\s\S]+?Description: (.+)[\s\S]+?(Volume:|volume:)[\s\S]+?(\d+)\%/g
        )
      );
      
      const list = matchList.map(([, index, name, description, , volume]) => ({
        index,
        displayName: description,
        name,
        volume,
        description,
      }));
      
      logger.info("获取音频设备列表(PipeWire)", list);
      this.list = list;
      return list;
    } else {
      // 原有的PulseAudio解析逻辑
      matchList = Array.from(
        output.matchAll(
          /Source #(\d+)[\s\S]+?Name: (.+)[\s\S]+?Description: (.+)[\s\S]+?Volume: [\s\S]+?(\d+)\%/g
        )
      );

      const list = matchList.map(([, index, name, description, volume]) => ({
        index,
        displayName: description,
        name,
        volume,
        description,
      }));

      logger.info("获取音频设备列表(PulseAudio)", list);
      this.list = list;
      return list;
    }
  }

  // 获取当前播麦克风
  async getMicphone() {
    const output = execSync("LANG=en pactl info").toString();
    let name;
    
    if (this.audioSystem === "pipewire") {
      // PipeWire中可能使用不同的标签
      const defaultSourceMatch = output.match(/Default Source: (.+?)\n/) || output.match(/默认音源：(.+?)\n/) || [];
      name = defaultSourceMatch[1];
    } else {
      const [, defaultName] = output.match(/Default Source: (.+?)\n/) || [];
      name = defaultName;
    }
    
    logger.info("获取当前播麦克风", name);
    const speaker = (await this.getMicphoneList()).find(
      (item) => item.name === name
    );
    logger.info("获取当前播麦克风", speaker);
    return speaker;
  }

  // 设置音频播放设备
  async setMicphone(name) {
    logger.info("设置音频设备", name);
    execSync(`LANG=en pactl set-default-source ${name}`);
  }

  // 设置音频播放设备音量
  async setMicphoneVolume(name, v) {
    logger.info("设置音频设备音量", name, v);
    execSync(`LANG=en pactl set-source-volume ${name} ${v}%`);
  }
}

module.exports = new Microphone();
