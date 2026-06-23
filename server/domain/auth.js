import jwt from "jsonwebtoken";

export function createAccessToken(user, secret) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    secret,
    { expiresIn: "2h" }
  );
}

export function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret);
}

export function parseAuthHeader(header) {
  if (!header || !header.startsWith("Bearer ")) {
    throw new Error("Missing authorization token");
  }

  return header.slice("Bearer ".length);
}

export function validateRegistration(input) {
  const username = String(input.username ?? "").trim();
  const password = String(input.password ?? "").trim();
  const nickname = String(input.nickname ?? "").trim();
  const rawTags = input.preferenceTags ?? "";
  const preferenceTags = Array.isArray(rawTags)
    ? rawTags.map((tag) => String(tag).trim()).filter(Boolean)
    : String(rawTags)
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean);

  if (!username || !password || !nickname) {
    throw new Error("请填写账号、密码和昵称");
  }

  if (password.length < 6) {
    throw new Error("密码至少需要 6 位");
  }

  return {
    username,
    password,
    nickname,
    preferenceTags: preferenceTags.length > 0 ? preferenceTags : ["热门"]
  };
}
