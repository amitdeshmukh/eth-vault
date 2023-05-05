const ethers = require('ethers');

// Verify a signature
const verifySignature = async (address, message, signature) => {
  const messageHash = ethers.utils.hashMessage(JSON.stringify(message));
  const recoveredAddress = ethers.utils.recoverAddress(messageHash, signature);
  return recoveredAddress === address;
}

module.exports = verifySignature;