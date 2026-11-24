import { existsSync, readFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(projectRoot, ".env.local");
const mediaRoot = path.resolve(projectRoot, "..", "Intentions-media-backup");
const bucketName = "intentions-media";

const contentTypes = {
  ".jpg": "image/jpeg",
  ".lrc": "text/plain; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png"
};

function loadLocalEnvironment() {
  if (!existsSync(envFile)) return;

  const contents = readFileSync(envFile);
  for (const line of contents.toString("utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function getObjectKey(relativePath) {
  const key = relativePath.split(path.sep).join("/");
  const [folder, fileName, ...extra] = key.split("/");
  const extension = path.extname(fileName ?? "").toLowerCase();
  const validFolder =
    (folder === "audio" && extension === ".mp3") ||
    (folder === "lyrics" && extension === ".lrc") ||
    (folder === "covers" && [".jpg", ".png"].includes(extension));

  if (extra.length || !validFolder || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path.basename(fileName ?? "", extension))) {
    throw new Error(`Invalid media path: ${relativePath}`);
  }

  return { key, contentType: contentTypes[extension] };
}

async function collectFiles(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath, relativePath));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() in contentTypes) {
      getObjectKey(relativePath);
      files.push({ absolutePath, relativePath });
    }
  }

  return files;
}

async function main() {
  loadLocalEnvironment();
  const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!projectUrl || !secretKey?.startsWith("sb_secret_")) {
    throw new Error("Set SUPABASE_URL and an sb_secret_ SUPABASE_SECRET_KEY in .env.local.");
  }

  const requestedPaths = process.argv.slice(2);
  const files = requestedPaths.length
    ? requestedPaths.map((requestedPath) => {
        const relativePath = requestedPath.replace(/[\\/]+/g, path.sep);
        const absolutePath = path.resolve(mediaRoot, relativePath);
        if (!absolutePath.startsWith(`${mediaRoot}${path.sep}`)) {
          throw new Error(`Media path must be inside ${mediaRoot}.`);
        }
        getObjectKey(relativePath);
        return { absolutePath, relativePath };
      })
    : await collectFiles(mediaRoot);

  if (!files.length) throw new Error(`No media files found in ${mediaRoot}.`);

  for (const file of files) {
    const { key, contentType } = getObjectKey(file.relativePath);
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${projectUrl}/storage/v1/object/${bucketName}/${encodedKey}`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        "Content-Type": contentType,
        "x-upsert": "true"
      },
      body: await readFile(file.absolutePath)
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Upload failed for ${key} (${response.status}): ${details}`);
    }

    console.log(`Uploaded ${key}`);
  }

  console.log(`Uploaded ${files.length} media file${files.length === 1 ? "" : "s"}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
