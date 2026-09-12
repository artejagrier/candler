import assert from "node:assert/strict";
import test from "node:test";
import { createStepUpToken, verifyStepUpToken } from "../lib/security/step-up";

const key = Buffer.alloc(32, 9);
const userId = "123e4567-e89b-12d3-a456-426614174000";

test("step-up tokens expire and are bound to a user", () => {
  const token = createStepUpToken(userId, 1_000, 60, key);
  assert.equal(verifyStepUpToken(token, userId, 1_050, key), true);
  assert.equal(verifyStepUpToken(token, userId, 1_061, key), false);
  assert.equal(verifyStepUpToken(token, "00000000-0000-0000-0000-000000000000", 1_050, key), false);
  assert.equal(verifyStepUpToken("tampered", userId, 1_050, key), false);
});
