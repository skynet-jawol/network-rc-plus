import React, { useEffect } from "react";
import { useState } from "react";
import { useKeyPress, useEventListener } from "ahooks";
import { Button, message, Popover } from "antd";
import RecordRTC, { StereoAudioRecorder } from "recordrtc";

import { AudioOutlined } from "@ant-design/icons";
import gif from "../assets/开骂.gif";

export default function Microphone({ url }) {
  const [recordAudio, setRecordAudio] = useState(undefined);
  const [enabled, setEnabled] = useState(undefined);
  const [ws, setWs] = useState(undefined);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!url) return;
    const ws = new WebSocket(url);
    const open = () => setEnabled(true);
    const close = () => setEnabled(false);
    ws.addEventListener("open", open);
    ws.addEventListener("close", close);

    setWs(ws);

    return function () {
      if (ws) {
        ws.close();
        ws.removeEventListener("open", open);
        ws.removeEventListener("close", close);
      }
      setWs(undefined);
    };
  }, [url]);

  const startRecording = () => {
    if (recording) return;
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
      })
      .then(function (audioStream) {
        setRecording(true);
        const record = new RecordRTC(audioStream, {
          type: "audio",

          //6)
          mimeType: "audio/wav",
          sampleRate: 16000,
          // used by StereoAudioRecorder
          // the range 22050 to 96000.
          // let us force 16khz recording:
          desiredSampRate: 16000,

          bufferSize: 256,

          // MediaStreamRecorder, StereoAudioRecorder, WebAssemblyRecorder
          // CanvasRecorder, GifRecorder, WhammyRecorder
          recorderType: StereoAudioRecorder,

          // Dialogflow / STT requires mono audio
          numberOfAudioChannels: 1,
        });

        record.startRecording();

        setRecordAudio(record);
      })
      .catch(function (e) {
        console.error(e);
        message.error(e.message);
      });
  };

  const endRecording = () => {
    if (!recording) return;
    setRecording(false);
    if (!recordAudio || !ws) return;
    recordAudio.stopRecording(function () {
      let blob = recordAudio.getBlob();
      ws.send(blob);
      message.success("发送语音");
    });
  };

  const gamepadPress = ({ detail: { index, value } }) => {
    if (index === 2) {
      if (value > 0.5) {
        startRecording();
      } else {
        endRecording();
      }
    }
  };

  useKeyPress("space", startRecording);
  useKeyPress("space", endRecording, { events: ["keyup"] });

  useEventListener("gamepadpress", gamepadPress);

  return (
    <Popover
      visible={recording}
      placement="leftBottom"
      content={
        <img className="select-disabled recording-img" src={gif} alt="录音中" />
      }
    >
      <Button
        className="record-button"
        size="large"
        disabled={!enabled}
        shape="circle"
        onTouchStart={startRecording}
        onTouchEnd={endRecording}
        icon={<AudioOutlined />}
      />
    </Popover>
  );
}
