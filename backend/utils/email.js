function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findUserByEmail(User, email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return User.findOne({
    email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
  });
}

module.exports = {
  findUserByEmail,
  normalizeEmail,
};
