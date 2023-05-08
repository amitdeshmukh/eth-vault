const Joi = require('joi');

const nameDescriptionSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().min(1).max(255).optional().allow('')
});

const addMemberMessageSchema = Joi.object({
  action: Joi.string().valid('addMember').required(),
  role: Joi.string().valid('Owner', 'Contributor', 'Viewer').required(),
  publicKey: Joi.string().required(),
});

const removeMemberMessageSchema = Joi.object({
  action: Joi.string().valid('removeMember').required(),
  memberId: Joi.string().uuid().required(),
});

const changeMemberRoleMessageSchema = Joi.object({
  action: Joi.string().valid('changeRole').required(),
  memberId: Joi.string().uuid().required(),
  role: Joi.string().valid('Owner', 'Contributor', 'Viewer').required(),
});

const storeDataMessageSchema = Joi.object({
  action: Joi.string().valid('storeContent').required(),
  content: Joi.string().required(),
});

const deleteVaultMessageSchema = Joi.object({
  action: Joi.string().valid('deleteVault').required(),
});

module.exports = {
  addMemberMessageSchema,
  removeMemberMessageSchema,
  changeMemberRoleMessageSchema,
  storeDataMessageSchema,
  deleteVaultMessageSchema,
};
