const { ethers } = require("ethers");
const ECIES = require("eth-ecies");
const ensure64BytePublicKey = require('./pubKeyLength');

// Encrypt a message using the given public key
const encryptWithPublicKey = async (publicKey, message) => {
  // Ensure the public key is 64 bytes long
  const adjustedPublicKey = ensure64BytePublicKey(publicKey);
  const pubKeyBuffer = Buffer.from(adjustedPublicKey.split('0x')[1], "hex");
  const encryptedMessage = ECIES.encrypt(pubKeyBuffer, Buffer.from(message, 'utf8'));
  return encryptedMessage.toString("hex");
};

// Decrypt an encrypted message using the given private key
const decryptWithPrivateKey = async (privateKey, encryptedMessage) => {
  const encryptedBuffer = Buffer.from(encryptedMessage, "hex");
  const decryptedMessage = ECIES.decrypt(Buffer.from(privateKey.split('0x')[1], 'hex'), encryptedBuffer);
  return decryptedMessage.toString("utf8");
};

module.exports = {
  encryptWithPublicKey,
  decryptWithPrivateKey
};