#!/bin/bash

VERSION_CODENAME=$(lsb_release -cs);
if [[ "$VERSION_CODENAME" != "bookworm" && "$VERSION_CODENAME" != "bullseye" && "$VERSION_CODENAME" != "buster" ]]; then
    echo "仅支持buster、bullseye和bookworm系统"
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

# 检查是否在CI环境中运行
if [ "$CI" = "true" ]; then
  echo "在CI环境中运行，使用非交互模式"
  useCloudflare=${USE_CLOUDFLARE:-yes}
  cloudflareConfig=${CLOUDFLARE_CONFIG:-"/home/pi/cloudflared.yml"}
else
  # 选择连接方式
  read -p "是否使用Cloudflare Zero Trust连接 (输入 yes 继续，其他退出): " useCloudflare
  useCloudflare=${useCloudflare:-yes}

  if [ "$useCloudflare" != "yes" ]; then
    echo "安装已终止"
    exit 1
  fi

  read -p "Cloudflare 配置文件地址(默认 /home/pi/cloudflared.yml): " cloudflareConfig
  cloudflareConfig=${cloudflareConfig:-"/home/pi/cloudflared.yml"}
fi

# 检查是否已安装cloudflared
if ! command -v cloudflared &> /dev/null; then
  echo "未检测到cloudflared，将为您安装..."
  curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb
  sudo dpkg -i cloudflared.deb
  rm cloudflared.deb
fi

# 在CI环境中使用环境变量，否则使用交互式输入
if [ "$CI" = "true" ]; then
  connectionType=${CONNECTION_TYPE:-3}
  echo "使用连接方式: $connectionType"
else
  read -p "使用连接方式 (1: 内置frp服务器, 2: 自定义frp服务器, 3: Cloudflare Zero Trust, 默认: 1): " connectionType
  connectionType=${connectionType:-1}
fi

# 根据连接方式设置参数
if [ "$connectionType" = "1" ]; then
  defaultFrp=true
  defaultSubDomain=$(cat /proc/sys/kernel/random/uuid | cut -c 1-4)
  read -p "域名前缀(默认 $defaultSubDomain): " subDomain
  subDomain=${subDomain:-$defaultSubDomain}
  cloudflareEnabled=false
elif [ "$connectionType" = "2" ]; then
  defaultFrp=false
  defaultFrpcConfig="/home/pi/frpc.ini"
  read -p "frpc 配置文件地址(默认 $defaultFrpcConfig): " frpcConfig
  frpcConfig=${frpcConfig:-$defaultFrpcConfig}
  cloudflareEnabled=false
elif [ "$connectionType" = "3" ]; then
  defaultFrp=false
  cloudflareEnabled=true
  read -p "Cloudflare 配置文件地址(默认 /home/pi/cloudflared.yml): " cloudflareConfig
  cloudflareConfig=${cloudflareConfig:-"/home/pi/cloudflared.yml"}
  
  # 检查是否已安装cloudflared
  if ! command -v cloudflared &> /dev/null; then
    echo "未检测到cloudflared，将为您安装..."
    # 下载并安装cloudflared
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb
    sudo dpkg -i cloudflared.deb
    rm cloudflared.deb
  fi
else
  echo "无效的选择，使用默认选项(内置frp服务器)"
  defaultFrp=true
  defaultSubDomain=$(cat /proc/sys/kernel/random/uuid | cut -c 1-4)
  read -p "域名前缀(默认 $defaultSubDomain): " subDomain
  subDomain=${subDomain:-$defaultSubDomain}
  cloudflareEnabled=false
fi

# GPS功能配置（独立于连接方式）
if [ "$CI" = "true" ]; then
  enableGPS=${ENABLE_GPS:-no}
  echo "GPS功能设置: $enableGPS"
else
  read -p "是否启用GPS功能 (yes/no, 默认 no): " enableGPS
  enableGPS=${enableGPS:-no}
fi

gpsEnabled=false
if [ "$enableGPS" = "yes" ] || [ "$enableGPS" = "y" ]; then
  gpsEnabled=true
  echo "将启用GPS功能"
  
  # 安装GPS依赖（始终安装）
  if ! command -v gpsd &> /dev/null; then
    echo "安装GPS依赖..."
    sudo apt install -y gpsd gpsd-clients
  fi
fi

if [ "$CI" = "true" ]; then
  password=${PASSWORD:-networkrc}
  localPort=${LOCAL_PORT:-8080}
  echo "Network RC 密码: $password"
  echo "本地端口: $localPort"
else
  read -p "Network RC 密码(默认 networkrc): " password
  password=${password:-networkrc}

  read -p "本地端口(默认 8080): " localPort
  localPort=${localPort:-8080}
fi

