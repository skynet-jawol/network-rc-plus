import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import store from "store";
import { Switch, Space, Button, Slider } from "antd";
import styles from "./Map.module.scss";
import "leaflet/dist/leaflet.css";

const MapController = ({ center, zoom, setZoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// 自定义标记图标
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  shadowSize: [41, 41]
});

export default function Map({ editabled = false, statusInfo: { gps } = {} }) {
  const [history, setHistory] = useState(store.get("gps history") || []);
  const [defaultLng, defaultLat] = history.length
    ? history[history.length - 1]
    : [117.2, 34.2];
  const { lat = defaultLat, lng = defaultLng } = gps || {};
  const center = [lng, lat];
  const [enabled, setEnabled] = useState(store.get("map enabled"));
  const [zoom, setZoom] = useState(store.get("map zoom") || 15);

  useEffect(() => {
    console.log("GPS", { lat, lng });
    console.log("history", history);
    const { length } = history;
    if (
      length === 0 ||
      lng !== history[length - 1][0] ||
      lat !== history[length - 1][1]
    ) {
      const newHistory = [...history, [lng, lat]]
        .filter(([lng, lat]) => lat !== undefined && lng !== undefined)
        .slice(0, 1000);
      console.log("newHistory", newHistory);
      setHistory(newHistory);
      store.set("gps history", newHistory);
    }
  }, [lat, lng, history]);

  useEffect(() => {
    store.set("map enabled", enabled);
  }, [enabled]);

  useEffect(() => {
    store.set("map zoom", zoom);
  }, [zoom]);

  return (
    <div className={styles.mapContainer}>
      {editabled ? (
        <div className={styles.editor}>
          <Space size="small" align="center" gutter={8}>
            <Switch onChange={setEnabled} checked={enabled} />
            <Button onClick={() => setHistory([])}>清空</Button>
          </Space>
        </div>
      ) : null}
      {enabled && (
        <>
          <Slider
            className={styles.zoom}
            min={2}
            max={20}
            value={zoom}
            onChange={(v) => setZoom(v)}
          />
          <MapContainer
            className={styles.map}
            center={[lat, lng]}
            zoom={zoom}
            zoomControl={false}
          >
            <MapController center={[lat, lng]} zoom={zoom} setZoom={setZoom} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={[lat, lng]} icon={customIcon} />
            {history.length > 1 && (
              <Polyline
                positions={history.map(([lng, lat]) => [lat, lng])}
                color="blue"
                weight={3}
                opacity={0.5}
              />
            )}
          </MapContainer>
        </>
      )}
    </div>
  );
}
