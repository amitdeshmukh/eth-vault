// LowDB implementation
const fs = require("fs");
const VaultStorage = require("./VaultStorage");

class LowDB extends VaultStorage {
  constructor(filename) {
    super();
    this.filename = filename;
  }

  async initialize() {
    const FileSync = require("lowdb/adapters/FileSync");
    const low = require("lowdb");
    const adapter = new FileSync(this.filename);
    this.db = low(adapter);
    this.db.defaults({ members: {}, content: {} }).write();
  }

  async get(key) {
    return this.db.get(key).value();
  }

  async set(key, value) {
    this.db.set(key, value).write();
  }

  async destroy() {
    try {
      fs.unlinkSync(this.filename);
      console.log('Vault file deleted successfully');
    } catch (err) {
      console.error(`Error deleting vault: ${err.message}`);
    }
  }
}

module.exports = LowDB;