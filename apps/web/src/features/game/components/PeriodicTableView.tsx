import { ELEMENT_IDS, type Meta } from "@/game/types";
import { cn } from "@/lib/utils";
import { ELEMENTS, isGameElement } from "../elements";
import { PERIODIC_TABLE, type PeriodicCell } from "../periodicTable";

const IRON = 26;
const BISMUTH = 83;
const GOLD = 79;

function isDiscovered(meta: Meta, symbol: string): boolean {
  return symbol === "H" || (isGameElement(symbol) && meta.discovered[symbol] === true);
}

/** s過程で作った元素か */
function isSProcessFound(meta: Meta, cell: PeriodicCell): boolean {
  return meta.sProcess.discovered.includes(cell.number);
}

function describe(meta: Meta, cell: PeriodicCell): string {
  if (isSProcessFound(meta, cell)) return `${cell.name}：s過程で作った`;
  if (isGameElement(cell.symbol) && isDiscovered(meta, cell.symbol)) {
    const { name, discovery } = ELEMENTS[cell.symbol];
    return `${name}：${discovery}`;
  }
  if (cell.number === BISMUTH) return "ビスマス：s過程の終点（第3層のゴール）";
  if (cell.number === GOLD) return "金：中性子星合体のr過程（第4層のゴール）";
  if (cell.number > IRON) return "鉄より重い元素：中性子捕獲で作る（第3・4層）";
  if (isGameElement(cell.symbol)) return "まだ作っていない";
  return "軽い元素：第2層以降で作れる";
}

export function PeriodicTableView({ meta }: { meta: Meta }) {
  const found =
    ELEMENT_IDS.filter((id) => isDiscovered(meta, id)).length + meta.sProcess.discovered.length;
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        発見した元素 <b className="text-foreground font-mono">{found}</b> /
        83（水素〜ビスマス）。元素を初めて作ると、その性質が以後ずっと効く。
      </p>
      <div className="overflow-x-auto">
        <ol
          aria-label="周期表"
          className="grid min-w-[560px] grid-cols-[repeat(18,minmax(0,1fr))] gap-0.5"
        >
          {PERIODIC_TABLE.map((cell) => {
            const got = isDiscovered(meta, cell.symbol);
            const sFound = isSProcessFound(meta, cell);
            const goal = cell.number === BISMUTH || cell.number === GOLD;
            const label = describe(meta, cell);
            return (
              <li
                key={cell.number}
                aria-label={`${cell.number} ${cell.symbol} ${label}`}
                title={label}
                style={{ gridRow: cell.row, gridColumn: cell.column }}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-sm border text-xs",
                  got && isGameElement(cell.symbol)
                    ? cn(ELEMENTS[cell.symbol].bg, "text-background border-transparent font-bold")
                    : sFound
                      ? "bg-el-heavy text-background border-transparent font-bold"
                      : "bg-background text-muted-foreground",
                  goal && !sFound && "text-ignite border-ignite border-dashed",
                  cell.row === 7 && "mt-1"
                )}
              >
                <span aria-hidden className="absolute top-0 left-0.5 font-mono text-[0.5rem]">
                  {cell.number}
                </span>
                <span aria-hidden>{cell.symbol}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <ul aria-label="発見の効果" className="grid gap-2 sm:grid-cols-2">
        {ELEMENT_IDS.filter((id) => id !== "H").map((id) => {
          const got = isDiscovered(meta, id);
          return (
            <li
              key={id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                !got && "text-muted-foreground"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "text-background inline-grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold",
                  got ? ELEMENTS[id].bg : "bg-muted"
                )}
              >
                {id}
              </span>
              {ELEMENTS[id].name}：{got ? ELEMENTS[id].discovery : "未発見"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
