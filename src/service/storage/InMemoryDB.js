// In-memory storage implementation
const VaultStorage = require("./VaultStorage");

class InMemoryDB extends VaultStorage {
  constructor() {
    super();
    this.store = {};
  }

  async initialize() {
    this.store = { members: {}, content: {} };
  }

  async get(key) {
    return this.store[key];
  }

  async set(key, value) {
    this.store[key] = value;
  }

  async destroy() {
    this.store = null;
    console.log('InMemoryDB storage destroyed');
  }
}

module.exports = InMemoryDB;