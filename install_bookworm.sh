#!/bin/bash

# Network RC 树莓派 Bookworm 系统一键安装脚本
# 支持 Cloudflare Zero Trust 隧道和 GPS 功能

# 检查系统版本
VERSION_CODENAME=$(lsb_release -cs);
if [ "$VERSION_CODENAME" != "bookworm" ]; then
    echo "此脚本专为 Bookworm 系统设计，当前系统为: $VERSION_CODENAME"
    echo "如果您使用的是 Buster 或 Bullseye 系统，请使用其他安装脚本"
    exit 1
fi

# 检查是否以root用户运行
if [ "$(id -u)" = "0" ]; then
    echo "请不要以root用户运行此脚本"
    exit 1
fi

# 检查是否在CI环境中运行
if [ "$CI" = "true" ]; then
    echo "在CI环境中运行，使用非交互模式"
    useCloudflare=${USE_CLOUDFLARE:-yes}
    enableGPS=${ENABLE_GPS:-no}
    password=${PASSWORD:-networkrc}
    localPort=${LOCAL_PORT:-8080}
    NETWORK_RC_VERSION=${NETWORK_RC_VERSION:-""}
    NETWORK_RC_BETA=${NETWORK_RC_BETA:-""}
    cloudflareConfig=${CLOUDFLARE_CONFIG:-"/home/pi/cloudflared.yml"}
    nonInteractive=true
else
    nonInteractive=false
fi

# 版本信息
if [ "$NETWORK_RC_BETA" = "1" ]; then
    echo '安装 Beta 版'
fi

if [ "$NETWORK_RC_VERSION" = "" ]; then
    echo '安装最新版本'
    DOWNLOAD_LINK='https://download.esonwong.com/network-rc/network-rc.tar.gz'
else
    echo '开始安装 Network RC 版本: '$NETWORK_RC_VERSION
    DOWNLOAD_LINK="https://download.esonwong.com/network-rc/network-rc-${NETWORK_RC_VERSION}.tar.gz"
fi

# 用户交互配置
if [ "$nonInteractive" = "false" ]; then
    echo "欢迎使用 Network RC Bookworm 系统一键安装脚本"
    echo "此脚本将帮助您在树莓派 Bookworm 系统上安装 Network RC"
    echo "包含 Cloudflare Zero Trust 隧道和 GPS 功能支持"
    echo ""
    
    # Cloudflare 配置
    read -p "是否使用Cloudflare Zero Trust隧道 (yes/no, 默认 yes): " useCloudflare
    useCloudflare=${useCloudflare:-yes}
    
    if [ "$useCloudflare" = "yes" ] || [ "$useCloudflare" = "y" ]; then
        useCloudflare=true
        defaultTunnelName=$(cat /proc/sys/kernel/random/uuid | cut -c 1-8)
        read -p "隧道名称(默认 $defaultTunnelName): " tunnelName
        tunnelName=${tunnelName:-$defaultTunnelName}
    else
        useCloudflare=false
        defaultCloudflareConfig="/home/pi/cloudflared.yml"
        read -p "Cloudflare隧道配置文件地址(默认 $defaultCloudflareConfig): " cloudflareConfig
        cloudflareConfig=${cloudflareConfig:-$defaultCloudflareConfig}
    fi
    
    # GPS 配置
    read -p "是否启用GPS功能 (yes/no, 默认 no): " enableGPS
    enableGPS=${enableGPS:-no}
    
    if [ "$enableGPS" = "yes" ] || [ "$enableGPS" = "y" ]; then
        enableGPS=true
        echo "将启用GPS功能"
    else
        enableGPS=false
    fi
    
    # 基本配置
    read -p "Network RC 密码(默认 networkrc): " password
    password=${password:-networkrc}
    
    read -p "本地端口(默认 8080): " localPort
    localPort=${localPort:-8080}
fi

# 显示配置信息
echo ""
echo ""
echo "你的设置如下"
echo "----------------------------------------"
if [ "$useCloudflare" = true ]; then
    echo "连接方式: Cloudflare Zero Trust"
    echo "Cloudflare隧道名称: $tunnelName"
    echo "安装完成后，Network RC将自动创建Cloudflare隧道并显示访问地址"
else
    echo "连接方式: Cloudflare Zero Trust (自定义配置)"
    echo "Cloudflare配置文件地址: $cloudflareConfig"
    echo "请确保已正确配置Cloudflare隧道"
fi

if [ "$enableGPS" = true ]; then
    echo "GPS功能: 已启用"
else
    echo "GPS功能: 未启用"
fi

echo "Network RC 控制界面访问密码: $password"
echo "本地端口: $localPort"
echo ""
echo ""

# 确认安装
if [ "$nonInteractive" = "false" ]; then
    read -p "输入 ok 继续安装， 输入其他结束: " ok
    echo "$ok"
    
    if [ "$ok" != "ok" ]; then
        echo "安装已取消"
        exit 0
    fi
