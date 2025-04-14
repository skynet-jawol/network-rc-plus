#!/bin/bash



VERSION_CODENAME=$(lsb_release -cs);
# 支持Bookworm和Buster系统
if [ "$VERSION_CODENAME" != "buster" ] && [ "$VERSION_CODENAME" != "bookworm" ]; then
    echo "只支持 buster 和 bookworm 系统"
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

read -p "使用Cloudflare Zero Trust隧道(yes/no, 默认 yes):" useCloudflare
useCloudflare=${useCloudflare:-yes}

echo useCloudflare: $useCloudflare

if [ "$useCloudflare" = "yes" ] || [ "$useCloudflare" = "y"  ]; then
  useCloudflare=true
  defaultTunnelName=$(cat /proc/sys/kernel/random/uuid | cut -c 1-8)
  read -p "隧道名称(默认 $defaultTunnelName):" tunnelName
  tunnelName=${tunnelName:-$defaultTunnelName}
else
  defaultCloudflareConfig="/home/pi/cloudflared-config.yml"
  read -p "Cloudflare隧道配置文件地址(默认 $defaultCloudflareConfig):" cloudflareConfig
  cloudflareConfig=${cloudflareConfig:-$defaultCloudflareConfig}
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
if [ $useCloudflare = true ]; then
  echo "Cloudflare隧道名称: $tunnelName"
  echo "安装完成后，Network RC将自动创建Cloudflare隧道并显示访问地址"
else
  echo "使用自定义Cloudflare隧道配置"
  echo "Cloudflare配置文件地址: $cloudflareConfig"
fi
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
  # 检测系统是否使用PipeWire
  if [ "$VERSION_CODENAME" = "bookworm" ]; then
    echo "检测到Bookworm系统，安装PipeWire相关依赖..."
    if sudo apt install ffmpeg pipewire pipewire-pulse wireplumber -y; then
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
      if sudo apt install ffmpeg pulseaudio -y; then
        echo "安装PulseAudio依赖成功"
      else
        echo "安装基础依赖失败"
        exit 1
      fi
    fi
  else
    # Buster系统使用PulseAudio
    if sudo apt install ffmpeg pulseaudio -y; then
      echo "安装基础依赖成功"
    else
      echo "安装基础依赖失败"
      exit 1
    fi
  fi

  echo "安装Cloudflare客户端..."
  if bash /home/pi/network-rc/lib/cloudflare/install-cloudflared.sh; then
    echo "安装Cloudflare客户端成功"
  else
    echo "安装Cloudflare客户端失败，但将继续安装Network RC"
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
  After=syslog.target network.target
  Wants=network.target

  [Service]
  User=pi
  Type=simple
  ExecStart=/home/pi/network-rc/node /home/pi/network-rc/index.js --cloudflareConfig \"$cloudflareConfig\" --password \"$password\" --tunnelName \"$tunnelName\" --localPort \"$localPort\"
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
  if [ $useCloudflare = true ]; then
    echo "Cloudflare隧道名称: $tunnelName"
    echo "Network RC 将在启动后自动创建Cloudflare隧道并显示访问地址"
    echo "您可以通过查看系统日志获取访问地址: sudo journalctl -u network-rc -f"
  else
    echo "Cloudflare配置文件地址: $cloudflareConfig"
  fi
  echo "Network RC 控制界面访问密码: $password"

else 
  exit 0
fi




