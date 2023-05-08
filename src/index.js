// Import required dependencies
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require("ethers");
const { v5: uuidv5, v4: uuidv4 } = require('uuid');
const pubKeyToAddress = require('./utils/computeAddress');
const verifySignature = require('./utils/verifySignature');
const { encryptWithPublicKey, decryptWithPrivateKey } = require('./utils/cryptoMethods');
const decryptData = require('./utils/decryptData');
const LowDB = require('./storage/LowDB');
const InMemoryDB = require('./storage/InMemoryDB');

// Example UUIDv4 as a namespace
const NAMESPACE = '7b44e4d4-7eae-4ff4-9a9b-2a2c8a51f6b9'; 

// Define the Vault class
class Vault {
  #vaultFile;
  #vaultId;
  #members;
  #ownerId;
  #db;

  // Initialize the Vault object with the file path and the owner's public key
  constructor(ownerPublicKey, name, description, storageType) {
    this.#vaultId = uuidv4();
    this.#vaultFile = `${this.#vaultId}.json`;
    
    // Initialize the storage
    switch (storageType) {
      case 'lowdb':
        this.#db = new LowDB(this.#vaultFile);
        break;
      case 'inmemory':
        this.#db = new InMemoryDB();
        break;
      default:
        this.#db = new InMemoryDB();
        break;
    }

    this.#db.initialize(this.#vaultFile);
    this.#db.set('id', this.#vaultId);
    this.#db.set('name', name);
    this.#db.set('description', description);

    this.#members = {};
    this.#addOwner(ownerPublicKey);
  }

  // Generate a shared key for all members and encrypt it using their public keys
  async #generateSharedKey() {
    const randomBytes = ethers.utils.randomBytes(32);
    const sharedKey = ethers.utils.hexlify(randomBytes).slice(2);

