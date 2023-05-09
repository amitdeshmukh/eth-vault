// Required dependencies
const crypto = require('crypto');
const { ethers } = require("ethers");
const { v5: uuidv5, v4: uuidv4 } = require('uuid');
const pubKeyToAddress = require('./utils/pubKeyToAddress');
const verifySignature = require('./utils/verifySignature');
const encryptWithPublicKey = require('./utils/encryptWithPublicKey');

// Validation
const {
  nameDescriptionSchema,
  addMemberMessageSchema,
  removeMemberMessageSchema,
  changeMemberRoleMessageSchema,
  storeDataMessageSchema,
  deleteVaultMessageSchema,
} = require('./validation');

// Storage
const LowDB = require('./storage/LowDB');
const InMemoryDB = require('./storage/InMemoryDB');

// Example UUIDv4 as a namespace
const NAMESPACE = process.env.NAMESPACE || uuidv4(); 

// Define the Vault class
class Vault {
  #vaultFile;
  #vaultId;
  #members;
  #ownerId;
  #db;

  // Initialize the Vault object with the file path and the owner's public key
  constructor(ownerPublicKey, name, description, storageType) {
    // Validate the name and description fields
    const { error } = nameDescriptionSchema.validate({ name, description });
    if (error) {
      throw new Error(`Invalid name or description: ${error.message}`);
    }
    
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
    const randomBytes = crypto.randomBytes(16);
    const salt = crypto.randomBytes(16);
    const derivedKey = crypto.scryptSync(randomBytes, salt, 32);

    const sharedKey = ethers.utils.hexlify(derivedKey).slice(2);

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
    const { error: addMemberError } = addMemberMessageSchema.validate(addMemberMessage);
    if (addMemberError) {
      throw new Error(`Invalid addMember message format`);
    }
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
    const { error: removeMemberError } = removeMemberMessageSchema.validate(removeMemberMessage);
    if (removeMemberError) {
      throw new Error('Invalid removeMember message format');
    }

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
    const { error: changeMemberRoleError } = changeMemberRoleMessageSchema.validate(changeMemberRoleMessage);
    if (changeMemberRoleError) {
      throw new Error('Invalid changeMemberRole message format');
    }

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

  // Get the Encrypted Shared Key for a member
  getEncryptedSharedKey(memberId) {
    if (this.#members[memberId]) {
      return this.#members[memberId].encryptedSharedKey;
    } else {
      return null;
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
  async storeData(memberId, storeDataMessage, storeDataSignature) {
    const { error: storeDataError } = storeDataMessageSchema.validate(storeDataMessage);
    if (storeDataError) {
      throw new Error(`Invalid storeData message format`);
    }
    
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
      this.#db.set('content', {
        timestamp: Date.now(),
        iv: storeDataMessage.iv,
        authTag: storeDataMessage.authTag,
        encryptedData: storeDataMessage.encryptedData
      });
    } catch(e) {
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
    const { error: deleteVaultError } = deleteVaultMessageSchema.validate(deleteVaultMessage);
    if (deleteVaultError) {
      throw new Error('Invalid deleteVault message format');
    }

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
