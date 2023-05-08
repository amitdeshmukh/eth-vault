const { expect } = require("chai");
const { ethers } = require("ethers");
const Vault = require("../src/index");
const decryptData = require('../src/utils/decryptData');

// Generate a random wallet
const generateKeyPair = () => {
  const wallet = ethers.Wallet.createRandom();
  const privateKey = wallet.privateKey;
  const publicKey = wallet.publicKey;
  return { privateKey, publicKey };
};

// Sign a message using a private key
const signMessage = async (privateKey, messageObject) => {
  const wallet = new ethers.Wallet(privateKey);
  const message = JSON.stringify(messageObject);
  const signature = await wallet.signMessage(message);
  return signature;
};

describe("Vault", () => {
  let ownerKeys, contributorKeys, viewerKeys;
  let vault, ownerId, contributorId, viewerId;

  before(async () => {
    ownerKeys = generateKeyPair();
    contributorKeys = generateKeyPair();
    viewerKeys = generateKeyPair();
    vault = new Vault(ownerKeys.publicKey, "Test Vault", "A vault for testing purposes", "inmemory");
  });

  it("should create a new vault with the owner's public key", () => {
    ownerId = Object.keys(vault.getMembers())[0];
    const ownerPublicKey = vault.getMembers()[ownerId].publicKey;
    expect(ownerPublicKey).to.equal(ownerKeys.publicKey);
  });

  it("should allow the owner to add members with different roles", async () => {
    const addMemberMessage1 = {
      publicKey: contributorKeys.publicKey,
      role: "Contributor",
      action: "addMember"
    };
    const addMemberSignature1 = await signMessage(ownerKeys.privateKey, addMemberMessage1);
    contributorId = await vault.addMember(ownerId, addMemberMessage1, addMemberSignature1);

    const addMemberMessage2 = {
      publicKey: viewerKeys.publicKey,
      role: "Viewer",
      action: "addMember"
    };
    const addMemberSignature2 = await signMessage(ownerKeys.privateKey, addMemberMessage2);
    viewerId = await vault.addMember(ownerId, addMemberMessage2, addMemberSignature2);

    expect(vault.getMembers()[contributorId].role).to.equal("Contributor");
    expect(vault.getMembers()[viewerId].role).to.equal("Viewer");
  });

  it("should prevent non-owners from adding members", async () => {
    const newMemberKeys = generateKeyPair();
    const addMemberMessage = {
      publicKey: newMemberKeys.publicKey,
      role: "Viewer"
    };
    const addMemberSignature = await signMessage(viewerKeys.privateKey, addMemberMessage);
    let errorThrown = false;

    try {
      await vault.addMember(viewerId, addMemberMessage, addMemberSignature);
    } catch (e) {
      errorThrown = true;
    }

    expect(errorThrown).to.be.true;
  });

  it("should allow authorized users to successfully store and read encrypted data", async () => {
    const message = "This is a secret message.";
    const message2 = "This is another secret message.";

    const storeDataMessage = {
      action: "storeContent",
      content: message
    };
    const storeDataSignature = await signMessage(ownerKeys.privateKey, storeDataMessage);
    await vault.storeData(ownerId, ownerKeys.privateKey, storeDataMessage, storeDataSignature);

    let response = await vault.readData(contributorId);
    let content = response.content;
    let encryptedSharedKey = response.encryptedSharedKey;
    const decryptedData = await decryptData(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, contributorKeys.privateKey);

    expect(decryptedData).to.equal(message);

    const storeDataMessage2 = {
      action: "storeContent",
      content: message2
    };
    const storeDataSignature2 = await signMessage(contributorKeys.privateKey, storeDataMessage2);
    await vault.storeData(contributorId, contributorKeys.privateKey, storeDataMessage2, storeDataSignature2);

    response = await vault.readData(ownerId);
    content = response.content;
    encryptedSharedKey = response.encryptedSharedKey;

    const decryptedData2 = await decryptData(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, ownerKeys.privateKey);
    expect(decryptedData2).to.equal(message2);
  });

  it("should prevent unauthorized users from storing encrypted data", async () => {
    const message = "This is a secret message.";

    const storeDataMessage = {
      data: message
    };
    const storeDataSignature = await signMessage(viewerKeys.privateKey, storeDataMessage);

    let errorThrown = false;
    try {
      await vault.storeData(viewerId, viewerKeys.privateKey, storeDataMessage, storeDataSignature);
    } catch (e) {
      errorThrown = true;
    }
    expect(errorThrown).to.be.true;
  });

  it("should allow the owner to change a member's role", async () => {
    const changeMemberRoleMessage = {
      memberId: viewerId,
      role: "Contributor",
      action: "changeRole"
    };
    const changeMemberRoleSignature = await signMessage(ownerKeys.privateKey, changeMemberRoleMessage);
    await vault.changeMemberRole(ownerId, changeMemberRoleMessage, changeMemberRoleSignature);

    expect(vault.getMemberRole(viewerId)).to.equal("Contributor");
  });

  it("should allow the owner to remove a member", async () => {
    const removeMemberMessage = {
      action: "removeMember",
      memberId: viewerId
    };
    const removeMemberSignature = await signMessage(ownerKeys.privateKey, removeMemberMessage);
    await vault.removeMember(ownerId, removeMemberMessage, removeMemberSignature);

    expect(vault.getMemberRole(viewerId)).to.be.null;
  });

  it("should prevent unauthorized users from reading encrypted data", async () => {
    let errorThrown = false;
    try {
      await vault.readData(viewerId, viewerKeys.privateKey);
    } catch (e) {
      errorThrown = true;
    }
    expect(errorThrown).to.be.true;
  });

  it("should allow the owner to delete the vault", async () => {
    let errorThrown = false;
    const deleteVaultMessage = {
      action: "deleteVault"
    };
    const deleteVaultSignature = await signMessage(ownerKeys.privateKey, deleteVaultMessage);

    try {
      await vault.deleteVault(ownerId, deleteVaultMessage, deleteVaultSignature);
      // Check if the vault is successfully deleted
      const inMemoryDBData = await vault.readData(ownerId, ownerKeys.privateKey);
    } catch (e) {
      errorThrown = true;
    }
    expect(errorThrown).to.be.true;
  });

});

