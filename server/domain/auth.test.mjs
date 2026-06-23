import test from "node:test";
import assert from "node:assert/strict";
import {
  createAccessToken,
  parseAuthHeader,
  validateRegistration,
  verifyAccessToken
} from "./auth.js";

test("createAccessToken and verifyAccessToken preserve user identity and role", () => {
  const token = createAccessToken({ id: 7, username: "admin", role: "admin" }, "test-secret");
  const payload = verifyAccessToken(token, "test-secret");

  assert.equal(payload.id, 7);
  assert.equal(payload.username, "admin");
  assert.equal(payload.role, "admin");
});

test("parseAuthHeader accepts bearer tokens and rejects missing tokens", () => {
  assert.equal(parseAuthHeader("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.throws(() => parseAuthHeader(""), /Missing authorization token/);
  assert.throws(() => parseAuthHeader("Basic abc"), /Missing authorization token/);
});

test("validateRegistration normalizes tags and rejects incomplete input", () => {
  const result = validateRegistration({
    username: " new_user ",
    password: "secret123",
    nickname: " 新用户 ",
    preferenceTags: "科幻, 悬疑,IMAX"
  });

  assert.deepEqual(result, {
    username: "new_user",
    password: "secret123",
    nickname: "新用户",
    preferenceTags: ["科幻", "悬疑", "IMAX"]
  });
  assert.throws(() => validateRegistration({ username: "", password: "123", nickname: "" }), /请填写/);
});
