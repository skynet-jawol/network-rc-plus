import React, { useEffect, useState } from "react";
import { Amap, Marker, config, Polyline, InfoWindow } from "@amap/amap-react";
import store from "store";
import { Switch, Space, Button, Slider, Card, Badge, Tooltip } from "antd";
import { CompassOutlined, EnvironmentOutlined, DashboardOutlined } from "@ant-design/icons";
import styles from "./Map.module.scss";

config.key = "8faf092bfa96e5b6748ea7e0a2d6ac9c";

export default function MiniMap({ statusInfo: { gps } = {} }) {
  const [history, setHistory] = useState(store.get("gps history") || []);
  const [defaultLng, defaultLat] = history.length
    ? history[history.length - 1]
    : [117.2, 34.2];
  const { lat = defaultLat, lng = defaultLng, fix = false, speed = 0, course = 0, satellites = 0, timestamp = null } = gps || {};
  const center = [lng, lat];
  const [enabled, setEnabled] = useState(store.get("minimap enabled") !== false);
  const [zoom, setZoom] = useState(store.get("minimap zoom") || 16);
  const [showInfo, setShowInfo] = useState(false);
  const [mapType, setMapType] = useState(store.get("minimap type") || "normal");

  useEffect(() => {
    const { length } = history;
    if (
      length === 0 ||
      lng !== history[length - 1][0] ||
      lat !== history[length - 1][1]
    ) {
      const newHistory = [...history, [lng, lat]]
        .filter(([lng, lat]) => lat !== undefined && lng !== undefined)
        .slice(-100); // 只保留最近100个点
      setHistory(newHistory);
      store.set("gps history", newHistory);
    }
  }, [lat, lng, history]);

  useEffect(() => {
    store.set("minimap enabled", enabled);
  }, [enabled]);

  useEffect(() => {
    store.set("minimap zoom", zoom);
  }, [zoom]);
  
  useEffect(() => {
    store.set("minimap type", mapType);
  }, [mapType]);

  if (!enabled) return null;

  // 格式化时间
  const formatTime = (timestamp) => {
    if (!timestamp) return "--";
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.miniMapContainer}>
      <Card
        size="small"
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Badge status={fix ? "success" : "error"} text={
              <span>
                <EnvironmentOutlined /> GPS {fix ? "已定位" : "未定位"}
                {fix && <span style={{ marginLeft: 8, fontSize: 12 }}>({satellites}颗卫星)</span>}
              </span>
            } />
            <Space>
              <Button 
                size="small" 
                type={mapType === "normal" ? "primary" : "default"}
                onClick={() => setMapType("normal")}
              >
                标准
              </Button>
              <Button 
                size="small" 
                type={mapType === "satellite" ? "primary" : "default"}
                onClick={() => setMapType("satellite")}
              >
                卫星
              </Button>
              <Switch size="small" checked={enabled} onChange={setEnabled} />
            </Space>
          </div>
        }
        bodyStyle={{ padding: 0, height: "100%" }}
        extra={<Button size="small" onClick={() => setHistory([])}>清除轨迹</Button>}
      >
        <div style={{ position: "relative", height: "100%" }}>
          <Slider
            className={styles.zoom}
            min={2}
            max={20}
            value={zoom}
            onChange={(v) => setZoom(v)}
          />
          <div style={{ position: "absolute", left: 5, bottom: 5, zIndex: 1, fontSize: "12px", background: "rgba(255,255,255,0.7)", padding: "2px 5px", borderRadius: "3px" }}>
            <Tooltip title="当前速度">
              <DashboardOutlined /> {speed.toFixed(1)} km/h
            </Tooltip>
            <span style={{ margin: "0 5px" }}>|</span>
            <Tooltip title="航向角度">
              <CompassOutlined /> {course.toFixed(1)}°
            </Tooltip>
            {timestamp && (
              <>
                <span style={{ margin: "0 5px" }}>|</span>
                <span>{formatTime(timestamp)}</span>
              </>
            )}
          </div>
          <Amap 
            zoom={zoom} 
            center={center} 
            style={{ height: "100%" }}
            mapStyle={mapType === "satellite" ? "satellite" : "normal"}
          >
            <Marker
              position={center}
              label={{
                content: `${speed.toFixed(1)} km/h`,
                direction: "bottom",
              }}
              angle={course} // 使用航向角度旋转标记
              icon={{
                // 使用带方向的图标
                type: "image",
                image: "https://webapi.amap.com/theme/v1.3/markers/n/dir_0.png",
                size: [36, 36],
                anchor: "center"
              }}
              onClick={() => setShowInfo(!showInfo)}
            />
            {showInfo && (
              <InfoWindow
                position={center}
                visible={showInfo}
                onClose={() => setShowInfo(false)}
              >
                <div>
                  <p><strong>经度:</strong> {lng.toFixed(6)}</p>
                  <p><strong>纬度:</strong> {lat.toFixed(6)}</p>
                  <p><strong>速度:</strong> {speed.toFixed(1)} km/h</p>
                  <p><strong>航向:</strong> {course.toFixed(1)}°</p>
                  <p><strong>卫星数:</strong> {satellites}</p>
                  {timestamp && <p><strong>时间:</strong> {formatTime(timestamp)}</p>}
                </div>
              </InfoWindow>
            )}
            <Polyline 
              path={history} 
              strokeColor="#3388ff" 
              strokeWeight={4} 
              strokeOpacity={0.8} 
            />
          </Amap>
        </div>
      </Card>
    </div>
  );
}