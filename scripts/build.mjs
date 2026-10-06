import { buildProject, defaultProjectRoot, parseModeArgs } from "./generated.mjs";

try {
  const mode = parseModeArgs(process.argv.slice(2));
  const files = buildProject(defaultProjectRoot(), mode);
  process.stdout.write(`Built ${files.size} ${mode} files in ${mode === "preview" ? "dist" : "dist-production"}.\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
