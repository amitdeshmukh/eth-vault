const crypto = require('crypto');
const { decryptWithPrivateKey } = require('./cryptoMethods');

const decryptData = async (encryptedData, iv, authTag, sharedKeyEncrypted, privateKey) => {
  try {
    // Decrypt the shared key using the private key
    const sharedKey = await decryptWithPrivateKey(privateKey, sharedKeyEncrypted);

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

module.exports = decryptData;