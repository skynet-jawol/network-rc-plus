import React, { useEffect, useRef } from "react";
import Player from "../lib/Player";
// import Player from "ws-avc-player";
import { useState } from "react";
import { Button, Switch, message, Select } from "antd";
import {
  useCreation,
  useDebounceEffect,
  useEventListener,
  useUnmount,
} from "ahooks";
import store from "store";
import {
  RotateRightOutlined,
  CompressOutlined,
  BorderOutlined,
  BorderVerticleOutlined,
  BorderHorizontalOutlined,
} from "@ant-design/icons";

const { Option } = Select;

export default function Camera({
  url,
  editabled,
  size,
  onChangeVideoRatio,
  onClickFullScreen,
  onClickCenterScreen,
  session,
  rtcChannel,
}) {
  const storeName = `camera-${url}`;
  const boxEl = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [pause, setPause] = useState(false); // 后台 pause
  const [cameraName, setCameraName] = useState("");
  const [formatList, setFormatList] = useState([]);
  const [inputFormatIndex, setInputFormatIndex] = useState(undefined);
  const [fps, setFps] = useState(30);
  const [rotate, setRotate] = useState(0); // 旋转
  const [xFlip, setXFlip] = useState(false); // x 翻转
  const [yFlip, setYFlip] = useState(false); // y 翻转

  const player = useCreation(() => {
    const {
      rotate = 0,
      enabled = true,
      inputFormatIndex = 0,
      fps = 30,
      xFlip = false,
      yFlip = false,
    } = store.get(storeName) || {};
    setEnabled(enabled);
    setRotate(rotate);
    setInputFormatIndex(inputFormatIndex);
    setFps(fps);
    setXFlip(xFlip);
    setYFlip(yFlip);

    const w = new Player({
      useWorker: true,
      workerFile: `${process.env.PUBLIC_URL}/Decoder.js`,
      sessionId: session.id,
      url,
    });

    w.on("info", ({ cameraName, size: { width, height }, formatList }) => {
      setCameraName(cameraName);
      w.cameraName = cameraName;
      setFormatList(formatList);
    });

    // w.on("open", ({ inputFormatIndex, fps }) => {
    //   setInputFormatIndex(inputFormatIndex);
    //   setFps(fps);
    // });

    w.on("resized", ({ width, height }) => {
      message.success(`${w.cameraName} 传输分辨率 ${width}x${height}`);
    });

    return w;
  });

  useEffect(() => {
    const changeRoatio = ({ size: { width, height } }) => {
      onChangeVideoRatio(width / height);
    };
    player.on("info", changeRoatio);
    return () => {
      player.off("info", changeRoatio);
    };
  }, [onChangeVideoRatio, player]);

  useUnmount(() => {
    player.close();
  });

  function changeRotate() {
    if (rotate === 270) {
      setRotate(0);
    } else {
      setRotate(rotate + 90);
    }
  }

  function changeXFlip() {
    setXFlip(!xFlip);
  }

  function changeYFlip() {
    setYFlip(!yFlip);
  }

  useEventListener(
    "visibilitychange",
    function () {
      if (document.visibilityState === "visible") {
        setPause(false);
      } else {
        setPause(true);
      }
    },
    { dom: document }
  );

  useDebounceEffect(
    () => {
      const box = boxEl.current;
      if (!pause && enabled) {
        player.open({
          inputFormatIndex,
          fps,
          size,
        });

        player.AvcPlayer.canvas.style.display = "";
        if (player.AvcPlayer.canvas.parentElement !== box) {
          box.appendChild(player.AvcPlayer.canvas);
        }
      } else {
        player.close();
        player.AvcPlayer.canvas.style.display = "none";
      }
    },
    [enabled, pause, player, inputFormatIndex, fps, size],
    {
      wait: 500,
    }
  );

  useEffect(() => {
    store.set(storeName, { rotate, enabled, inputFormatIndex });
  }, [storeName, rotate, enabled, inputFormatIndex]);

  useEffect(() => {
    if (rtcChannel) {
      player.setRTCDataChannel(rtcChannel);
      return () => player.removeRTCDataChannel(rtcChannel);
    }
  }, [rtcChannel, player]);

  return (
    <div className="camera">
      {editabled ? (
        <div className="button-box transition-animation" title={cameraName}>
          {<Switch size="small" checked={enabled} onChange={setEnabled} />}
          <Button
            size="small"
            shape="circle"
            icon={<CompressOutlined />}
            onClick={onClickCenterScreen}
          />
          <Button
            size="small"
            shape="circle"
            icon={<BorderOutlined />}
            onClick={onClickFullScreen}
          />
          <Button
            size="small"
            shape="circle"
            icon={<RotateRightOutlined />}
            onClick={changeRotate}
          />
          <Button
            size="small"
            shape="circle"
            icon={<BorderHorizontalOutlined />}
            onClick={changeXFlip}
          />
          <Button
            size="small"
            shape="circle"
            icon={<BorderVerticleOutlined />}
            onClick={changeYFlip}
          />
          <Select
            defaultValue={inputFormatIndex}
            onChange={setInputFormatIndex}
            size="small"
          >
            {formatList.map(({ format, size }, index) => (
              <Option
                key={size + format}
                value={index}
              >{`${size} ${format}`}</Option>
            ))}
          </Select>
          <Select defaultValue={fps} onChange={setFps} size="small">
            <Option value={15}>15 fps</Option>
            <Option value={30}>30 fps</Option>
            <Option value={60}>60 fps</Option>
          </Select>
        </div>
      ) : undefined}
      <div
        className="camera-box"
        ref={boxEl}
        style={{
          transform: `rotate(${rotate}deg) scaleX(${xFlip ? -1 : 1}) scaleY(${
            yFlip ? -1 : 1
          })`,
        }}
      ></div>
    </div>
  );
}
