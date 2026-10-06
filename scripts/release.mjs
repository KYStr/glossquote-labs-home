import { buildProject, defaultProjectRoot, expectedFilesForProject, verifyGeneratedTree } from "./generated.mjs";

try {
  const root = defaultProjectRoot();
  buildProject(root, "production");
  const expected = expectedFilesForProject(root, "production");
  verifyGeneratedTree(root, "production", expected);
  process.stdout.write(`Production build verified byte for byte (${expected.size} files).\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
