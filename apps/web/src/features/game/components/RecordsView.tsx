import { LAYER2_AFTER } from "@/game/balance";
import { DUST_IDS, type Meta } from "@/game/types";
import { cn } from "@/lib/utils";
import { formatMass } from "../format";
import { ElementChip } from "./ElementChip";

/** 第3層の予告を見せるまでの白色矮星の数 */
const LAYER3_PREVIEW_AFTER = 3;

type Layer = { title: string; status?: string; body: string; current?: boolean };

function layers(meta: Meta): Layer[] {
  const layer2 = meta.supernovae >= LAYER2_AFTER;
  const layer3Preview = meta.whiteDwarfs >= LAYER3_PREVIEW_AFTER;
  const hidden = "？？？";
  return [
    {
      title: "第1層　大質量星の一生",
      current: !layer2,
      body: "水素からケイ素まで6段階の燃焼。鉄のコアが1.4 M☉に達すると崩壊して超新星になる。外層に残した元素が星屑になる。",
    },
    {
      title: "第2層　星の質量を選ぶ",
      current: layer2,
      status: layer2 ? undefined : `（超新星 ${meta.supernovae}/${LAYER2_AFTER} 回で解放）`,
      body: layer2
        ? "8 M☉未満の星は超新星にならず、赤色巨星を経て白色矮星になり、窒素をくれる。窒素で星団を作り、軽い星と重い星を並べて燃やす。"
        : hidden,
    },
    {
      title: "第3層　漸近巨星分枝星とs過程",
      status: layer3Preview
        ? "（準備中）"
        : `（白色矮星 ${meta.whiteDwarfs}/${LAYER3_PREVIEW_AFTER} 個で予告を解放）`,
      body: layer3Preview
        ? "軽い星の中で中性子をゆっくり捕まえ、鉄を種に一歩ずつ重い元素へ。ビスマス209で行き止まりになる。"
        : hidden,
    },
    {
      title: "第4層　中性子星合体",
      status: layer3Preview ? "（準備中）" : "（ロック中）",
      body: layer3Preview
        ? `これまでの超新星が残した中性子星（いま ${meta.neutronStars} 個）を合体させ、速い中性子捕獲で金やウランを作る。`
        : hidden,
    },
  ];
}

export function RecordsView({ meta }: { meta: Meta }) {
  return (
    <div className="grid gap-4">
      <ul aria-label="これまでに残したもの" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <li>
          超新星<b className="ml-1 font-mono">{meta.supernovae}</b>
        </li>
        <li>
          白色矮星<b className="ml-1 font-mono">{meta.whiteDwarfs}</b>
        </li>
        <li>
          中性子星<b className="ml-1 font-mono">{meta.neutronStars}</b>
        </li>
      </ul>
      <ul aria-label="層" className="grid gap-2">
        {layers(meta).map((layer) => (
          <li
            key={layer.title}
            aria-label={layer.title}
            className={cn(
              "grid gap-1 rounded-xl border px-4 py-3",
              layer.current && "border-ignite"
            )}
          >
            <h3 className="text-base font-semibold">
              {layer.title}
              {layer.current && <span className="text-ignite ml-2 text-sm">いまの層</span>}
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
