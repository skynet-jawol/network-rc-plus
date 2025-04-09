const EventEmitter = require('events');

class GPSParser extends EventEmitter {
  constructor() {
    super();
    this.validationRules = {
      checksum: true,
      minSatellites: 3,
      maxHDOP: 5.0
    };
  }

  parseNMEA(data) {
    if (!this.validateChecksum(data)) {
      this.emit('error', { type: 'checksum', message: '校验和错误', data });
      return null;
    }

    const messageType = data.substring(1, 6);
    switch (messageType) {
      case 'GPGGA':
        return this.parseGPGGA(data);
      case 'GPRMC':
        return this.parseGPRMC(data);
      case 'GPGSA':
        return this.parseGPGSA(data);
      case 'GPGSV':
        return this.parseGPGSV(data);
      default:
        return null;
    }
  }

  parseGPGGA(data) {
    const parts = data.split(',');
    if (parts.length < 15) return null;

    const result = {
      type: 'GGA',
      time: this.parseTime(parts[1]),
      latitude: this.convertDMSToDD(parts[2], parts[3]),
      longitude: this.convertDMSToDD(parts[4], parts[5]),
      quality: parseInt(parts[6]),
      satellites: parseInt(parts[7]),
      hdop: parseFloat(parts[8]),
      altitude: parseFloat(parts[9]),
      altitudeUnit: parts[10],
      geoidSeparation: parseFloat(parts[11]),
      geoidUnit: parts[12],
      timestamp: new Date()
    };

    if (this.validatePosition(result)) {
      this.emit('gga', result);
      return result;
    }
    return null;
  }

  parseGPRMC(data) {
    const parts = data.split(',');
    if (parts.length < 12) return null;

    const result = {
      type: 'RMC',
      time: this.parseTime(parts[1]),
      status: parts[2],
      latitude: this.convertDMSToDD(parts[3], parts[4]),
      longitude: this.convertDMSToDD(parts[5], parts[6]),
      speed: this.convertSpeed(parts[7]),
      course: parseFloat(parts[8]),
      date: this.parseDate(parts[9]),
      magneticVariation: parseFloat(parts[10]),
      timestamp: new Date()
    };

    if (this.validatePosition(result)) {
      this.emit('rmc', result);
      return result;
    }
    return null;
  }

  parseGPGSA(data) {
    const parts = data.split(',');
    if (parts.length < 18) return null;

    const result = {
      type: 'GSA',
      mode: parts[1],
      fixType: parseInt(parts[2]),
      satellites: parts.slice(3, 15).map(s => s ? parseInt(s) : null).filter(Boolean),
      pdop: parseFloat(parts[15]),
      hdop: parseFloat(parts[16]),
      vdop: parseFloat(parts[17]),
      timestamp: new Date()
    };

    this.emit('gsa', result);
    return result;
  }

  parseGPGSV(data) {
    const parts = data.split(',');
    if (parts.length < 8) return null;

    const result = {
      type: 'GSV',
      totalMessages: parseInt(parts[1]),
      messageNumber: parseInt(parts[2]),
      satellitesInView: parseInt(parts[3]),
      satellites: [],
      timestamp: new Date()
    };

    // 解析卫星信息
    for (let i = 4; i < parts.length - 4; i += 4) {
      if (parts[i]) {
        result.satellites.push({
          prn: parseInt(parts[i]),
          elevation: parseInt(parts[i + 1]),
          azimuth: parseInt(parts[i + 2]),
          snr: parseInt(parts[i + 3])
        });
      }
    }

    this.emit('gsv', result);
    return result;
  }

  validateChecksum(data) {
    const parts = data.split('*');
    if (parts.length !== 2) return false;

    const calculated = this.calculateChecksum(parts[0]);
    const received = parseInt(parts[1], 16);
    return calculated === received;
  }

  calculateChecksum(data) {
    let checksum = 0;
    for (let i = 1; i < data.length; i++) {
      checksum ^= data.charCodeAt(i);
    }
    return checksum;
  }

  validatePosition(data) {
    if (!data.latitude || !data.longitude) return false;
    if (data.satellites && data.satellites < this.validationRules.minSatellites) return false;
    if (data.hdop && data.hdop > this.validationRules.maxHDOP) return false;
    return true;
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

  convertSpeed(speed) {
    if (!speed) return null;
    return parseFloat(speed) * 1.852; // 将节转换为千米/小时
  }

  parseTime(time) {
    if (!time || time.length !== 6) return null;
    return {
      hours: parseInt(time.substring(0, 2)),
      minutes: parseInt(time.substring(2, 4)),
      seconds: parseInt(time.substring(4, 6))
    };
  }

  parseDate(date) {
    if (!date || date.length !== 6) return null;
    return {
      day: parseInt(date.substring(0, 2)),
      month: parseInt(date.substring(2, 4)),
      year: 2000 + parseInt(date.substring(4, 6))
    };
  }

  setValidationRules(rules) {
    this.validationRules = { ...this.validationRules, ...rules };
  }
}

module.exports = GPSParser;