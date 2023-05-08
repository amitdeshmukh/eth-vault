const getVaultOwner = (data) => {
  for (const memberId in data.members) {
    const member = data.members[memberId];
    if (member.role === "Owner") {
      return {
        memberId: memberId,
        role: member.role,
        publicKey: member.publicKey,
        address: member.address,
        encryptedSharedKey: member.encryptedSharedKey
      };
    }
  }
};

module.exports = getVaultOwner;