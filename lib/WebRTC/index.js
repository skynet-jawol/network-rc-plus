const {
  RTCPeerConnection,
  RTCIceCandidate,
  MediaStream,
  nonstandard: { RTCAudioSink },
} = require("wrtc");
const RTCAudioSource = require("./RTCAudioSource");
const audioPlayer = require("../audioPlayer");

module.exports = class WebRTC {
  constructor({
    socket,
    sendCandidate,
    onOffer,
    onClose,
    onWarnning,
    onError,
    onSuccess,
    rtcDataChannelList,
    onDataChannelOpen,
    onDataChannelClose,
  }) {
    this.socket = socket;
    this.onClose = onClose;
    this.onWarnning = onWarnning;
    this.onDataChannelOpen = onDataChannelOpen;
    this.onDataChannelClose = onDataChannelClose;
    logger.info("ws 连接");

    // # 1 创建服务器端 rc
    logger.info("Webrtc start!");
    const rc = (this.rc = new RTCPeerConnection({
      // sdpSemantics: "unified-plan",
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
      iceCandidatePoolSize: 0,
      // 启用丢包重传
      enableRtx: true,
      // 启用前向纠错
      enableFec: true,
      // 设置带宽估计初始值
      initialBandwidth: 1000000,
      // 设置最大重传次数
      maxRetransmits: 3,
      // 设置带宽估计算法
      bandwidthEstimation: {
        initialBitrate: 1000000,
        maxBitrate: 4000000,
        minBitrate: 100000
      }
    }));

    rtcDataChannelList.forEach(({ label, onMessage }) => {
      logger.info(`WebRTC Create Data Channel: ${label}`);
      this.createChannel({ label, onMessage });
    });

    this.onAudioData = (data) => {
      // 20220206 测试 ios safari 全部为0
      // logger.debug(data);
      if (!this.player || this.player.sampleRate !== data.sampleRate) {
        if (this.player) {
          this.player.end();
          delete this.player;
        }
        this.player = audioPlayer.createStreamPlayer({
          label: "WebRTC Audio player",
          ...data,
        });
        this.player.sampleRate = data.sampleRate;
      }
      this.player.write(Buffer.from(data.samples.buffer, data));
    };

    // # 2 添加媒体
    const mediaStream = new MediaStream();
    this.mediaStream = mediaStream;
    this.rtcAudioSource = new RTCAudioSource();
    const audioTrack = this.rtcAudioSource.createTrack();
    mediaStream.addTrack(audioTrack);
    rc.addTrack(audioTrack, mediaStream);

    rc.ontrack = rc.ontrack = (e) => {
      logger.info("WebRTC On Track: " + e.track.kind);
      this.receiveAudioTrack = e.track;
      this.openAudioPlayer();
    };

    rc.addEventListener("icecandidate", ({ candidate }) => {
      if (!candidate) return;
      sendCandidate(candidate);
    });

    rc.addEventListener("iceconnectionstatechange", (e) => {
      logger.info("iceConnectionState" + e.iceConnectionState);
      // if (rc.iceConnectionState == "failed") {
      //   // this.close();
      //   onError && onError(new Error(" WebRTC 连接失败！"));
      //   this.close();
      // }
    });

    rc.addEventListener("connectionstatechange", () => {
      logger.info("WebRTC Connection state change: " + rc.connectionState);
      switch (rc.connectionState) {
        case "connected":
          if (!this.connected) {
            this.connected = true;
            onSuccess();
            this.rtcAudioSource.start();
          }
          break;
        case "disconnected":
          if (this.connected) {
            this.connected = false;
            this.rtcAudioSource.stop();
          }
          break;
        case "failed":
          // One or more transports has terminated unexpectedly or in an error
          this.connected = false;
          break;
        case "closed":
          // The connection has been closed
          this.connected = false;
          this.close();
          break;
      }
    });

    (async () => {
      // # 3 服务器 设置服务器本地 description
      const offer = await rc.createOffer({
        offerToReceiveAudio: true,
      });
      await rc.setLocalDescription(offer);
      onOffer(offer);
    })();
  }

  addCandidate(candidate) {
    if (!candidate) return;
    logger.info("remote candidate", candidate.candidate);
    this.rc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  onAnswer(description) {
    // # 8 服务器 设置远程 description
    this.rc.setRemoteDescription(description);
  }

  openAudioPlayer() {
    if (!this.receiveAudioTrack) return;
    if (!this.audioSink) {
      const audioSink = new RTCAudioSink(this.receiveAudioTrack);
      this.audioSink = audioSink;
    }
    this.audioSink.addEventListener("data", this.onAudioData);
  }

  createChannel({ label = "controller", onMessage } = {}) {
    const channel = this.rc.createDataChannel(label);
    channel.addEventListener("open", () => {
      logger.info(`Data Channel[${label}] open`);
      this.onDataChannelOpen(channel);
    });

    channel.addEventListener("message", ({ data }) => {
      // logger.info("Controller Data Channel", data);
      onMessage && onMessage(data);
    });
    channel.addEventListener("close", () => {
      this.onDataChannelClose(channel);
    });
    return channel;
  }

  closeAudioPlayer() {
    if (this.player) {
      this.player.end();
      delete this.player;
    }
  }

  close() {
    if (!this.rc) return;
    logger.info("Webrtc close!");
    this.rtcAudioSource.stop();
    this.audioSink && this.audioSink.stop();
    this.closeAudioPlayer();
    this.rc.close();
    this.rc = undefined;
    this.onClose();
  }
};
