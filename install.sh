#!/bin/bash

VERSION_CODENAME=$(lsb_release -cs);
if [ "$VERSION_CODENAME" != "buster" ]; then
    echo "只支持 buster 系统"
    exit 1
fi

if test "$NETWORK_RC_BETA" = "1"; then
  echo '安装 Beta 版'
fi

if test "$NETWORK_RC_VERSION" = ""; then
  echo '安装最新版本'
  DOWNLOAD_LINK='https://download.esonwong.com/network-rc/network-rc.tar.gz'
else
  echo '开始安装 Network RC 版本: '$NETWORK_RC_VERSION
  DOWNLOAD_LINK="https://download.esonwong.com/network-rc/network-rc-${NETWORK_RC_VERSION}.tar.gz"
fi

read -p "Cloudflare Token:" cfToken
if [ -z "$cfToken" ]; then
  echo "Cloudflare Token 不能为空"
  exit 1
fi

read -p "是否启用 GPS 功能(yes/no, 默认 no):" enableGPS
enableGPS=${enableGPS:-no}

if [ "$enableGPS" = "yes" ] || [ "$enableGPS" = "y"  ]; then
  read -p "GPS 设备端口(默认 /dev/ttyUSB0):" gpsPort
  gpsPort=${gpsPort:-/dev/ttyUSB0}
  read -p "GPS 波特率(默认 9600):" gpsBaudRate
  gpsBaudRate=${gpsBaudRate:-9600}
fi

read -p "Network RC 密码(默认 networkrc):" password
password=${password:-networkrc}

read -p "本地端口(默认 8080):" localPort
localPort=${localPort:-8080}

echo ""
echo ""
echo ""
echo "你的设置如下"
echo "----------------------------------------"
echo "Network RC 控制界面访问密码: $password"
echo "本地端口: $localPort"
echo ""
echo ""
echo ""

read -p "输入 ok 继续安装， 输入其他结束:" ok
echo "$ok"

if [ "$ok" = "ok" ]; then
  echo ""
  echo ""
  echo ""
  if sudo apt update; then
    echo "apt update 成功"
  else
    echo "apt update 失败"
    exit 1
  fi

  echo "安装依赖..."
  if sudo apt install ffmpeg pulseaudio gpsd gpsd-clients sqlite3 -y; then
    echo "安装依赖成功"
  else
    echo "安装依赖失败"
    exit 1
  fi

  echo ""
  echo ""
  echo ""
  sudo rm -f /tmp/network-rc.tar.gz
  if test "$NETWORK_RC_BETA" = "1"; then
    echo "下载 Network RC beta 版本"
    if wget -O /tmp/network-rc.tar.gz https://download.esonwong.com/network-rc/network-rc-beta.tar.gz; then
      echo "下载成功"
    else
      echo "下载失败"
      exit 1
    fi 
  else
    echo "下载 Network RC"
    if wget -O /tmp/network-rc.tar.gz $DOWNLOAD_LINK; then
      echo "下载成功"
    else
      echo "下载失败"
      exit 1
    fi
  fi

  echo ""
  echo ""
  echo ""
  echo "解压 Network RC 中..."
  tar -zxf /tmp/network-rc.tar.gz -C /home/pi/

  echo ""
  echo ""
  echo ""
  echo "安装 Network RC 服务"

  echo "[Unit]
  Description=network-rc
  After=syslog.target  network.target
  Wants=network.target

  [Service]
  User=pi
  Type=simple
  Environment=\"CLOUDFLARE_TOKEN=$cfToken\"
  Environment=\"GPS_PORT=$gpsPort\"
  Environment=\"GPS_BAUD_RATE=$gpsBaudRate\"
  ExecStart=/home/pi/network-rc/node /home/pi/network-rc/index.js --password \"$password\" --localPort \"$localPort\" --enableGPS \"$enableGPS\"
  Restart=always
  RestartSec=15s

  [Install]
  WantedBy=multi-user.target" | sudo tee /etc/systemd/system/network-rc.service

  echo ""
  echo ""
  echo "创建 Network RC 服务完成"

  sudo systemctl enable network-rc.service
  echo "重启 Network RC 服务"
  sudo systemctl restart network-rc.service

  echo ""
  echo ""
  echo ""
  echo "安装完成"
  echo "Network RC 控制界面访问密码: $password"
else 
  exit 0
fi




