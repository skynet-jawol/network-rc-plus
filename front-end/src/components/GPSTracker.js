import React, { useState, useEffect } from 'react';
import { Button, Card, Progress, Space, Input, List, Tag, message } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined, PlusOutlined } from '@ant-design/icons';
import { Map, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GPSTracker = ({ socket }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [markerInput, setMarkerInput] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [mapCenter, setMapCenter] = useState([0, 0]);

  useEffect(() => {
    if (socket) {
      socket.on('gps-point', handleGPSPoint);
      socket.on('track-loaded', handleTrackLoaded);
      socket.on('playback-progress', handlePlaybackProgress);
      loadTracks();
    }
    return () => {
      if (socket) {
        socket.off('gps-point');
        socket.off('track-loaded');
        socket.off('playback-progress');
      }
    };
  }, [socket]);

  const loadTracks = () => {
    socket.emit('load-tracks');
  };

  const handleGPSPoint = (point) => {
    if (currentTrack) {
      setCurrentTrack(prev => ({
        ...prev,
        points: [...prev.points, point]
      }));
      setMapCenter([point.lat, point.lng]);
    }
  };

  const handleTrackLoaded = (track) => {
    setSelectedTrack(track);
    if (track.points.length > 0) {
      setMapCenter([track.points[0].lat, track.points[0].lng]);
    }
  };

  const handlePlaybackProgress = ({ point, progress, markers }) => {
    setPlaybackProgress(progress * 100);
    setMapCenter([point.lat, point.lng]);
  };

  const startRecording = () => {
    socket.emit('start-recording');
    setIsRecording(true);
    setCurrentTrack({ points: [], markers: [] });
  };

  const stopRecording = () => {
    socket.emit('stop-recording');
    setIsRecording(false);
    setCurrentTrack(null);
    loadTracks();
  };

  const addMarker = () => {
    if (!markerInput) {
      message.warning('请输入标记内容');
      return;
    }
    socket.emit('add-marker', { description: markerInput });
    setMarkerInput('');
  };

  const startPlayback = (trackId) => {
    socket.emit('start-playback', { trackId });
    setIsPlaying(true);
  };

  const pausePlayback = () => {
    socket.emit('pause-playback');
    setIsPlaying(false);
  };

  const stopPlayback = () => {
    socket.emit('stop-playback');
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const handleSpeedChange = (speed) => {
    socket.emit('set-playback-speed', { speed });
    setPlaybackSpeed(speed);
  };

  const renderMap = () => {
    const track = selectedTrack || currentTrack;
    if (!track) return null;

    return (
      <Map center={mapCenter} zoom={15} style={{ height: '400px', width: '100%' }}>
        {track.points.map((point, index) => (
          <React.Fragment key={index}>
            <Marker position={[point.lat, point.lng]} />
            {index > 0 && (
              <Polyline
                positions={[
                  [track.points[index - 1].lat, track.points[index - 1].lng],
                  [point.lat, point.lng]
                ]}
                color="blue"
              />
            )}
          </React.Fragment>
        ))}
        {track.markers?.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={L.divIcon({
              html: `<div class="marker-label">${marker.description}</div>`,
              className: 'marker-label-container'
            })}
          />
        ))}
      </Map>
    );
  };

  return (
    <Card title="GPS轨迹记录与回放">
      <Space direction="vertical" style={{ width: '100%' }}>
        {renderMap()}

        <Space>
          {!isRecording ? (
            <Button type="primary" onClick={startRecording} icon={<PlayCircleOutlined />}>
              开始记录
            </Button>
          ) : (
            <Button danger onClick={stopRecording} icon={<StopOutlined />}>
              停止记录
            </Button>
          )}

          {isRecording && (
            <Space>
              <Input
                placeholder="输入标记内容"
                value={markerInput}
                onChange={(e) => setMarkerInput(e.target.value)}
                style={{ width: 200 }}
              />
              <Button onClick={addMarker} icon={<PlusOutlined />}>
                添加标记
              </Button>
            </Space>
          )}
        </Space>

        {selectedTrack && (
          <Card size="small" title="轨迹回放控制">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Progress percent={playbackProgress} />
              <Space>
                {!isPlaying ? (
                  <Button onClick={() => startPlayback(selectedTrack.id)} icon={<PlayCircleOutlined />}>
                    播放
                  </Button>
                ) : (
                  <Button onClick={pausePlayback} icon={<PauseCircleOutlined />}>
                    暂停
                  </Button>
                )}
                <Button onClick={stopPlayback} icon={<StopOutlined />}>
                  停止
                </Button>
                <Select
                  value={playbackSpeed}
                  onChange={handleSpeedChange}
                  style={{ width: 100 }}
                >
                  <Select.Option value={0.5}>0.5x</Select.Option>
                  <Select.Option value={1}>1.0x</Select.Option>
                  <Select.Option value={2}>2.0x</Select.Option>
                  <Select.Option value={4}>4.0x</Select.Option>
                </Select>
              </Space>
            </Space>
          </Card>
        )}

        <List
          header={<div>已保存的轨迹</div>}
          dataSource={tracks}
          renderItem={(track) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  onClick={() => setSelectedTrack(track)}
                >
                  查看
                </Button>
              ]}
            >
              <List.Item.Meta
                title={track.metadata.name}
                description={
                  <Space>
                    <Tag>距离: {(track.metadata.distance / 1000).toFixed(2)}km</Tag>
                    <Tag>时长: {Math.round(track.metadata.duration / 60)}分钟</Tag>
                    <Tag>标记: {track.markers.length}个</Tag>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
};

export default GPSTracker;