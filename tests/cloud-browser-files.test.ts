import assert from "node:assert/strict";
import test from "node:test";
import { describeReadError, relativePathForFile, sourcesFromFileList } from "../lib/cloud/browser-files";

test("folder picker keeps OS junk, env, git, and generated paths eligible", () => {
  const relativePaths = [
    "Candler-Cloud-Test/.DS_Store",
    "Candler-Cloud-Test/.env",
    "Candler-Cloud-Test/.git/config",
    "Candler-Cloud-Test/node_modules/pkg/index.js",
    "Candler-Cloud-Test/.next/cache/file",
    "Candler-Cloud-Test/photo.png",
  ];
  const files = relativePaths.map((relativePath) => {
    const file = new File(["x"], relativePath.split("/").at(-1) ?? relativePath, { type: "application/octet-stream" });
    Object.defineProperty(file, "webkitRelativePath", { value: relativePath });
    return file;
  });
  const sources = sourcesFromFileList(files);
  assert.equal(sources.length, relativePaths.length);
  assert.deepEqual(sources.map((source) => source.relativePath), relativePaths);
});

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
  assert.match(message, /Upload Folder/);
  assert.equal(message.includes("could not be found at the time"), false);
});
