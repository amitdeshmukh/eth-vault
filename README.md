# Encrypted File Vault

This project enables encrypted data vaults for Ethereum accounts with role-based access control.

It allows Ethereum (or any EVM) user accounts to securely store and share data with different access levels. Users can be granted one of three roles: `Owner`, `Contributor`, and `Viewer`. The vault ensures the confidentiality of the data and manages the encryption keys for each user.

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