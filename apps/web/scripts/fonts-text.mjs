// 同梱フォントに入れる文字を集める。scripts/build-fonts.mjs と src/fonts.test.ts で使う
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const FONT_DIR = "src/assets/fonts";
export const FONT_FILES = [
  "zen-kaku-gothic-new-400.woff2",
  "zen-kaku-gothic-new-700.woff2",
  "dela-gothic-one-400.woff2",
];

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "test-utils" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

/** 画面に出しうる ASCII 以外の文字（ソースと index.html に書かれているもの） */
export function collectChars(root) {
  const files = [...sourceFiles(path.join(root, "src")), path.join(root, "index.html")];
  const chars = new Set();
  for (const file of files) {
    for (const c of readFileSync(file, "utf8")) {
      if (c.codePointAt(0) > 0x7e) chars.add(c);
    }
  }
  return chars;
}
