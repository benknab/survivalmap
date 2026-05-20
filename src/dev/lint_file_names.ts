const snakeCasePattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const sourceExtensions = [".ts", ".tsx"];
const stderrEncoder = new globalThis.TextEncoder();

function isTypeScriptSourceFile(name: string): boolean {
  return sourceExtensions.some((extension) => name.endsWith(extension));
}

function isSnakeCaseSourceFileName(name: string): boolean {
  const baseName = sourceExtensions.reduce(
    (currentName, extension) =>
      currentName.endsWith(extension) ? currentName.slice(0, -extension.length) : currentName,
    name,
  );

  return snakeCasePattern.test(baseName);
}

async function walk(directory: string, violations: string[]): Promise<void> {
  for await (const entry of Deno.readDir(directory)) {
    const path = directory === "." ? entry.name : `${directory}/${entry.name}`;

    if (
      entry.isFile && isTypeScriptSourceFile(entry.name) && !isSnakeCaseSourceFileName(entry.name)
    ) {
      violations.push(path);
    }

    if (entry.isDirectory) {
      await walk(path, violations);
    }
  }
}

async function getViolations(): Promise<string[]> {
  const violations: string[] = [];
  await walk("src", violations);
  return violations;
}

function writeErrorLine(message: string): void {
  Deno.stderr.writeSync(stderrEncoder.encode(`${message}\n`));
}

void getViolations().then((violations) => {
  if (violations.length === 0) {
    return;
  }

  writeErrorLine("Non-snake-case TypeScript source filenames:");
  for (const violation of violations) {
    writeErrorLine(`- ${violation}`);
  }

  Deno.exit(1);
});
