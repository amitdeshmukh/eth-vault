# eth-vault

`eth-vault` is an encrypted data vault for Ethereum accounts with role-based access control

It lets Ethereum (or any EVM) users store, share, and manage sensitive information in an encrypted format and apply role-based access control over the content.

Users can be assigned different roles (Owner, Contributor, and Viewer), each with specific access permissions.

This module uses Ethereum key pairs for authentication and message signing. It also leverages asymmetric encryption to ensure that only authorized users can access and decrypt the stored data.

## Installation

```
npm install --save eth-vault
```

## Usage

Import the Vault module and necessary dependencies:

```javascript
const Vault = require("eth-vault");
const ethers = require("ethers");
const decryptData = require("eth-vault/src/utils/decryptData");
const signMessage = require("eth-vault/src/utils/signMessage");
```

### Generate Ethereum key pairs

```javascript
const wallet = ethers.Wallet.createRandom();
const privateKey = wallet.privateKey;
const publicKey = wallet.publicKey;
```

### Create a Vault instance

```javascript
const vault = new Vault(ownerPublicKey, "Test Vault", "A test vault", "lowdb");
```

### Add members to the vault

```javascript
const addMemberMessage = {
  action: "addMember",
  role: "Contributor",
  publicKey: contributorPublicKey
};

const addMemberSignature = await signMessage(ownerPrivateKey, addMemberMessage);

const memberId = await vault.addMember(ownerId, addMemberMessage, addMemberSignature);
```

### Store data in the vault

```javascript
const storeDataMessage = {
  action: "storeData",
  content: "Secret content"
};

const storeDataSignature = await signMessage(ownerPrivateKey, storeDataMessage);

await vault.storeData(ownerId, storeDataMessage, storeDataSignature);
```

### Read data from the vault

```javascript
const response = await vault.readData(memberId);

const decryptedData = await decryptData(
  response.content.encryptedData,
  response.content.iv,
  response.content.authTag,
  response.encryptedSharedKey,
  memberPrivateKey
);

console.log("Decrypted data:", decryptedData);
```

### Remove a member from the vault

```javascript
const removeMemberMessage = {
  action: "removeMember",
  memberId: viewerId
};

const removeMemberSignature = await signMessage(ownerPrivateKey, removeMemberMessage);

const status = vault.removeMember(ownerId, removeMemberMessage, removeMemberSignature);
```

### Delete the vault

```javascript
const deleteVaultMessage = {
  action: "deleteVault"
};

const deleteVaultSignature = await signMessage(ownerPrivateKey, deleteVaultMessage);

await vault.deleteVault(ownerId, deleteVaultMessage, deleteVaultSignature);
```

Please refer to the unit tests for more examples of how to use this module.