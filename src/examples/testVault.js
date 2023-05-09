const Vault = require ("../service/index"); 
const ethers = require("ethers");
const { decryptSharedKey, decryptContent } = require('../client/decrypt');
const encryptAndSignContent = require('../client/encryptAndSignContent');
const updateMember = require('../client/updateMember');

// Generate an Ethereum key pair
const generateKeyPair = () => {
  const wallet = ethers.Wallet.createRandom();
  console.log(wallet.address);
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
}

// Code for testing the Vault class
const main = async () => {
  // Generate user key pairs
  const ownerKeys = generateKeyPair();
  const contributorKeys = generateKeyPair();
  const viewerKeys = generateKeyPair();
  const user4Keys = generateKeyPair();

  // Create a file vault
  const vault = new Vault(ownerKeys.publicKey, 'Test Vault', 'A vault for testing', 'lowdb');

  // Add members to the vault with different roles
  const ownerId = await vault.getOwners()[0].memberId;
  let addMemberMessage = {
    action: "addMember",
    role: "Contributor",
    publicKey: contributorKeys.publicKey
  };
  // Call the addMember function and re-encrypt the vault content
  const contributorId = await updateMember(vault, addMemberMessage, ownerId, ownerKeys.privateKey);
  
  addMemberMessage = {
    action: "addMember",
    role: "Viewer",
    publicKey: viewerKeys.publicKey
  };
  // Call the addMember function and re-encrypt the vault content
  const viewerId = await updateMember(vault, addMemberMessage, ownerId, ownerKeys.privateKey);

  try {
    addMemberMessage = {
      action: "addMember",
      role: "Owner",
      publicKey: user4Keys.publicKey
    };
    // Call the addMember function and re-encrypt the vault content
    const user4Id = await updateMember(vault, addMemberMessage, user4Id, user4Keys.privateKey);
    console.log("Adding User 4 was successful, but it shouldn't be.");
  } catch (e) {
    console.log("\nAdding User 4 as Owner failed as expected.");
  }

  // Store data in the vault
  const msg = 'Secret content from Owner';
  // Obtain the shared key for the vault
  let sharedKeyEncrypted = await vault.getEncryptedSharedKey(ownerId);
  // Encrypt and store data in the vault
  let r = await encryptAndSignContent(msg, ownerKeys.privateKey, sharedKeyEncrypted)
  await vault.storeData(ownerId, r.storeDataMessage, r.storeDataSignature);

  // Read data from the vault
  let response = await vault.readData(ownerId);
  let content = response.content;
  let encryptedSharedKey = response.encryptedSharedKey;
  let decryptedDataUser1 = await decryptContent(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, ownerKeys.privateKey);
  await console.log(`\nDecrypted data (Owner): ${decryptedDataUser1}`);

  response = await vault.readData(contributorId);
  content = response.content;
  encryptedSharedKey = response.encryptedSharedKey;
  let decryptedDataUser2 = await decryptContent(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, contributorKeys.privateKey);
  await console.log(`Decrypted data (Contributor): ${decryptedDataUser2}`);

  response = await vault.readData(viewerId);
  content = response.content;
  encryptedSharedKey = response.encryptedSharedKey;
  let decryptedDataUser3 = await decryptContent(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, viewerKeys.privateKey);
  await console.log(`Decrypted data (Viewer): ${decryptedDataUser3}`);

  // Remove a member from the vault
  let removeMemberMessage = {
    action: "removeMember",
    memberId: viewerId
  };

  // Call the addMember function and re-encrypt the vault content
  let status = await updateMember(vault, removeMemberMessage, ownerId, ownerKeys.privateKey);
  if (status) {
    console.log("\nRemoved Viewer from the vault");
  } else {
    console.log("Failed to remove Viewer from the vault");
  }

  // Try to read data from the vault (should fail for Viewer)
  try {
    response = await vault.readData(viewerId);
    content = response.content;
    encryptedSharedKey = response.encryptedSharedKey;
    decryptedDataUser3 = await decryptContent(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, viewerKeys.privateKey);
    await console.log(`Decrypted data (Viewer): ${decryptedDataUser3}`);
    console.log("Decryption successful for Viewer, but it shouldn't be.");
  } catch (e) {
    console.error("\nDecryption of old data failed for Viewer, as expected.", e.message);
  }

  // Try to read data from the vault (should succeed for Contributor)
  try {
    response = await vault.readData(contributorId);
    content = response.content;
    encryptedSharedKey = response.encryptedSharedKey;
    decryptedDataUser2 = await decryptContent(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, contributorKeys.privateKey);
    await console.log(`Decrypted data (Contributor): ${decryptedDataUser2}`);
    console.log("Decryption successful for Contributor.");
  } catch (e) {
    console.error("\nDecryption of old data failed for Contributor.", e.message);
  }


  // Store new data in the vault
  const newMsg = `In the heart of a serene and enchanted forest, a family of curious squirrels busied themselves collecting acorns for the upcoming winter. The sun's golden rays filtered through the lush canopy, casting dappled patterns on the verdant moss below. A nearby brook babbled softly, providing a soothing soundtrack as a gentle breeze rustled the leaves overhead. The forest was alive with the harmonious symphony of nature, a peaceful haven where time seemed to slow down, and the world's worries ceased to exist.`;
  // Obtain the shared key for the vault
  sharedKeyEncrypted = await vault.getEncryptedSharedKey(contributorId);
  // Encrypt and store data in the vault
  r = await encryptAndSignContent(newMsg, contributorKeys.privateKey, sharedKeyEncrypted)
  await vault.storeData(contributorId, r.storeDataMessage, r.storeDataSignature);
 
  // Read new data from the vault
  response = await vault.readData(ownerId);
  
  content = response.content;
  encryptedSharedKey = response.encryptedSharedKey;

  decryptedDataUser1 = await decryptContent(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, ownerKeys.privateKey);
  console.log(`\nNew decrypted data (Owner): ${decryptedDataUser1}`);

  response = await vault.readData(contributorId);
  content = response.content;
  encryptedSharedKey = response.encryptedSharedKey;
  decryptedDataUser2 = await decryptContent(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, contributorKeys.privateKey);
  console.log(`\nNew decrypted data (Contributor): ${decryptedDataUser2}`);

  // Try to read new data from the vault (should still fail for Viewer)
  try {
    response = await vault.readData(viewerId);
    content = response.content;
    encryptedSharedKey = response.encryptedSharedKey;
    decryptedDataUser3 = await decryptContent(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, viewerKeys.privateKey);
    console.log("Decryption successful for Viewer, but it shouldn't be.");
  } catch (e) {
    console.log("\nDecryption of new data failed for Viewer, as expected.");
  }

  // Test deleting the vault (should fail for non-Owner)
  try {
    let deleteVaultMessage = {
      action: 'deleteVault'
    };
    let deleteVaultSignature = await signMessage(contributorKeys.privateKey, deleteVaultMessage);
    await vault.deleteVault(ownerId, deleteVaultMessage, deleteVaultSignature);
    console.log('Vault deletion successful for Contributor, but it shouldn\'t be.');
  } catch (e) {
    console.log('\nVault deletion failed for Contributor, as expected.');
  }

  // Test deleting the vault (should succeed for Owner)
  try {
    let deleteVaultMessage = {
      action: 'deleteVault'
    };
    let deleteVaultSignature = await signMessage(ownerKeys.privateKey, deleteVaultMessage);
    await vault.deleteVault(ownerId, deleteVaultMessage, deleteVaultSignature);
    console.log('Vault deletion successful for Owner.');
  } catch (e) {
    console.log('Vault deletion failed for Owner, but it shouldn\'t.');
    console.log(e.message)
  }

};

main();
