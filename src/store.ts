import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Entry } from "./types.ts";

const DATA_FILE = process.env.ASSAY_FILE ?? resolve(process.cwd(), "data/entries.jsonl");

export async function append(entry: Entry): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await appendFile(DATA_FILE, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function readAll(): Promise<Entry[]> {
  let raw: string;
  try {
    raw = await readFile(DATA_FILE, "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Entry);
}

export function nextId(existing: Entry[]): string {
  return String(existing.length + 1).padStart(4, "0");
}

export function dataPath(): string {
  return DATA_FILE;
}
