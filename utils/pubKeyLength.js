const ensure64BytePublicKey = (publicKey) => {
  // Remove the '0x' prefix if it exists
  if (publicKey.startsWith('0x')) {
    publicKey = publicKey.slice(2);
  }

  // If the publicKey is 65 bytes long (130 hex characters), remove the first byte
  if (publicKey.length === 130) {
    publicKey = publicKey.slice(2);
  }

  // Check if the publicKey is now 64 bytes long (128 hex characters)
  if (publicKey.length !== 128) {
    throw new Error('Invalid public key length');
  }

  return '0x' + publicKey;
}

module.exports = ensure64BytePublicKey
