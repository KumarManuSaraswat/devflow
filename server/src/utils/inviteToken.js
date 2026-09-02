const crypto = require("crypto");

const createInviteToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashInviteToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

module.exports = {
  createInviteToken,
  hashInviteToken,
};