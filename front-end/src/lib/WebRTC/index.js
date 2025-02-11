import { message } from "antd";

export default class WebRTC {
  constructor({
    video,
    micphoneEanbled = false,
    socket,
    onSuccess,
    onClose,
    onDataChannel,
  }) {
    this.video = video;
    this.socket = socket;
    this.onSuccess = onSuccess;
    this.onClose = onClose;
    this.onDataChannel = onDataChannel;
    this.micphoneEanbled = micphoneEanbled;

    // 初始化性能监控服务
    this.performanceService = new WebRTCPerformanceService();
    this.performanceService.on('performance-update', (performanceData) => {
      console.log('WebRTC性能数据:', performanceData);
      // 发送性能数据到服务器
      this.socket.send(JSON.stringify({
        action: 'webrtc stats',
        payload: performanceData
      }));

      // 根据性能建议自动调整参数
      const suggestions = performanceData.suggestions;
      suggestions.forEach(suggestion => {
        if (suggestion.severity === 'critical') {
          this.applyOptimizationSuggestion(suggestion);
        }
      });
    });

    // #0 请求 webrtc 连接
    this.socketSend({ type: "connect" });
    this.socket.addEventListener("message", this.onSocketMessage);

    this.audioEl = document.createElement("audio");
    document.body.appendChild(this.audioEl);
  }

  socketSend({ type, payload }) {
    this.socket.send(
      JSON.stringify({
        action: `webrtc ${type}`,
        payload,
      })
    );
  }

  onSocketMessage = ({ data }) => {
    if (typeof data !== "string") return;
    data = JSON.parse(data);
    const { action, payload } = data;
    if (action.indexOf("webrtc") === -1) return;
    const type = action.split(" ")[1];
    switch (type) {
      case "offer":
        this.onOffer(payload);
        break;
      case "candidate":
        this.addCandidate(payload);
        break;
      default:
        console.log(action);
        break;
    }
  };

