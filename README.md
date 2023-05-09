# Ethereum File Vault

This project enables encrypted data vaults for Ethereum accounts with role-based access control.

It allows Ethereum (or any EVM) user account to create a vault and securely share data with different access levels. Users can be granted one of three roles: `Owner`, `Contributor`, and `Viewer`. The vault ensures the confidentiality of the data and manages the encryption keys for each user.

The shared encryption/decryption key uses AES-256-GCM cipher and requires a trusted `server` to generate and encrypt keys for each user.

Some of the keys features are:
1. **Ethereum Wallets:** The Vault uses Ethereum wallets to identify users. This approach allows users to use their existing Ethereum wallets to access the vault, eliminating the need to create new accounts and passwords. The Vault uses the public key of the user's Ethereum wallet to encrypt data, ensuring that only the intended recipient can decrypt and access the information.

2. **Role-Based Access Control and Public Key Encryption:** The Vault offers role-based access control, allowing the `Owner` to assign roles like `Contributor` and `Viewer` to other users. This feature enables granular control over data access, ensuring that users can interact with the stored data based on their assigned roles. The Vault uses asymmetric encryption based on Ethereum public-private key pairs to secure data. When you store data in the Vault, it is encrypted using the recipient's public key, ensuring that only the intended recipient with the corresponding private key can decrypt and access the information. Note that the `Owner` needs to know the public key of their users ethereum wallets in advance. This can be done by asking the user to sign a message with their wallet and sending the public key to the `Owner`.

3. **Digital Signatures:** The Vault uses Ethereum digital signatures to verify the authenticity of actions performed within the system, such as adding or removing members, changing roles, or storing encrypted data. This process ensures that only authorized users can perform specific actions and reduces the risk of unauthorized access or tampering.

4. **Storage:** Currently we support LowDB and InMemoryDB as storage options. LowDB is a lightweight local JSON database that can be used for testing and development. InMemoryDB is a simple in-memory database. Feel free to fork to add support for other databases like MongoDB or IPFS.


## Installation

To install the required dependencies, run the following command:

```sh
npm install
```

## Usage

This project includes a sample script, `./src/examples/testVault.js`, to demonstrate the usage of the vault. The script generates Ethereum key pairs for four users, creates a vault, adds and removes users with different roles, and encrypts and stores data.

To run the test script, execute the following command:

```sh
node ./src/examples/testVault.js
```

The main components of the project are:

1. `Vault`: The main class that handles the vault's functionalities.
2. `decryptSharedKey`, `decryptContent`: Functions to decrypt the shared key and content.
3. `encryptAndSignContent`: Function to encrypt and sign content.
4. `updateMember`: Function for Owners to add or remove members from the vault.

You can import these components and use them in your own project like this:

```javascript
const Vault = require("./src/service/index");
const ethers = require("ethers");
const { decryptSharedKey, decryptContent } = require("./src/client/decrypt");
const encryptAndSignContent = require("./src/client/encryptAndSignContent");
const updateMember = require("./src/client/updateMember");
```

To get started with the vault, you'll need to generate Ethereum key pairs for your users. The example script provides a helper function for this, `generateKeyPair`. You can create a vault instance with the following code:

```javascript
const ownerKeys = generateKeyPair();
const vault = new Vault(ownerKeys.publicKey, "Test Vault", "A vault for testing", "lowdb");
```

You can then add and remove members, store encrypted data, and read and decrypt the stored data using the methods provided by the `Vault` class and the helper functions.

Please refer to the `./src/examples/testVault.js` file for detailed examples of how to use these methods and functions.

## Contributing

If you'd like to contribute to this project, please feel free to fork the repository and submit a pull request.

## License

This project is released under the MIT License.