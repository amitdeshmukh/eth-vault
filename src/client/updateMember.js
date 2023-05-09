//////////////////////////////////////////////////////////////////////////////////////////
// This function is called by Owner when a member is added or removed from the vault.
// The following steps are performed:
//
// 1. Read vault content. If null, return.
// 2. Retrieve the encrypted shared key from the vault
// 3. Decrypt the encrypted shared key using the owner's private key
// 4. Decrypt the vault content using the shared key
// 5. Add or remove the member from the vault
// 6. Retrieve the new encrypted shared key from the vault
// 7. Re-encrypt the vault content using the new shared key
//
//////////////////////////////////////////////////////////////////////////////////////////

const signMessage = require('./utils/signMessage');
const { decryptSharedKey, decryptContent } = require('./decrypt');
const encryptAndSignContent = require('./encryptAndSignContent');

const updateMember = async(vault, updateMemberMessage, ownerId, ownerPrivateKey) => {
  let newMemberId = null;
  let decryptedContent = null;
  let removeMemberStatus = false;

  // 1. Read vault content.
  let response = await vault.readData(ownerId);
  const content = response.content;

  // 2. Retrieve the encrypted shared key from the vault
  const encryptedSharedKey = response.encryptedSharedKey;

  // 3. Decrypt the encrypted shared key using the owner's private key
  // const sharedKeyOld = await decryptSharedKey(ownerPrivateKey, encryptedSharedKey);

  // 4. Decrypt the vault content using the shared key
  if (!(content === null || Object.keys(content).length === 0)) { // Empty content
    decryptedContent = await decryptContent(content.encryptedData, content.iv, content.authTag, encryptedSharedKey, ownerPrivateKey);
  }

  // 5. Add or remove the member from the vault
  const updateMemberSignature = await signMessage(ownerPrivateKey, updateMemberMessage);
  switch (updateMemberMessage.action) {
    case 'addMember':
      newMemberId = await vault.addMember(ownerId, updateMemberMessage, updateMemberSignature);
      break;
    case 'removeMember':
      removeMemberStatus = await vault.removeMember(ownerId, updateMemberMessage, updateMemberSignature);
      break;
    default:
      throw new Error(`Invalid action: ${memberUpdateMessage.action}`);
  }

  // 6. Retrieve the new encrypted shared key from the vault
  response = await vault.readData(ownerId);
  const newEncryptedSharedKey = response.encryptedSharedKey;

  // 7. Re-encrypt the vault content using the new shared key
  if (decryptedContent) {
    let r = await encryptAndSignContent(decryptedContent, ownerPrivateKey, newEncryptedSharedKey)
    await vault.storeData(ownerId, r.storeDataMessage, r.storeDataSignature);
  }

  if (newMemberId) return newMemberId;
  if (removeMemberStatus) return removeMemberStatus;
}

module.exports = updateMember;