echo ""
echo ""
echo ""
echo "你的设置如下"
echo "----------------------------------------"
echo "连接方式: Cloudflare Zero Trust"
echo "Cloudflare 配置文件地址: $cloudflareConfig"
echo "请确保已正确配置Cloudflare隧道"

if [ "$gpsEnabled" = "true" ]; then
  echo "GPS功能: 已启用"
else
  echo "GPS功能: 未启用"
fi

echo "Network RC 控制界面访问密码: $password"
echo "本地端口: $localPort"
echo ""
echo ""
echo ""

if [ "$CI" = "true" ]; then
  ok="ok"
  echo "CI环境中自动确认安装"
else
  read -p "输入 ok 继续安装， 输入其他结束: " ok
  echo "$ok"
fi

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
  # 检查系统版本，针对Bookworm系统做特殊处理
  if [ "$VERSION_CODENAME" = "bookworm" ]; then
    echo "检测到Bookworm系统，使用替代wiringpi方案"
    # Bookworm系统上wiringpi已被移除，使用替代方案
    if sudo apt install ffmpeg pulseaudio libcamera-dev libgps-dev -y; then
      echo "安装基础依赖成功"
      # 安装wiringpi替代方案
      if ! command -v gpio &> /dev/null; then
        echo "安装wiringpi替代方案..."
        cd /tmp
        git clone https://github.com/WiringPi/WiringPi
        cd WiringPi
        ./build
        cd /tmp
        rm -rf WiringPi
      fi
    else
      echo "安装基础依赖失败"
      exit 1
    fi
  else
    # 对于Bullseye和Buster系统，使用原有的安装方式
    if sudo apt install ffmpeg pulseaudio libcamera-dev libgps-dev wiringpi -y; then
      echo "安装基础依赖成功"
    else
      echo "安装基础依赖失败"
      exit 1
    fi
  fi
  
  # 安装GPS相关依赖
  if [ "$gpsEnabled" = "true" ]; then
    if sudo apt install -y gpsd gpsd-clients; then
      echo "安装GPS依赖成功"
      # 配置GPS设备
      echo "配置GPS设备..."
      sudo systemctl stop gpsd.socket
      sudo systemctl disable gpsd.socket
      sudo gpsd /dev/ttyAMA0 -F /var/run/gpsd.sock
    else
      echo "安装GPS依赖失败"
      exit 1
    fi
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
  
  # 根据连接方式生成不同的服务配置
  if [ "$connectionType" = "1" ]; then
    # 内置frp服务器
    SERVICE_CONFIG="ExecStart=/home/pi/network-rc/node /home/pi/network-rc/index.js --password \"$password\" --subDomain \"$subDomain\" --localPort \"$localPort\""
  elif [ "$connectionType" = "2" ]; then
    # 自定义frp服务器
    SERVICE_CONFIG="ExecStart=/home/pi/network-rc/node /home/pi/network-rc/index.js --frpConfig \"$frpcConfig\" --password \"$password\" --localPort \"$localPort\""
  elif [ "$connectionType" = "3" ]; then
    # Cloudflare Zero Trust
    SERVICE_CONFIG="ExecStart=/home/pi/network-rc/node /home/pi/network-rc/index.js --cloudflareConfig \"$cloudflareConfig\" --password \"$password\" --localPort \"$localPort\""
  fi
  
  # 添加GPS参数
  if [ "$gpsEnabled" = "true" ]; then
    SERVICE_CONFIG="$SERVICE_CONFIG --enableGPS"
  fi

  echo "[Unit]
  Description=network-rc
  After=syslog.target network.target
  Wants=network.target

  [Service]
  User=pi
  Type=simple
  $SERVICE_CONFIG
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
  
  if [ "$connectionType" = "3" ]; then
    echo ""
    echo "Cloudflare Zero Trust 配置说明:"
    echo "1. 请确保已在Cloudflare Zero Trust控制台创建了隧道"
    echo "2. 下载隧道配置文件并保存到 $cloudflareConfig"
    echo "3. 配置文件格式示例:"
    echo "tunnel: <your-tunnel-id>"
    echo "credentials-file: /home/pi/.cloudflared/<your-tunnel-id>.json"
    echo "ingress:"
    echo "  - hostname: <your-hostname>"
    echo "    service: http://localhost:$localPort"
    echo "  - service: http_status:404"
  fi
  
  if [ "$gpsEnabled" = "true" ]; then
    echo ""
    echo "GPS功能配置说明:"
    echo "1. 请确保GPS设备已正确连接到树莓派"
    echo "2. 默认使用/dev/ttyAMA0作为GPS设备，如需更改请修改gpsd配置"
    echo "3. 可以通过前端界面的GPS配置页面调整GPS参数"
  fi
else
  echo "安装已取消"
  exit 1
fi