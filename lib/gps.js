const EventEmitter = require('events');
const SerialPort = require('serialport');
const { parsers } = require('serialport');

class GPSService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      port: config.port || '/dev/ttyUSB0',
      baudRate: config.baudRate || 9600,
      updateInterval: config.updateInterval || 1000,
      ...config
    };
    this.position = {
      latitude: null,
      longitude: null,
      altitude: null,
      speed: null,
      satellites: 0,
      timestamp: null
    };
    this.connected = false;
    this.init();
  }

  init() {
    try {
      this.port = new SerialPort(this.config.port, {
        baudRate: this.config.baudRate
      });

      const parser = this.port.pipe(new parsers.Readline({ delimiter: '\r\n' }));

      this.port.on('open', () => {
        this.connected = true;
        this.emit('connected');
      });

      this.port.on('error', (error) => {
        this.connected = false;
        this.emit('error', error);
      });

      parser.on('data', (data) => {
        this.parseNMEA(data);
      });
    } catch (error) {
      this.emit('error', error);
    }
  }

  parseNMEA(data) {
    if (data.startsWith('$GPGGA')) {
      this.parseGPGGA(data);
    } else if (data.startsWith('$GPRMC')) {
      this.parseGPRMC(data);
    }
  }

  parseGPGGA(data) {
    const parts = data.split(',');
    if (parts.length >= 15) {
      const latitude = this.convertDMSToDD(parts[2], parts[3]);
      const longitude = this.convertDMSToDD(parts[4], parts[5]);
      const satellites = parseInt(parts[7]);
      const altitude = parseFloat(parts[9]);

      if (!isNaN(latitude) && !isNaN(longitude)) {
        this.position.latitude = latitude;
        this.position.longitude = longitude;
        this.position.altitude = altitude;
        this.position.satellites = satellites;
        this.position.timestamp = new Date();
        this.emit('position', this.position);
      }
    }
  }

  parseGPRMC(data) {
    const parts = data.split(',');
    if (parts.length >= 12) {
      const speed = parseFloat(parts[7]) * 1.852; // Convert knots to km/h
      if (!isNaN(speed)) {
        this.position.speed = speed;
        this.emit('speed', speed);
      }
    }
  }

  convertDMSToDD(coordinate, direction) {
    if (!coordinate || !direction) return null;

    const degrees = parseInt(coordinate.substring(0, 2));
    const minutes = parseFloat(coordinate.substring(2));
    let dd = degrees + minutes / 60;

    if (direction === 'S' || direction === 'W') {
      dd = -dd;
    }

    return dd;
  }

  getPosition() {
    return this.position;
  }

  isConnected() {
    return this.connected;
  }

  close() {
    if (this.port) {
      this.port.close();
      this.connected = false;
    }
  }
}

module.exports = GPSService;