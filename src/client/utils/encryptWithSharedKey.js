const crypto = require('crypto');

const encryptWithSharedKey = async (data, sharedKey) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(sharedKey, 'hex'), iv);
  let encryptedData = cipher.update(data, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    action: "storeContent",
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encryptedData,
  };
}

module.exports = encryptWithSharedKey;