    for (const memberId in this.#members) {
      const publicKey = this.#members[memberId].publicKey;
      const encryptedSharedKey = await encryptWithPublicKey(
        publicKey,
        sharedKey
      );
      this.#members[memberId].encryptedSharedKey = encryptedSharedKey;
    }
  }

  // Add an owner to the vault
  async #addOwner(publicKey) {
    this.#ownerId = uuidv5(publicKey, NAMESPACE);
    this.#members[this.#ownerId] = { 
      role: 'Owner', 
      publicKey: publicKey,
      address: pubKeyToAddress(publicKey)
    };
    await this.#generateSharedKey();
    await this.#db.set('members', this.#members);

    return this.#ownerId;
  }

  // Add a member to the vault with the specified role and public key in message
  async addMember(requesterId, addMemberMessage, addMemberSignature) {
    const { address } = this.#members[requesterId];
    const validSignature = await verifySignature(address, addMemberMessage, addMemberSignature);
    if (!validSignature || this.getMemberRole(requesterId) !== 'Owner') {
      throw new Error('Only the owner can add members to the vault');
    }

    const memberId = uuidv5(addMemberMessage.publicKey, NAMESPACE)

    this.#members[memberId] = { 
      role: addMemberMessage.role, 
      publicKey: addMemberMessage.publicKey,
      address: pubKeyToAddress(addMemberMessage.publicKey)
    };
    await this.#generateSharedKey();
    await this.#db.set('members', this.#members);

    return memberId;
  }

  // Remove a member from the vault by their memberId
  async removeMember(requesterId, removeMemberMessage, removeMemberSignature) {
    const { address } = this.#members[requesterId];
    const validSignature = await verifySignature(address, removeMemberMessage, removeMemberSignature);

    if (!validSignature || this.getMemberRole(requesterId) !== 'Owner') {
      throw new Error('Only the owner can remove members from the vault');
    }

    const memberId = removeMemberMessage.memberId;
    if (this.#members[memberId]) {
      delete this.#members[memberId];
      await this.#generateSharedKey();
      await this.#db.set('members', this.#members);

      return true
    } else {
      console.log(`Member ID ${memberId} not found`);
      return false
    }
  }

  // Change the role of a member
  async changeMemberRole(requesterId, changeMemberRoleMessage, changeMemberRoleSignature) {
    const { address } = this.#members[requesterId];
    const validSignature = await verifySignature(address, changeMemberRoleMessage, changeMemberRoleSignature);

    if (!validSignature || this.getMemberRole(requesterId) !== 'Owner') {
      throw new Error('Only the owner can change member roles');
    }

    const memberId = changeMemberRoleMessage.memberId;
    const newRole = changeMemberRoleMessage.role;
    if (this.#members[memberId]) {
      this.#members[memberId].role = newRole;
      await this.#db.set('members', this.#members);
      return true
    } else {
      console.log(`Member ID ${memberId} not found`);
      return false
    }
  }
  
  // Get a list of vault owners
  getOwners() {
    const owners = [];
    for (const memberId in this.#members) {
      if (this.#members[memberId].role === 'Owner') {
        owners.push({ 
          memberId: memberId,
          publicKey: this.#members[memberId].publicKey,
          address: this.#members[memberId].address
         });
      }
    }
    return owners;
  }

  // Get all members of the vault
  getMembers() {
    if (this.#members) {
      return this.#members;
    } else {
      return null;
    }
  }

  // Get the role of a member by their memberId
  getMemberRole(memberId) {
    if (this.#members[memberId]) {
      return this.#members[memberId].role;
    } else {
      return null;
    }
  }

  // Store encrypted data in the vault
  async storeData(memberId, privateKey, storeDataMessage, storeDataSignature) {
    const { address } = this.#members[memberId];
    const validSignature = await verifySignature(address, storeDataMessage, storeDataSignature);
    const memberRole = this.getMemberRole(memberId);

    if (!validSignature || !['Owner', 'Contributor'].includes(memberRole)) {
      throw new Error("Member doesn't have permission to store content");
    }

    if (!this.#members[memberId].encryptedSharedKey) {
      throw new Error('Member ID not found or access revoked');
    }

    try {
      const sharedKey = await decryptWithPrivateKey(privateKey, this.#members[memberId].encryptedSharedKey);
      const content = storeDataMessage.content;
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(sharedKey, 'hex'), iv);
      let encryptedData = cipher.update(content, 'utf8', 'hex');
      encryptedData += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      await this.#db.set('content', {
        timestamp: Date.now(),
        iv: iv.toString('hex'),
        authTag,
        encryptedData
      });

    } catch (e) {
      console.error('Failed to store encrypted content', e.message);
      throw(e);
    }
  };

  // Read encrypted data from the vault
  async readData(memberId) {
    if (!this.#members[memberId].encryptedSharedKey) {
      throw new Error('Member ID not found or access revoked');
    }

    try {
      const content = await this.#db.get('content');
      return {
        content: content,
        encryptedSharedKey: this.#members[memberId].encryptedSharedKey
      }
    } catch (e) {
      console.error('Failed to read encrypted content', e.message);
      throw(e);
    }
  };

  async deleteVault(requesterId, deleteVaultMessage, deleteVaultSignature) {
    if (!this.#members[requesterId]) {
      throw new Error('Member not found or access revoked');
    }
    const { address } = this.#members[requesterId];
    const validSignature = await verifySignature(address, deleteVaultMessage, deleteVaultSignature);
    if (!validSignature) {
      throw new Error('Invalid signature');
    }

    if (deleteVaultMessage.action !== 'deleteVault') {
      throw new Error('Invalid message action');
    }

    if (this.getMemberRole(requesterId) !== 'Owner') {
      throw new Error('Only an Owner can delete the vault');
    }

    try {
      await this.#db.destroy();
      return true;
    } catch (e) {
      console.error('Failed to delete vault', e.message);
      throw(e);
    }
  }

}

module.exports = Vault;
