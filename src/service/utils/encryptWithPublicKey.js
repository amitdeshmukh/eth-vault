const ECIES = require("eth-ecies");
const ensure64BytePublicKey = require('./ensure64BytePublicKey');

// Encrypt a message using the given public key
const encryptWithPublicKey = async (publicKey, message) => {
  // Ensure the public key is 64 bytes long
  const adjustedPublicKey = ensure64BytePublicKey(publicKey);
  const pubKeyBuffer = Buffer.from(adjustedPublicKey.split('0x')[1], "hex");
  const encryptedMessage = ECIES.encrypt(pubKeyBuffer, Buffer.from(message, 'utf8'));
  return encryptedMessage.toString("hex");
};

module.exports = encryptWithPublicKey;