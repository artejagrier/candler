import assert from "node:assert/strict";
import test from "node:test";
import { describeReadError, relativePathForFile, sourcesFromFileList } from "../lib/cloud/browser-files";

test("folder picker files keep webkitRelativePath hierarchy", () => {
  const file = new File(["export {}\n"], "index.js", { type: "text/javascript" });
  Object.defineProperty(file, "webkitRelativePath", { value: "Candler-Cloud-Test/src/index.js" });
  assert.equal(relativePathForFile(file), "Candler-Cloud-Test/src/index.js");
  assert.deepEqual(sourcesFromFileList([file]), [{ file, relativePath: "Candler-Cloud-Test/src/index.js" }]);
});

test("plain files use the filename as the relative path", () => {
  const file = new File(["hi"], "README.txt", { type: "text/plain" });
  assert.equal(relativePathForFile(file), "README.txt");
});

test("Chrome directory-as-file errors become an actionable message", () => {
  const message = describeReadError(
    new Error("A requested file or directory could not be found at the time an operation was processed."),
    "Candler-Cloud-Test",
  );
  assert.match(message, /Could not read “Candler-Cloud-Test”/);
  assert.match(message, /Upload folder/);
  assert.equal(message.includes("could not be found at the time"), false);
});