else
    ok="ok"
    echo "CI环境中自动确认安装"
fi

# 开始安装
echo ""
echo ""
echo "开始安装 Network RC..."

# 更新软件包列表
if sudo apt update; then
    echo "apt update 成功"
else
    echo "apt update 失败"
    exit 1
fi

# 安装依赖
echo "安装依赖..."
echo "检测到Bookworm系统，安装PipeWire相关依赖..."
if sudo apt install ffmpeg pipewire pipewire-pulse wireplumber git nodejs npm libcamera-dev -y; then
    echo "安装PipeWire依赖成功"
    # 检查PipeWire服务状态
    if systemctl --user is-active pipewire.service > /dev/null 2>&1; then
        echo "PipeWire服务已运行"
    else
        echo "启动PipeWire服务..."
        systemctl --user enable --now pipewire.service pipewire-pulse.service
    fi
else
    echo "安装PipeWire依赖失败，尝试安装PulseAudio..."
    if sudo apt install ffmpeg pulseaudio git nodejs npm libcamera-dev -y; then
        echo "安装PulseAudio依赖成功"
    else
        echo "安装基础依赖失败"
        exit 1
    fi
fi

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

# 安装GPS依赖（如果启用）
if [ "$enableGPS" = true ]; then
    echo "安装GPS依赖..."
    if sudo apt install -y gpsd gpsd-clients libgps-dev; then
        echo "GPS依赖安装成功"
    else
        echo "GPS依赖安装失败"
        exit 1
    fi
fi

# 安装Cloudflare（如果使用）
if [ "$useCloudflare" = true ] || [ -n "$cloudflareConfig" ]; then
    # 检查是否已安装cloudflared
    if ! command -v cloudflared &> /dev/null; then
        echo "安装Cloudflare客户端..."
        # 下载并安装cloudflared
        curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
        sudo dpkg -i cloudflared.deb
        rm cloudflared.deb
        
        if ! command -v cloudflared &> /dev/null; then
            echo "尝试安装ARM版本..."
            curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb
            sudo dpkg -i cloudflared.deb
            rm cloudflared.deb
        fi
    fi
fi

# 下载Network RC
echo "下载Network RC..."
cd ~
wget -O network-rc.tar.gz $DOWNLOAD_LINK
if [ $? -ne 0 ]; then
    echo "下载Network RC失败"
    exit 1
fi

# 解压Network RC
echo "解压Network RC..."
mkdir -p network-rc
tar -xzf network-rc.tar.gz -C network-rc
cd network-rc

# 安装Node.js依赖
echo "安装Node.js依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "安装Node.js依赖失败"
    exit 1
fi

# 创建配置文件
echo "创建配置文件..."
cat > config.json << EOF
{
  "password": "$password",
  "port": $localPort,
  "cloudflare": {
    "enabled": $useCloudflare,
    "tunnelName": "$tunnelName",
    "configPath": "$cloudflareConfig"
  },
  "gps": {
    "enabled": $enableGPS,
    "devicePath": "/dev/ttyAMA0",
    "baudRate": 9600,
    "updateFrequency": 1000
  }
}
EOF

# 创建systemd服务
echo "创建systemd服务..."
cat > network-rc.service << EOF
[Unit]
Description=Network RC Service
After=network.target

[Service]
ExecStart=/usr/bin/node /home/pi/network-rc/index.js
WorkingDirectory=/home/pi/network-rc
StandardOutput=inherit
StandardError=inherit
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
EOF

sudo mv network-rc.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable network-rc.service

# 启动服务
echo "启动Network RC服务..."
sudo systemctl start network-rc.service

# 清理临时文件
cd ~
rm network-rc.tar.gz

# 显示安装完成信息
echo ""
echo ""
echo "Network RC 安装完成！"
echo "----------------------------------------"
echo "本地访问地址: http://localhost:$localPort"
echo "本地网络访问地址: http://$(hostname -I | awk '{print $1}'):$localPort"
echo "密码: $password"

if [ "$useCloudflare" = true ]; then
    echo ""
    echo "Cloudflare隧道正在创建中，请稍候..."
    echo "隧道创建完成后，您可以通过以下命令查看隧道状态："
    echo "sudo systemctl status network-rc.service"
    echo "或查看日志："
    echo "sudo journalctl -u network-rc.service -f"
fi

if [ "$enableGPS" = true ]; then
    echo ""
    echo "GPS功能已启用"
    echo "请确保GPS设备已正确连接到树莓派"
    echo "默认设备路径: /dev/ttyAMA0，波特率: 9600"
    echo "如需修改GPS配置，请编辑: ~/network-rc/config.json"
fi

echo ""
echo "如需重启Network RC服务，请运行："
echo "sudo systemctl restart network-rc.service"
echo ""
echo "安装完成！"