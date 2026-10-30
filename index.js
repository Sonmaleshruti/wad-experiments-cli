
#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const REPO_API =
  "https://api.github.com/repos/Sonmaleshruti/wad-experiments/contents/wad-exp";

const OUTPUT_DIR = path.join(process.cwd(), "wad-exp");

async function getExperiments() {
  const response = await fetch(REPO_API, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    throw new Error("Unable to access the experiment library.");
  }

  const files = await response.json();

  return files
    .filter(file => file.type === "file" && /^exp\d+\.js$/.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

async function listExperiments() {
  const files = await getExperiments();

  console.log("\nAvailable Web Development Experiments:\n");

  if (files.length === 0) {
    console.log("No experiments found.");
    return;
  }

  files.forEach(file => console.log("  " + file.name));

  console.log(`\nTotal experiments: ${files.length}\n`);
}

async function copyExperiment(file, force = false) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const destination = path.join(OUTPUT_DIR, file.name);

  try {
    await fs.access(destination);

    if (!force) {
      console.log(`${file.name} already exists. Skipping.`);
      return;
    }
  } catch {
    // File does not exist. Continue with download.
  }

  const response = await fetch(file.download_url);

  if (!response.ok) {
    throw new Error(`Unable to download ${file.name}`);
  }

  const content = await response.text();

  await fs.writeFile(destination, content, "utf8");

  console.log(`Copied: ${file.name}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const force = args.includes("--force");

  if (!command || command === "help" || command === "--help") {
    console.log(`
WAD Experiments CLI

Usage:
  npx wad-experiments-cli list
  npx wad-experiments-cli 1
  npx wad-experiments-cli exp1
  npx wad-experiments-cli all

Options:
  --force    Overwrite existing experiment files
  --help     Display help
`);
    return;
  }

  if (command === "list") {
    await listExperiments();
    return;
  }

  const files = await getExperiments();

  if (command === "all") {
    for (const file of files) {
      await copyExperiment(file, force);
    }

    console.log(`\nExperiment download completed.`);
    return;
  }

  const experimentName = command.startsWith("exp")
    ? command
    : `exp${command}`;

  const selectedFile = files.find(
    file => file.name === `${experimentName}.js`
  );

  if (!selectedFile) {
    console.log("Experiment not found.");
    console.log("Use: npx wad-experiments-cli list");
    process.exitCode = 1;
    return;
  }

  await copyExperiment(selectedFile, force);

  console.log("\nDownload completed.");
}

main().catch(error => {
  console.error("\nError:", error.message);
  process.exitCode = 1;
});
