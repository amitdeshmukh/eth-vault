class VaultStorage {
  async initialize() {
    throw new Error("Not implemented");
  }

  async get(key) {
    throw new Error("Not implemented");
  }

  async set(key, value) {
    throw new Error("Not implemented");
  }
}

module.exports = VaultStorage;