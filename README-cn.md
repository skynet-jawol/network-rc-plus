# 树莓派网络遥控车软件 Network RC

[English](./README.md) | [文档](https://network-rc.esonwong.com)

Network RC 是运行在树莓派和浏览器上的网络遥控车软件。具备以下特性：

- 低延迟控制和网络图传
- 通道自定义（27 个 高低电平或者 PWM 通道）
- 支持多摄像头，自适应传输分辨率
- 支持触屏操作、游戏手柄、枪控、板控
- 支持实时语音收听和语音喊话/语音对讲
- 支持 Cloudflare Tunnel/FRP 远程访问
- GPS 定位和轨迹记录
- 完整的日志系统
- 系统语音播报和音频播放
- 远程分享控制
- 4G网络下的WebRTC优化

## 依赖

- ffmpeg: 运行前请确保树莓派上安装了 ffmpeg，安装方法 `sudo apt install ffmpeg -y`
- pulseaudio: `sudo apt install pulseaudio -y`
- GPS工具: `sudo apt install gpsd gpsd-clients -y`
- SQLite: `sudo apt install sqlite3 -y`
- nodejs

## 安装

```bash
bash <(curl -sL https://download.esonwong.com/network-rc/install.sh)
```

## 使用教程

- 改装 RC 遥控车
  - 视频教程: [4G 网络 RC 遥控车 02 - DIY 网络控制改造教程](https://www.bilibili.com/video/BV1iK4y1r7mD)
  - 图文教程: [WiFi 网络遥控车制作教程](https://blog.esonwong.com/WiFi-4G-5G-%E7%BD%91%E7%BB%9C%E9%81%A5%E6%8E%A7%E8%BD%A6%E5%88%B6%E4%BD%9C%E6%95%99%E7%A8%8B/)
- 4G 远程控制
  - 视频教程：[4G 5G 网络 RC 遥控车 03 - 无限距离远程遥控？](https://www.bilibili.com/video/BV1Xp4y1X7fa)
  - 图文教程：[网络遥控车互联网控制教程](https://blog.esonwong.com/%E7%BD%91%E7%BB%9C%E9%81%A5%E6%8E%A7%E8%BD%A6%E4%BA%92%E8%81%94%E7%BD%91%E6%8E%A7%E5%88%B6%E6%95%99%E7%A8%8B/)

## 代码贡献指引

```bash
git clone https://github.com/esonwong/network-rc.git
cd network-rc/front-end
yarn # or npm install
yarn build # or npm run build
cd ..
yarn # or npm install
sudo node index.js
```

打开 `http://[你的树莓派 ip 地址]:8080`

## 使用

```bash
# 基本使用
node index.js

# 设置密码
node index.js -p password

# 启用网络穿透
node index.js -f -o 9088 --tsl
```

## 功能
- 支持 Cloudflare Tunnel 远程访问
- 支持 WebRTC 音视频传输
- 支持 PWA
- 支持语音播报
- 支持 GPS 定位
- 支持自定义通道
- 支持自定义 UI
- 支持分享控制链接
- 支持自动刹车
- 支持电压检测
- 支持自动更新

## 更新日志
- [x] 添加 GPS 功能
- [x] 添加电压检测功能
- [x] 添加自动更新功能
- [x] 添加自动刹车功能
- [x] 添加分享控制链接功能
- [x] 添加自定义通道功能
- [x] 添加自定义 UI 功能
- [x] 添加语音播报功能
- [x] 添加 PWA 功能
- [x] 添加 WebRTC 音视频传输功能
- [x] 添加 Cloudflare Tunnel 远程访问功能

## 致谢
- Cloudflare - 提供免费的 Tunnel 服务

# 自定义网络穿透服务器
node index.js -f -o 9088
```

## 接线图

![GPIO](./gpio.jpg)

## 树莓派软件下载

- <https://download.esonwong.com/network-rc>

## ToDo

- [ ] ♻️ 重写控制器代码
  - [ ] 设计设置界面
  - [ ] 设计首页
  - [ ] hook
  - [ ] provider
  - [ ] router
  - [ ] jest
  - [ ] api
- [ ] 🔢 分享排队系统
  - [ ] 流程设计
  - [ ] 数据逻辑
  - [ ] UI 实现
  - [ ] test
- [ ] 音频上传
- [x] 设置麦克风灵敏度
- [x] 摄像头 bug
- [x] 一键安装脚本
- [x] 添加远程获取 frps 配置的功能
- [x] 自定义通道
- [x] 修复云台舵机的卡顿
- [x] 保存车子运行的相关状态
- [x] 检测摄像头分辨率
- [x] 修复摄像头数量检测错误
- [x] 播放手机端录制的音频
- [x] 支持自定义证书
- [x] frp 运行添加 user 参数
- [x] ~~替换播放声音的程序~~
- [x] 更新支持者列表
- [x] 添加摄像头画面重置按钮
- [x] 更新内置 frp 配置
- [x] 为本人提供的 frp 服务启用 https
- [x] 网络连接响应时间超过 500 毫秒自动刹车
- [x] ping 值显示
- [x] 支持手柄
- [x] 网络穿透
- [x] Ai 控制(暂时移除)
- [x] 支持车辆麦克风
- [x] ~~使用 webrtc 点对点音视频控制信号传输~~（延迟高已弃用）
- [x] ~~使用 MSE~~ (延迟高已弃用）)
- [x] 支持多摄像头
  - [x] 编辑/锁定状态
  - [x] 检测摄像头数量

## 社群

### 微信群

交流请移步微信群，入群方法添加微信 `EsonWong_` 备注 `Network RC`

## 捐赠

![微信赞赏吗](https://blog.esonwong.com/asset/wechat-donate.jpg)

## 链接

- [作者 B 站主页](https://space.bilibili.com/96740361)

## Credits

- [ws-avc-player](https://github.com/matijagaspar/ws-avc-player)
- [@clusterws/cws](https://github.com/ClusterWS/cWS)
- [rpio](https://github.com/jperkin/node-rpio)
- [rpio-pwm](https://github.com/xinkaiwang/rpio-pwm)
- [xf-tts-socket](https://github.com/jimuyouyou/xf-tts-socket)
- Eson Wong - 提供免费的 frp 服务器
