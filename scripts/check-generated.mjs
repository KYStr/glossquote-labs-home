import { defaultProjectRoot, expectedFilesForProject, parseModeArgs, verifyGeneratedTree } from "./generated.mjs";

try {
  const mode = parseModeArgs(process.argv.slice(2));
  const root = defaultProjectRoot();
  const expected = expectedFilesForProject(root, mode);
  verifyGeneratedTree(root, mode, expected);
  process.stdout.write(`Generated ${mode} output matches ${expected.size} expected files byte for byte.\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
