const { EventEmitter } = require("events");
const { uuid } = require("uuidv4");
const { localSave, localGet, configDir } = require("./unit");
const sessionPath = `${configDir}/session.json`;

class Session extends EventEmitter {
  constructor() {
    super();
    this.list = localGet(sessionPath).sessionList || [];
  }

  add({ userType, sharedCode, endTime, ...other }) {
    const item = {
      createdTime: new Date().getTime(),
      id: uuid(),
      userType,
      sharedCode,
      endTime,
      ...other,
    };
    this.list.push(item);
    localSave(sessionPath, { sessionList: this.list });
    return item;
  }

  remove(id) {
    this.list = this.list.filter((i) => i.id !== id);
    localSave(sessionPath, { sessionList: this.list });
  }

  clearSharedCodeSession() {
    this.list = this.list.filter((i) => !i.sharedCode);
    localSave(sessionPath, { sessionList: this.list });
  }

  clearTimeoutSession() {
    this.list = this.list.filter(
      ({ endTime }) => !endTime || endTime > new Date().getTime()
    );
    localSave(sessionPath, { sessionList: this.list });
  }
}

module.exports = new Session();
