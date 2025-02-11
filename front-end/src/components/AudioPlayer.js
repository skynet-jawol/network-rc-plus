import React, { useRef } from "react";
import { useState } from "react";
import { Switch, message } from "antd";
import store from "store";

import {
  AudioOutlined,
  AudioMutedOutlined,
  CarOutlined,
} from "@ant-design/icons";
import { useDebounceEffect } from "ahooks";

export default function AudioPlayer({ url, connectType, onMicphoneChange }) {
  const audioEl = useRef(null);
  const [enabled, setEnabled] = useState(
    // window.MediaSource
    //   ? store.get("audio-enabled") === undefined
    //     ? true
    //     : false
    //   : false
    false
  );
  const [src, setSrc] = useState(null);

  useDebounceEffect(
    () => {
      if (connectType === "ws") {
        if (!audioEl.current || !enabled) return;
        if (!window.MediaSource) {
          message.warn("移动版的 safari 浏览器暂不支持收听声音 😢");
          setTimeout(() => {
            setEnabled(false);
          }, 1000);
          return;
        }
        const mediaSource = new MediaSource();
        let ws;
        let buffer = [];
        function sourceopen() {
          var sourceBuffer = mediaSource.addSourceBuffer(
            // "audio/webm"
            "audio/mpeg"
          );
          setInterval(() => {
            if (buffer.length && !sourceBuffer.updating) {
              sourceBuffer.appendBuffer(buffer.shift());
            }
          }, 10);

          function onAudioLoaded({ data }) {
            buffer.push(data);
            if (audioEl.current.buffered.length) {
              const bufferTime =
                audioEl.current.buffered.end(0) - audioEl.current.currentTime;
              const playbackRate = 1 + (bufferTime - 0.8) * 1.2;
              if (playbackRate < 0) {
                audioEl.current.playbackRate = 0.5;
              } else if (playbackRate > 3) {
                audioEl.current.playbackRate = 3;
              } else {
                audioEl.current.playbackRate = playbackRate;
              }
            }
          }

          ws = new WebSocket(url);
          ws.binaryType = "arraybuffer";
          ws.addEventListener("message", onAudioLoaded);

          ws.addEventListener("open", () => {
            setEnabled(true);
          });
          ws.addEventListener("close", () => {
            setEnabled(false);
          });
        }

        mediaSource.addEventListener("sourceopen", sourceopen);
        setSrc(URL.createObjectURL(mediaSource));

        return function () {
          ws && ws.close();
          mediaSource.removeEventListener("sourceopen", sourceopen);
        };
      } else {
        onMicphoneChange(enabled);
      }
    },
    [audioEl, enabled, url, connectType, onMicphoneChange],
    { wait: 500 }
  );

  return (
    <div>
      <audio ref={audioEl} src={src} autoPlay></audio>
      <Switch
        checked={enabled}
        onChange={(v) => {
          setEnabled(v);
          store.set("audio-enabled", v);
        }}
        checkedChildren={
          <>
            <CarOutlined /> <AudioOutlined />
          </>
        }
        unCheckedChildren={
          <>
            <CarOutlined /> <AudioMutedOutlined />
          </>
        }
      />
    </div>
  );
}
