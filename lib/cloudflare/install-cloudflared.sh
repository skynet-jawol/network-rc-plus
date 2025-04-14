#!/bin/bash

# 检测系统架构
ARCH=$(uname -m)
case $ARCH in
    "armv7l")
        CLOUDFLARED_ARCH="arm"
        ;;
    "aarch64")
        CLOUDFLARED_ARCH="arm64"
        ;;
    "x86_64")
        CLOUDFLARED_ARCH="amd64"
        ;;
    *)
        echo "不支持的架构: $ARCH"
        exit 1
        ;;
esac

# 检查是否已安装cloudflared
if command -v cloudflared &> /dev/null; then
    echo "Cloudflared 已安装，版本："
    cloudflared --version
    exit 0
fi

echo "开始安装 Cloudflared..."

# 创建临时目录
TMP_DIR=$(mktemp -d)
cd $TMP_DIR

# 下载适合当前架构的cloudflared
CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CLOUDFLARED_ARCH}"
echo "下载 Cloudflared 从 $CLOUDFLARED_URL"

if wget -O cloudflared "$CLOUDFLARED_URL"; then
    echo "下载成功"
    
    # 添加执行权限
    chmod +x cloudflared
    
    # 移动到系统路径
    sudo mv cloudflared /usr/local/bin/
    
    # 验证安装
    if cloudflared --version; then
        echo "Cloudflared 安装成功"
    else
        echo "Cloudflared 安装失败"
        exit 1
    fi
else
    echo "下载失败"
    exit 1
fi

# 清理临时目录
cd ~
rm -rf $TMP_DIR

exit 0