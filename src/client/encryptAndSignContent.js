const { decryptSharedKey } = require('./decrypt');
const signMessage = require('./utils/signMessage');
const encryptWithSharedKey = require('./utils/encryptWithSharedKey');

const encryptAndSignContent = async (msg, privateKey, sharedKeyEncrypted) => {
  const sharedKey = await decryptSharedKey(privateKey, sharedKeyEncrypted);
  // Encrypt the data with the shared key
  const storeDataMessage = await encryptWithSharedKey(msg, sharedKey)
  // Sign the message object with the owner's private key
  const storeDataSignature = await signMessage(privateKey, storeDataMessage);
  
  return {
    storeDataMessage,
    storeDataSignature
  };
};

module.exports = encryptAndSignContent;