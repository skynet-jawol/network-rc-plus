const logger = require("../lib/logger");
const pwm = require("rpio-pwm");
const rpio = require("rpio");
const split = require("split");
rpio.init({ mapping: "gpio" });

const status = {};

let refresh = 50, // 频率
  stepNum = 1000, // 精度
  pwmPinMap = {},
  switchPinList = [],
  pwmCh;

const cycleTimeUs = (1000 / refresh) * 1000, // 周期时长 20000us
  stepTimeUs = cycleTimeUs / stepNum; // 单步时长  40us

/**
 * 初始化PWM通道
 * @param {Number} refresh PWM 频率
 * @returns undefined
 */
const initPwmCh = () => {
  if (pwmCh) return;
  logger.info("初始化 PWM 通道");

  steeringPWMCfg = {
    cycle_time_us: cycleTimeUs,
    step_time_us: stepTimeUs,
    delay_hw: 1, // 0 会有刺耳噪音
  };

  pwmCh = pwm.create_dma_channel(
    pwm.host_is_model_pi4() ? 5 : 12,
    steeringPWMCfg
  );
};

function initPin(pinBoardCode = 12) {
  if (!pwmCh) {
    initPwmCh();
  }
  return pwmCh.create_pwm(pinBoardCode);
}

/**
 * 设置空占比
 * @param {Number} pin
 * @param {Number} round 空占比 0 ～ 100
 */
function setRound(pin, round) {
  pin.set_width((round / 100) * stepNum);
}

function changePwmPin(pin, v) {
  pin = parseInt(pin);
  v = Number(v);
  logger.info(`Change PWM channel: ${pin}, value: ${v}`);
  status[pin] = v;
  // process.stdout.write(JSON.stringify(status));
  if (!pwmPinMap[pin]) {
    pwmPinMap[pin] = initPin(pin);
  }
  if (v == 0) {
    setRound(pwmPinMap[pin], 7.5);
  } else {
    setRound(pwmPinMap[pin], v * 2.5 + 7.5);
  }
}

function listen(pin) {
  pin = parseInt(pin);
  gpio.on("change", function (channel, value) {
    if (channel === pin) {
      logger.info(`GPIO channel change: ${channel}, value: ${value}`);
      process.stdout.write(
        "gpio-change|" + JSON.stringify({ pin: pinBoardCode, value })
      );
    }
  });
  gpio.setup(pin, gpio.DIR_IN, gpio.EDGE_BOTH);
}

function readPin(pin) {
  pinBoardCode = parseInt(pinBoardCode);
  rpio.setup(pinBoardCode, rpio.INPUT);
  rpio.read(pinBoardCode, function (err, value) {
    if (err) {
      logger.error(`Read pin ${pinBoardCode} error: ${err}`);
    } else {
      process.stdout.write(
        "gpio-change|" + JSON.stringify({ pin: pinBoardCode, value })
      );
    }
  });
}

function changeSwitchPin(pinBoardCode, enabled) {
  pinBoardCode = parseInt(pinBoardCode);
  enabled = JSON.parse(enabled);
  logger.info(`Change Switch channel: ${pinBoardCode}, value: ${enabled}`);
  status[pinBoardCode] = enabled;
  // process.stdout.write(JSON.stringify(status));
  if (!switchPinList.includes(pinBoardCode)) {
    switchPinList.push(pinBoardCode);
  }
  if (enabled) {
    rpio.open(pinBoardCode, rpio.OUTPUT, rpio.HIGH);
  } else {
    rpio.open(pinBoardCode, rpio.OUTPUT, rpio.LOW);
  }
}

const closeChannel = function () {
  logger.info("Close GPIO channel");
  Object.keys(pwmPinMap).forEach((pin) => {
    changePwmPin(pin, 0);
    pwmPinMap[pin].release();
  });

  switchPinList.forEach((pin) => {
    changeSwitchPin(pin, false);
    rpio.close(pin);
  });
  pwmPinMap = {};
  switchPinList = [];
};

rpio.on("change", (pin, value) => {
  logger.info(`GPIO ${pin} changed to ${value}`);
  process.stdout.write("gpio-change|" + JSON.stringify({ pin, value }));
});

process.stdin.pipe(split()).on("data", (data) => {
  logger.info(`Receive data: ${data}\n`);
  const [type, pin, v] = data.toString().split(" ");
  try {
    switch (type) {
      case "listen":
        listen(pin);
      case "pwm":
        changePwmPin(pin, v);
        break;
      case "sw":
        changeSwitchPin(pin, v);
        break;
      case "close":
        closeChannel();
        break;
      case "exit":
        process.exit(0);
      default:
        break;
    }
  } catch (error) {
    logger.error(error);
    process.stderr.write(error);
  }
});

process.on("exit", () => {
  closeChannel();
  logger.error("gpio server exit");
});

process.on("disconnect", () => {
  logger.error("gpio server disconnect");
  process.exit(0);
});
