import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { measurePrimitiveCandidates, REACT_EXTERNALS } from "./measure.mjs";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "wd-primitive-measurement-"));

const writeCandidate = (name) => {
  const path = join(temporaryDirectory, `${name}.mjs`);
  writeFileSync(
    path,
    [
      'import { createElement } from "react";',
      "const Empty = () => null;",
      `const Button = ({ children }) => createElement("button", { type: "button" }, children);`,
      `export const candidate = { Button, ContextMenu: Empty, Drawer: Empty, name: "${name}" };`,
    ].join("\n"),
  );
  return path;
};

after(() => {
  rmSync(temporaryDirectory, { force: true, recursive: true });
});

test("각 후보를 동일 entry와 동일 React external로 production build해 raw/gzip을 기록한다", async () => {
  const report = await measurePrimitiveCandidates([
    { modulePath: writeCandidate("base"), name: "base" },
    { modulePath: writeCandidate("radix"), name: "radix" },
  ]);

  assert.equal(report.measurementContract.entry, "scripts/primitive-comparison/entry.mjs");
  assert.deepEqual(report.measurementContract.externals, [...REACT_EXTERNALS]);
  assert.deepEqual(report.measurementContract.outputs, ["raw", "gzip"]);
  assert.equal(report.measurements.length, 2);

  for (const measurement of report.measurements) {
    assert.ok(measurement.rawBytes > 0);
    assert.ok(measurement.gzipBytes > 0);
    assert.ok(measurement.gzipBytes <= measurement.rawBytes);
    assert.equal(measurement.chunks.length, 1);
  }
});

test("측정 대상 이름 중복과 존재하지 않는 module을 실행 전에 거부한다", async () => {
  const candidatePath = writeCandidate("duplicate");

  await assert.rejects(
    () =>
      measurePrimitiveCandidates([
        { modulePath: candidatePath, name: "same" },
        { modulePath: candidatePath, name: "same" },
      ]),
    /non-empty and unique/,
  );

  await assert.rejects(
    () =>
      measurePrimitiveCandidates([
        { modulePath: join(temporaryDirectory, "missing.mjs"), name: "missing" },
      ]),
    /does not exist/,
  );
});
