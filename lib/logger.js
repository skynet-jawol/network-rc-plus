const winston = require("winston");

const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "warn";
};

const colors = {
  fatal: "red",
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "white",
  trace: "gray",
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const moduleInfo = info.module ? `[${info.module}] ` : '';
      const eventInfo = info.event ? `(${info.event}) ` : '';
      const deviceInfo = info.deviceId ? `<${info.deviceId}> ` : '';
      const extraInfo = info.data ? `\n${JSON.stringify(info.data, null, 2)}` : '';
      return `${info.timestamp} ${info.level}: ${moduleInfo}${eventInfo}${deviceInfo}${info.message}${extraInfo}`;
    }
  )
);

const LOG_DIR = process.env.NODE_ENV === 'development' ? './logs' : '/home/pi/.network-rc/logs';

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: `${LOG_DIR}/fatal.log`,
    level: "fatal",
  }),
  new winston.transports.File({
    filename: `${LOG_DIR}/error.log`,
    level: "error",
  }),
  new winston.transports.File({
    filename: `${LOG_DIR}/all.log`,
    maxsize: 10485760, // 10MB
    maxFiles: 30,
    tailable: true,
    zippedArchive: true
  }),
];

const Logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

global.logger = Logger;

module.exports = Logger;
