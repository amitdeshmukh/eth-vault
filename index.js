// Import required dependencies
const fs = require('fs');
const crypto = require('crypto');
const { ethers } = require("ethers");
const { v5: uuidv5, v4: uuidv4, v4 } = require('uuid');
const pubKeyToAddress = require('./utils/computeAddress');
const verifySignature = require('./utils/verifySignature');
const { encryptWithPublicKey, decryptWithPrivateKey } = require('./utils/cryptoMethods');
const getVaultOwner = require('./utils/getVaultOwner');

// Example UUIDv4 as a namespace
const NAMESPACE = '7b44e4d4-7eae-4ff4-9a9b-2a2c8a51f6b9'; 

// Define the Vault class
class Vault {
  #vaultFile;
  #vaultId;
  #members;
  #ownerId;
  // Initialize the Vault object with the file path and the owner's public key
  constructor(ownerPublicKey, name, description) {
    this.#vaultId = uuidv4();
    this.#vaultFile = `${this.#vaultId}.json`;

    if (!fs.existsSync(this.#vaultFile)) {
      fs.writeFileSync(this.#vaultFile, '');
    }
    this.#members = {};

    fs.writeFileSync(this.#vaultFile, JSON.stringify({
      id: this.#vaultId,
      name: name,
      description: description,
    }, null, 2));
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
    return this.#ownerId;
  }

  // Add a member to the vault with the specified role and public key in message
  async addMember(requesterId, addMemberMessage, addMemberSignature) {
    console.log(this.#members)
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
      return true
    } else {
      console.log(`Member ID ${memberId} not found`);
      return false
    }
  }

  // Store encrypted data in the vault
  async storeData(memberId, privateKey, storeDataMessage, storeDataSignature) {
    const { address } = this.#members[memberId];
    const validSignature = await verifySignature(address, storeDataMessage, storeDataSignature);
    const memberRole = this.getMemberRole(memberId);

    if (!validSignature || !['Owner', 'Contributor'].includes(memberRole)) {
      throw new Error("Member doesn't have permission to store data");
    }

    if (!this.#members[memberId].encryptedSharedKey) {
      throw new Error('Member ID not found or access revoked');
    }

    try {
      const sharedKey = await decryptWithPrivateKey(privateKey, this.#members[memberId].encryptedSharedKey);
      const data = storeDataMessage.data;
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(sharedKey, 'hex'), iv);
      let encryptedData = cipher.update(data, 'utf8', 'hex');
      encryptedData += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      fs.writeFileSync(this.#vaultFile, JSON.stringify({
        timestamp: Date.now(),
        iv: iv.toString('hex'),
        authTag,
        encryptedData
      }, null, 2));
    } catch (e) {
      console.error('Failed to store encrypted data', e.message);
      throw(e);
    }
  };

  // Read encrypted data from the vault
  async readData(memberId, privateKey) {
    if (!this.#members[memberId].encryptedSharedKey) {
      throw new Error('Member ID not found or access revoked');
    }

    try {
      const sharedKey = await decryptWithPrivateKey(privateKey, this.#members[memberId].encryptedSharedKey);
      const { iv, authTag, encryptedData } = JSON.parse(fs.readFileSync(this.#vaultFile, 'utf8'));
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(sharedKey, 'hex'), Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
      decryptedData += decipher.final('utf8');
      return decryptedData;
    } catch (e) {
      console.error('Failed to read encrypted data', e.message);
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

    // Delete the vault file
    try {
      fs.unlinkSync(this.#vaultFile);
      console.log('Vault file deleted successfully');
    } catch (err) {
      console.error(`Error deleting vault: ${err.message}`);
    }
  }

}

module.exports = Vault;
