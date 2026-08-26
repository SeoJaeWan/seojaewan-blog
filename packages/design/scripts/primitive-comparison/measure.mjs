import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DESIGN_DIRECTORY = resolve(SCRIPT_DIRECTORY, "../..");
const ENTRY_PATH = resolve(SCRIPT_DIRECTORY, "entry.mjs");

export const REACT_EXTERNALS = Object.freeze([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
]);

const normalizeBuildOutput = (result) => {
  const outputs = Array.isArray(result) ? result : [result];
  return outputs.flatMap(({ output }) => output);
};

const measureOutput = (output) => {
  const chunks = output
    .filter(({ type }) => type === "chunk")
    .map(({ code, fileName }) => ({
      file: fileName,
      gzipBytes: gzipSync(code, { level: 9 }).byteLength,
      rawBytes: Buffer.byteLength(code),
    }))
    .sort((left, right) => left.file.localeCompare(right.file));

  return {
    chunks,
    gzipBytes: chunks.reduce((total, chunk) => total + chunk.gzipBytes, 0),
    rawBytes: chunks.reduce((total, chunk) => total + chunk.rawBytes, 0),
  };
};

const validateCandidates = (candidates) => {
  if (candidates.length === 0) {
    throw new Error("Provide at least one --candidate name=module-path argument.");
  }

  const names = new Set();

  return candidates.map(({ modulePath, name }) => {
    if (!name || names.has(name)) {
      throw new Error(`Candidate names must be non-empty and unique: ${name}`);
    }

    names.add(name);
    const resolvedModulePath = resolve(modulePath);

    if (!existsSync(resolvedModulePath)) {
      throw new Error(`Candidate module does not exist: ${resolvedModulePath}`);
    }

    return { modulePath: resolvedModulePath, name };
  });
};

export const measurePrimitiveCandidates = async (candidateInputs) => {
  const candidates = validateCandidates(candidateInputs);
  const measurements = [];

  for (const candidate of candidates) {
    const result = await build({
      build: {
        lib: {
          entry: ENTRY_PATH,
          fileName: () => `${candidate.name}.js`,
          formats: ["es"],
        },
        minify: true,
        rolldownOptions: {
          external: [...REACT_EXTERNALS],
        },
        sourcemap: false,
        target: "es2022",
        write: false,
      },
      configFile: false,
      logLevel: "silent",
      resolve: {
        alias: [{ find: "#primitive-candidate", replacement: candidate.modulePath }],
      },
    });

    measurements.push({
      candidate: candidate.name,
      ...measureOutput(normalizeBuildOutput(result)),
    });
  }

  return {
    measurementContract: {
      entry: relative(DESIGN_DIRECTORY, ENTRY_PATH),
      externals: [...REACT_EXTERNALS],
      metric: "production-javascript-bytes",
      minified: true,
      outputs: ["raw", "gzip"],
      target: "es2022",
    },
    measurements,
  };
};

const parseArguments = (arguments_) => {
  const candidates = [];
  let outputPath;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--candidate") {
      const value = arguments_[index + 1] ?? "";
      const separatorIndex = value.indexOf("=");
      candidates.push({
        modulePath: separatorIndex === -1 ? "" : value.slice(separatorIndex + 1),
        name: separatorIndex === -1 ? value : value.slice(0, separatorIndex),
      });
      index += 1;
      continue;
    }

    if (argument === "--output") {
      outputPath = arguments_[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { candidates, outputPath };
};

const isDirectInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectInvocation) {
  const { candidates, outputPath } = parseArguments(process.argv.slice(2));
  const report = await measurePrimitiveCandidates(candidates);
  const serializedReport = `${JSON.stringify(report, null, 2)}\n`;

  if (outputPath) {
    const resolvedOutputPath = resolve(outputPath);
    mkdirSync(dirname(resolvedOutputPath), { recursive: true });
    writeFileSync(resolvedOutputPath, serializedReport);
  } else {
    process.stdout.write(serializedReport);
  }
}
