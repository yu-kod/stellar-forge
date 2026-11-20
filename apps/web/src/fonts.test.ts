import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { collectChars, FONT_DIR, FONT_FILES } from "../scripts/fonts-text.mjs";

const root = path.resolve(import.meta.dirname, "..");

describe("同梱フォント（必要な文字だけに絞ったもの）", () => {
  it("画面に出す文字がすべてフォントに入っている。足りなければ npm run fonts -w @app/web で作り直す", () => {
    const charset = new Set(readFileSync(path.join(root, FONT_DIR, "charset.txt"), "utf8"));
    const missing = [...collectChars(root)].filter((c) => !charset.has(c));
    expect(missing).toEqual([]);
  });

  it("フォントのファイルがある", () => {
    for (const file of FONT_FILES) {
      expect(existsSync(path.join(root, FONT_DIR, file))).toBe(true);
    }
  });
});
