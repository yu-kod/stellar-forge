import { DUST_IDS, type Meta } from "@/game/types";
import { cn } from "@/lib/utils";
import { formatMass } from "../format";
import { ElementChip } from "./ElementChip";

/** 次の層の予告を見せるまでの超新星の回数 */
const PREVIEW_AFTER = 5;

type Layer = { title: string; status?: string; body: string; current?: boolean };

function layers(meta: Meta): Layer[] {
  const open = meta.supernovae >= PREVIEW_AFTER;
  const hidden = "？？？";
  return [
    {
      title: "第1層　大質量星の一生",
      current: true,
      body: "水素からケイ素まで6段階の燃焼。鉄のコアが1.4 M☉に達すると崩壊して超新星になる。外層に残した元素が星屑になる。",
    },
    {
      title: "第2層　星の質量を選ぶ",
      status: open ? "（準備中）" : `（超新星 ${meta.supernovae}/${PREVIEW_AFTER} 回で予告を解放）`,
      body: open
        ? "8 M☉未満の星は超新星にならず、赤色巨星を経て白色矮星になる。重い星は速く燃えて超新星になる。周回ごとに星の質量を選び、狙う元素を変える。"
        : hidden,
    },
    {
      title: "第3層　漸近巨星分枝星とs過程",
      status: open ? "（準備中）" : "（ロック中）",
      body: open
        ? "軽い星の中で中性子をゆっくり捕まえ、鉄を種に一歩ずつ重い元素へ。ビスマス209で行き止まりになる。"
        : hidden,
    },
    {
      title: "第4層　中性子星合体",
      status: open ? "（準備中）" : "（ロック中）",
      body: open
        ? `これまでの超新星が残した中性子星（いま ${meta.neutronStars} 個）を合体させ、速い中性子捕獲で金やウランを作る。`
        : hidden,
    },
  ];
}

export function RecordsView({ meta }: { meta: Meta }) {
  return (
    <div className="grid gap-4">
      <ul aria-label="層" className="grid gap-2">
        {layers(meta).map((layer) => (
          <li
            key={layer.title}
            className={cn(
              "grid gap-1 rounded-xl border px-4 py-3",
              layer.current && "border-ignite"
            )}
          >
            <h3 className="text-base font-semibold">
              {layer.title}
              {layer.status && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  {layer.status}
                </span>
              )}
            </h3>
            <p className="text-muted-foreground text-sm">{layer.body}</p>
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="text-muted-foreground mb-2 text-left">これまでの星</caption>
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="px-2 py-1 font-medium">星</th>
              <th className="px-2 py-1 font-medium">寿命</th>
              <th className="px-2 py-1 font-medium">放出した重元素</th>
              <th className="px-2 py-1 font-medium">得た星屑</th>
            </tr>
          </thead>
          <tbody>
            {meta.log.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-2 py-1">
                  まだ超新星は起きていない
                </td>
              </tr>
            ) : (
              meta.log.map((record) => (
                <tr key={record.generation} className="border-b">
                  <td className="px-2 py-1 font-mono">第{record.generation}世代</td>
                  <td className="px-2 py-1 font-mono">{Math.round(record.time)}秒</td>
                  <td className="px-2 py-1 font-mono">{formatMass(record.ejected)}</td>
                  <td className="px-2 py-1">
                    {DUST_IDS.some((id) => record.gain[id] > 0) ? (
                      <ul
                        aria-label={`第${record.generation}世代で得た星屑`}
                        className="flex flex-wrap gap-1"
                      >
                        {DUST_IDS.filter((id) => record.gain[id] > 0).map((id) => (
                          <ElementChip key={id} element={id} value={String(record.gain[id])} />
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
