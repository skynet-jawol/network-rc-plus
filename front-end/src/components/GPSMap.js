import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, Tooltip } from 'antd';
import { AimOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';

const GPSMap = ({ position, track, onTrackPlayback }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const positionMarker = useRef(null);
  const trackPolyline = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // 初始化地图
    const map = L.map(mapRef.current).setView([30.5928, 114.3055], 13);

    // 添加离线地图图层
    const offlineLayer = L.tileLayer('/maps/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
      errorTileUrl: '/maps/fallback.png'
    });

    // 添加在线地图图层（作为备用）
    const onlineLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    });

    // 添加图层控制
    const baseLayers = {
      '离线地图': offlineLayer,
      '在线地图': onlineLayer
    };

    L.control.layers(baseLayers).addTo(map);
    offlineLayer.addTo(map);

    // 创建位置标记
    positionMarker.current = L.marker([0, 0], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: '<div class="position-marker"></div>'
      })
    }).addTo(map);

    // 创建轨迹线
    trackPolyline.current = L.polyline([], {
      color: '#2196F3',
      weight: 3,
      opacity: 0.8
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (position && mapInstance.current) {
      const { latitude, longitude } = position;
      if (latitude && longitude) {
        // 更新位置标记
        positionMarker.current.setLatLng([latitude, longitude]);
        
        // 添加轨迹点
        const currentLatLng = [latitude, longitude];
        trackPolyline.current.addLatLng(currentLatLng);

        // 更新地图视图
        mapInstance.current.setView(currentLatLng);
      }
    }
  }, [position]);

  useEffect(() => {
    if (track && track.points.length > 0) {
      const points = track.points.map(p => [p.latitude, p.longitude]);
      trackPolyline.current.setLatLngs(points);
      mapInstance.current.fitBounds(trackPolyline.current.getBounds());
    }
  }, [track]);

  const handleCenterMap = () => {
    if (position && position.latitude && position.longitude) {
      mapInstance.current.setView([position.latitude, position.longitude], 15);
    }
  };

  const handlePlayback = () => {
    setIsPlaying(!isPlaying);
    onTrackPlayback && onTrackPlayback(!isPlaying);
  };

  return (
    <div className="gps-map">
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      <div className="map-controls">
        <Tooltip title="定位到当前位置">
          <Button
            type="primary"
            shape="circle"
            icon={<AimOutlined />}
            onClick={handleCenterMap}
          />
        </Tooltip>
        {track && (
          <Tooltip title={isPlaying ? '暂停回放' : '开始回放'}>
            <Button
              type="primary"
              shape="circle"
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handlePlayback}
            />
          </Button>
        </Tooltip>
        )}
      </div>

      <style jsx>{`
        .gps-map {
          position: relative;
          height: 500px;
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
        }

        .map-controls {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1000;
          display: flex;
          gap: 8px;
        }

        .position-marker {
          width: 16px;
          height: 16px;
          background-color: #1890ff;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
        }

        :global(.leaflet-container) {
          height: 100%;
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default GPSMap;