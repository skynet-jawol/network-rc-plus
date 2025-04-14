# Cloudflare Zero Trust 和 GPS 功能使用指南

本文档将指导您如何在Network RC项目中配置和使用Cloudflare Zero Trust隧道和GPS功能。

## 目录

- [Cloudflare Zero Trust 配置](#cloudflare-zero-trust-配置)
  - [创建Cloudflare账户](#创建cloudflare账户)
  - [设置Zero Trust隧道](#设置zero-trust隧道)
  - [配置Network RC使用Cloudflare](#配置network-rc使用cloudflare)
- [GPS功能配置](#gps功能配置)
  - [硬件连接](#硬件连接)
  - [软件配置](#软件配置)
  - [使用GPS功能](#使用gps功能)
- [常见问题](#常见问题)

## Cloudflare Zero Trust 配置

Cloudflare Zero Trust可以让您安全地从任何地方访问您的Network RC设备，无需公网IP或复杂的网络配置。

### 创建Cloudflare账户

1. 访问[Cloudflare官网](https://www.cloudflare.com/)注册账户
2. 登录后，进入[Zero Trust控制台](https://dash.teams.cloudflare.com/)

### 设置Zero Trust隧道

1. 在Zero Trust控制台中，选择左侧菜单的「Access」→「Tunnels」
2. 点击「Create a tunnel」按钮创建新隧道
3. 为隧道命名（例如：network-rc）并点击「Save tunnel」
4. 在「Install connector」页面，选择「Linux」→「ARM」
5. 系统会提供安装命令和配置文件，记录下这些信息
6. 下载隧道凭证文件（.json格式）

### 配置Network RC使用Cloudflare

1. 在树莓派上创建Cloudflare配置文件：

```bash
sudo nano /home/pi/cloudflared.yml
```

2. 添加以下内容（替换相应的值）：

```yaml
tunnel: <your-tunnel-id>
credentials-file: /home/pi/.cloudflared/<your-tunnel-id>.json
ingress:
  - hostname: <your-hostname>
    service: http://localhost:8080
  - service: http_status:404
```

3. 将下载的凭证文件上传到树莓派的`/home/pi/.cloudflared/`目录

4. 使用新的安装脚本安装Network RC，选择Cloudflare连接方式：

```bash
bash <(curl -sL https://download.esonwong.com/network-rc/install_with_cloudflare.sh)
```

5. 安装过程中选择「3: Cloudflare Zero Trust」作为连接方式

6. 安装完成后，您可以通过您在Cloudflare中配置的域名访问Network RC

## GPS功能配置

GPS功能允许您追踪和记录Network RC设备的位置信息。

### 硬件连接

1. 准备一个兼容的GPS模块（如NEO-6M、NEO-7M等）
2. 将GPS模块连接到树莓派：
   - VCC连接到树莓派的5V或3.3V（取决于您的GPS模块）
   - GND连接到树莓派的GND
   - TX连接到树莓派的RX (GPIO15)
   - RX连接到树莓派的TX (GPIO14)

### 软件配置

1. 使用新的安装脚本安装Network RC，启用GPS功能：

```bash
bash <(curl -sL https://download.esonwong.com/network-rc/install_with_cloudflare.sh)
```

2. 安装过程中选择「yes」启用GPS功能

3. 如果您的GPS设备不是连接到默认的`/dev/ttyAMA0`，需要修改配置：

```bash
sudo nano /etc/systemd/system/network-rc.service
```

找到ExecStart行，添加`--gpsDevice "/dev/ttyXXX"`参数（替换为您的设备路径）

4. 重启服务：

```bash
sudo systemctl daemon-reload
sudo systemctl restart network-rc.service
```

### 使用GPS功能

1. 登录Network RC控制界面
2. 在设置页面中找到「GPS配置」部分
3. 设置刷新频率和精度阈值
4. 点击「开始追踪」按钮启用GPS追踪
5. 在控制界面中可以看到地图显示当前位置和历史轨迹

## 常见问题

### Cloudflare隧道连接问题

**问题**: Cloudflare隧道无法连接

**解决方案**:
- 检查凭证文件是否正确放置
- 确认配置文件中的隧道ID是否正确
- 查看Network RC日志：`sudo journalctl -u network-rc.service`

### GPS无法获取位置

**问题**: GPS功能已启用但无法获取位置

**解决方案**:
- 确认GPS模块连接正确
- 将GPS天线放置在室外或靠近窗户处
- 检查GPS设备路径是否正确
- 使用`gpsmon`命令测试GPS设备是否正常工作

### 位置精度不高

**问题**: GPS位置不准确

**解决方案**:
- 确保GPS天线有良好的天空视野
- 增加GPS刷新间隔，给模块更多时间获取精确位置
- 调整精度阈值设置

---

如有更多问题，请访问[Network RC项目主页](https://github.com/esonwong/network-rc)或提交Issue。