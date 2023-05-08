const { utils } = require('ethers');

const pubKeyToAddress = (publicKey) => {
  // Ensure the public key is in compressed format (without '04' prefix)
  if (publicKey.startsWith('04')) {
    publicKey = publicKey.slice(2);
  }

  // Compute the Ethereum address from the public key
  const address = utils.computeAddress(publicKey);
  return address;
}

module.exports = pubKeyToAddress