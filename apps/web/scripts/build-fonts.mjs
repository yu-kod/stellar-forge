// 画面に出す文字だけに絞ったフォントを作る。文字を足したら作り直す: npm run fonts -w @app/web
// 元のフォント（SIL Open Font License）は google/fonts から取ってきてキャッシュする
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import subsetFont from "subset-font";
import { collectChars, FONT_DIR } from "./fonts-text.mjs";

const root = path.resolve(import.meta.dirname, "..");
const cache = path.join(root, "node_modules/.cache/stellar-fonts");
const SOURCE = "https://raw.githubusercontent.com/google/fonts/main/ofl";

const FONTS = [
  {
    file: "zen-kaku-gothic-new-400.woff2",
    source: "zenkakugothicnew/ZenKakuGothicNew-Regular.ttf",
  },
  { file: "zen-kaku-gothic-new-700.woff2", source: "zenkakugothicnew/ZenKakuGothicNew-Bold.ttf" },
  { file: "dela-gothic-one-400.woff2", source: "delagothicone/DelaGothicOne-Regular.ttf" },
];

/** ASCII の表示できる文字はすべて入れる（数や英字は動的に出るため） */
const ASCII = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i));

async function original(source) {
  const file = path.join(cache, path.basename(source));
  if (!existsSync(file)) {
    const res = await fetch(`${SOURCE}/${source}`);
    if (!res.ok) throw new Error(`${source} を取得できない（${res.status}）`);
    mkdirSync(cache, { recursive: true });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(file);
}

const text = [...new Set([...ASCII, ...collectChars(root)])].sort().join("");
mkdirSync(path.join(root, FONT_DIR), { recursive: true });
writeFileSync(path.join(root, FONT_DIR, "charset.txt"), text);
for (const font of FONTS) {
  const subset = await subsetFont(await original(font.source), text, { targetFormat: "woff2" });
  writeFileSync(path.join(root, FONT_DIR, font.file), subset);
  console.log(`${font.file}: ${(subset.length / 1024).toFixed(1)} kB`);
}
console.log(`${text.length} 文字`);
