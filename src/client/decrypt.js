const crypto = require('crypto');
const ECIES = require("eth-ecies");

// Decrypt an encrypted message using the given private key
const decryptSharedKey = async (privateKey, encryptedMessage) => {
  const encryptedBuffer = Buffer.from(encryptedMessage, "hex");
  const decryptedMessage = ECIES.decrypt(Buffer.from(privateKey.split('0x')[1], 'hex'), encryptedBuffer);
  return decryptedMessage.toString("utf8");
};

// Decrypt data using the shared key, iv, and authTag
const decryptContent = async (encryptedData, iv, authTag, sharedKeyEncrypted, privateKey) => {
  try {
    // Decrypt the shared key using the private key
    const sharedKey = await decryptSharedKey(privateKey, sharedKeyEncrypted);

    // Decrypt the data using the shared key, iv, and authTag
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(sharedKey, 'hex'), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');

    return decryptedData;
  } catch (e) {
    console.error('Failed to decrypt data', e.message);
    throw(e);
  }
}

module.exports = {
  decryptSharedKey,
  decryptContent
};