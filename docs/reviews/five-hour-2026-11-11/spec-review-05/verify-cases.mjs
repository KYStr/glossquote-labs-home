import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

export function verifyCases(derive, extra = [], getCases = data => data.cases) {
  const file = process.argv[2];
  if (!file) throw new Error("Pass the pinned fixtures.json path");
  const candidate = JSON.parse(readFileSync(file, "utf8"));
  const cases = getCases(candidate).map(test => {
    const independentExpected = derive(test);
    return {
      id: test.id,
      kind: test.kind,
      input: test.input,
      candidateExpected: test.expected,
      independentExpected,
      status: isDeepStrictEqual(test.expected, independentExpected) ? "PASS" : "FAIL"
    };
  });
  const failed = cases.filter(test => test.status === "FAIL").length;
  console.log(JSON.stringify({
    runtime: process.version,
    passed: cases.length - failed,
    failed,
    cases,
    extra
  }, null, 2));
  process.exitCode = failed ? 1 : 0;
}