  onOffer = async (offer) => {
    console.log("WebRTC Get offer", offer);

    // # 4 创建客户端 rc
    const rc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "turn:gz.esonwong.com:34578",
          username: "network-rc",
          credential: "network-rc"
        },
        {
          urls: "turn:turn.network-rc.com:3478",
          username: "network-rc",
          credential: "network-rc-turn"
        },
        { urls: ["stun:stun.l.google.com:19302"] },
        { urls: ["stun:stun.miwifi.com"] }
      ],
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      iceCandidatePoolSize: 0
    });

    // 添加网络质量监控
    this.startNetworkMonitoring(rc);

    rc.addEventListener("datachannel", ({ channel }) => {
      const { label } = channel;
      console.log(`WebRTC [${label}] Data Channel open`, channel);
      this.onDataChannel(channel);
    });

    rc.addEventListener("connectionstatechange", ({ target }) => {
      console.log("Connection state change", target.connectionState);
      this.monitor.updateConnectionState(target.connectionState);
      if (target.connectionState === "connected") {
        this?.onSuccess?.({});
        console.log("RTC", rc);
        // 开始性能监控
        setInterval(() => {
          this.monitor.getStats(rc);
        }, 1000);
      }
      if (target.connectionState === "disconnected") {
        this.close();
      }
    });
    rc.addEventListener("iceconnectionstatechange", function (e) {
      // console.log("iceConnectionState", e);
    });
    rc.addEventListener("icecandidate", ({ candidate }) => {
      if (!candidate) return;
      this.socketSend({ type: "candidate", payload: candidate });
      // console.log("local candidate", candidate);
    });
    rc.addEventListener("icecandidateerror", function (e) {
      console.error("icecandidateerror", e);
    });

    this.rc = rc;

    // # 5 设置客户端远程 description
    await rc.setRemoteDescription(offer);

    // # 6 获取远程 stream
    console.log("receivers", rc.getReceivers());
    const remoteStream = new MediaStream(
      rc.getReceivers().map((receiver) => receiver.track)
    );

    this.audioEl.srcObject = remoteStream;
    // this.video.srcObject = remoteStream;

    await this.addAudioTrack();

    // # 7 设置客户端本地 description 传递本地回答详情
    const answer = await rc.createAnswer();
    console.log("WebRTC answer", answer);
    await rc.setLocalDescription(answer);
    this.socketSend({ type: "answer", payload: answer });
  };

  addCandidate(candidate) {
    if (!candidate) return;
    // console.log("remote candidate", candidate.candidate);
    this.rc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  playAudio(playing) {
    playing ? this.audioEl.play() : this.audioEl.pause();
    // this.audioEl.srcObject
    //   .getTracks()
    //   .forEach((track) => (track.enabled = playing));
  }

  //  20220206 测试即使通过交互触发，ios safari 仍然不支持音频
  async addAudioTrack() {
    try {
      this.localStream = await window.navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: false,
        })
        .catch((e) => {
          console.error(e);
          throw e;
        });
      this.localStream.getTracks().forEach((track) => {
        track.enabled = this.micphoneEanbled;
        this.rc.addTrack(track);
      });
    } catch (error) {
      console.error(error);
      message.error("开启语音失败 " + error.message);
    }
  }

  async changeMicrophone() {
    this.micphoneEanbled = !this.micphoneEanbled;
    this.localStream &&
      this.localStream
        .getTracks()
        .forEach((track) => (track.enabled = this.micphoneEanbled));
  }

  close() {
    this.socket.removeEventListener("message", this.onSocketMessage);
    this.localStream &&
      this.localStream.getTracks().forEach((track) => track.stop());
    this.rc?.close?.();
    this.rc = undefined;
    this.audioEl.srcObject = null;
    if (this.video) {
      this.video.srcObject = null;
    }
    this.socketSend({ type: "close" });
    this.onClose();
  }

  // 网络质量监控和自适应调整
  startNetworkMonitoring(rc) {
    let lastPacketsLost = 0;
    let lastBytesReceived = 0;
    let lastTimestamp = 0;
    let consecutivePoorQuality = 0;

    setInterval(async () => {
      const stats = await rc.getStats();
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const now = report.timestamp;
          const packetsLost = report.packetsLost;
          const bytesReceived = report.bytesReceived;

          if (lastTimestamp > 0) {
            const timeDiff = now - lastTimestamp;
            const packetLossRate = ((packetsLost - lastPacketsLost) / report.packetsReceived) * 100;
            const bitrate = 8 * (bytesReceived - lastBytesReceived) / timeDiff * 1000;

            // 评估网络质量
            const qualityScore = this.calculateQualityScore(packetLossRate, bitrate, report.jitter);

            // 更新连续质量差的计数
            if (qualityScore < 60) {
              consecutivePoorQuality++;
            } else {
              consecutivePoorQuality = 0;
            }

            // 根据网络状况调整编码参数
            this.adjustEncodingParameters(rc, {
              packetLossRate,
              bitrate,
              qualityScore,
              consecutivePoorQuality
            });

            // 发送性能数据
            this.socket.send(JSON.stringify({
              action: 'webrtc stats',
              payload: {
                packetLossRate,
                bitrate,
                qualityScore,
                jitter: report.jitter,
                frameRate: report.framesPerSecond,
                resolution: {
                  width: report.frameWidth,
                  height: report.frameHeight
                }
              }
            }));
          }

          lastPacketsLost = packetsLost;
          lastBytesReceived = bytesReceived;
          lastTimestamp = now;
        }
      });
    }, 1000);
  }

  // 计算网络质量分数
  calculateQualityScore(packetLossRate, bitrate, jitter) {
    let score = 100;

    // 根据丢包率评分
    if (packetLossRate > 15) score -= 40;
    else if (packetLossRate > 10) score -= 30;
    else if (packetLossRate > 5) score -= 20;

    // 根据码率评分
    if (bitrate < 100000) score -= 30;
    else if (bitrate < 500000) score -= 20;
    else if (bitrate < 1000000) score -= 10;

    // 根据抖动评分
    if (jitter > 100) score -= 30;
    else if (jitter > 50) score -= 20;
    else if (jitter > 30) score -= 10;

    return Math.max(0, score);
  }

  // 自适应调整编码参数
  adjustEncodingParameters(rc, { packetLossRate, bitrate, qualityScore, consecutivePoorQuality }) {
    const senders = rc.getSenders();
    senders.forEach(sender => {
      if (sender.track && sender.track.kind === 'video') {
        const parameters = sender.getParameters();
        if (!parameters.encodings) {
          parameters.encodings = [{}];
        }

        // 根据连续质量差的次数采取更激进的优化措施
        if (consecutivePoorQuality >= 5) {
          parameters.encodings[0].maxBitrate = 100000; // 降至最低码率
          parameters.encodings[0].scaleResolutionDownBy = 4.0; // 大幅降低分辨率
          parameters.encodings[0].maxFramerate = 15; // 降低帧率
        } else {
          // 正常的自适应调整
          if (packetLossRate > 10) {
            parameters.encodings[0].maxBitrate = Math.max(100000, bitrate * 0.8);
            parameters.encodings[0].scaleResolutionDownBy = 2.0;
          } else if (packetLossRate < 5 && qualityScore > 80) {
            parameters.encodings[0].maxBitrate = Math.min(4000000, bitrate * 1.2);
            parameters.encodings[0].scaleResolutionDownBy = 1.0;
          }

          // 根据质量分数调整帧率
          if (qualityScore < 60) {
            parameters.encodings[0].maxFramerate = 20;
          } else if (qualityScore > 80) {
            parameters.encodings[0].maxFramerate = 30;
          }
        }

        sender.setParameters(parameters).catch(e => {
          console.error('调整编码参数失败:', e);
        });
      }
    });
  }
  rc.addEventListener("connectionstatechange", ({ target }) => {
      console.log("Connection state change", target.connectionState);
      if (target.connectionState === "connected") {
        this?.onSuccess?.({});
        console.log("RTC", rc);
      }
      if (target.connectionState === "disconnected") {
        this.close();
      }
    });
    rc.addEventListener("iceconnectionstatechange", function (e) {
      // console.log("iceConnectionState", e);
    });
    rc.addEventListener("icecandidate", ({ candidate }) => {
      if (!candidate) return;
      this.socketSend({ type: "candidate", payload: candidate });
      // console.log("local candidate", candidate);
    });
    rc.addEventListener("icecandidateerror", function (e) {
      console.error("icecandidateerror", e);
    });

    this.rc = rc;

    // # 5 设置客户端远程 description
    await rc.setRemoteDescription(offer);

    // # 6 获取远程 stream
    console.log("receivers", rc.getReceivers());
    const remoteStream = new MediaStream(
      rc.getReceivers().map((receiver) => receiver.track)
    );

    this.audioEl.srcObject = remoteStream;
    // this.video.srcObject = remoteStream;

    await this.addAudioTrack();

    // # 7 设置客户端本地 description 传递本地回答详情
    const answer = await rc.createAnswer();
    console.log("WebRTC answer", answer);
    await rc.setLocalDescription(answer);
    this.socketSend({ type: "answer", payload: answer });
  };

  addCandidate(candidate) {
    if (!candidate) return;
    // console.log("remote candidate", candidate.candidate);
    this.rc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  playAudio(playing) {
    playing ? this.audioEl.play() : this.audioEl.pause();
    // this.audioEl.srcObject
    //   .getTracks()
    //   .forEach((track) => (track.enabled = playing));
  }

  //  20220206 测试即使通过交互触发，ios safari 仍然不支持音频
  async addAudioTrack() {
    try {
      this.localStream = await window.navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: false,
        })
        .catch((e) => {
          console.error(e);
          throw e;
        });
      this.localStream.getTracks().forEach((track) => {
        track.enabled = this.micphoneEanbled;
        this.rc.addTrack(track);
      });
    } catch (error) {
      console.error(error);
      message.error("开启语音失败 " + error.message);
    }
  }

  async changeMicrophone() {
    this.micphoneEanbled = !this.micphoneEanbled;
    this.localStream &&
      this.localStream
        .getTracks()
        .forEach((track) => (track.enabled = this.micphoneEanbled));
  }

  close() {
    this.socket.removeEventListener("message", this.onSocketMessage);
    this.localStream &&
      this.localStream.getTracks().forEach((track) => track.stop());
    this.rc?.close?.();
    this.rc = undefined;
    this.audioEl.srcObject = null;
    if (this.video) {
      this.video.srcObject = null;
    }
    this.socketSend({ type: "close" });
    // 清理性能监控
    this.monitor.removeAllListeners();
    this.onClose();
  }
}
