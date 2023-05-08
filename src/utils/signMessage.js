// Sign a message using a private key
const signMessage = async (privateKey, messageObject) => {
  const wallet = new ethers.Wallet(privateKey);
  const message = JSON.stringify(messageObject);
  const signature = await wallet.signMessage(message);
  return signature;
}

module.exports = signMessage;