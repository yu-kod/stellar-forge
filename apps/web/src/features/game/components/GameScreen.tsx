import { useCallback, useEffect, useReducer, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES } from "@/game/balance";
import { isIgnited } from "@/game/rates";
import { createGame } from "@/game/star";
import { STAGE_IDS, type GameState, type Star } from "@/game/types";
import { formatNumber } from "../format";
import { createModel, gameReducer, type Speed } from "../model";
import { animationFrameTicker, type Ticker } from "../ticker";
import { Notices } from "./Notices";
import { PeriodicTableView } from "./PeriodicTableView";
import { RecordsView } from "./RecordsView";
import { ShopView } from "./ShopView";
import { StageCard } from "./StageCard";
import { StarPanel } from "./StarPanel";
import { SupernovaDialog } from "./SupernovaDialog";

type Props = {
  /** 始める状態。省略すると第1世代の星から */
  initial?: GameState;
  /** 時間の進め方。テストでは手で進めるものに差し替える */
  ticker?: Ticker;
};

type Tab = "table" | "shop" | "records";
const SPEEDS: Speed[] = [1, 3];

export function GameScreen({ initial, ticker = animationFrameTicker }: Props) {
  const [model, dispatch] = useReducer(gameReducer, initial, (game) =>
    createModel(game ?? createGame())
  );
  const [tab, setTab] = useState<Tab>("table");
  const { game } = model;

  useEffect(() => ticker((seconds) => dispatch({ type: "tick", seconds })), [ticker]);
  const dismiss = useCallback((id: number) => dispatch({ type: "dismiss", id }), []);

  function startNextStar() {
    dispatch({ type: "rebirth" });
    setTab("shop");
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-3 py-4 sm:px-4">
      <Notices notices={model.notices} onDismiss={dismiss} />
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl tracking-wider sm:text-3xl">星の炉</h1>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <p className="font-mono tabular-nums">
            第{game.star.generation}世代の星・{Math.floor(game.star.time)}秒
          </p>
          <div role="group" aria-label="進める速さ" className="flex rounded-full border">
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                aria-pressed={model.speed === speed}
                onClick={() => dispatch({ type: "setSpeed", speed })}
                className="aria-pressed:bg-accent aria-pressed:text-foreground focus-visible:ring-ring/50 h-11 min-w-11 rounded-full px-3 transition-colors outline-none focus-visible:ring-[3px]"
              >
                ×{speed}
              </button>
            ))}
          </div>
        </div>
      </header>
      <p role="note" className="bg-muted rounded-lg border px-3 py-2 text-sm">
        <GoalText star={game.star} />
      </p>
      <div className="grid items-start gap-4 md:grid-cols-[minmax(17.5rem,23.75rem)_1fr]">
        <StarPanel game={game} />
        <section aria-labelledby="stages-label" className="grid gap-2">
          <h2 id="stages-label" className="sr-only">
            燃焼段階
          </h2>
          {STAGE_IDS.map((stage) => (
            <StageCard key={stage} game={game} stage={stage} dispatch={dispatch} />
          ))}
        </section>
      </div>
      <section aria-labelledby="book-label" className="bg-card rounded-xl border p-4">
        <h2 id="book-label" className="sr-only">
          周期表・星屑・記録
        </h2>
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="table">周期表</TabsTrigger>
            <TabsTrigger value="shop">星屑</TabsTrigger>
            <TabsTrigger value="records">記録と次の層</TabsTrigger>
          </TabsList>
          <TabsContent value="table" className="pt-2">
            <PeriodicTableView meta={game.meta} />
          </TabsContent>
          <TabsContent value="shop" className="pt-2">
            <ShopView meta={game.meta} dispatch={dispatch} />
          </TabsContent>
          <TabsContent value="records" className="pt-2">
            <RecordsView meta={game.meta} />
          </TabsContent>
        </Tabs>
      </section>
      <footer className="text-muted-foreground pb-6 text-center text-sm">
        ×3 は確認用の早送りです。
      </footer>
      <SupernovaDialog game={game} onRebirth={startNextStar} />
    </main>
  );
}

function GoalText({ star }: { star: Star }) {
  const next = STAGE_IDS.find((stage) => !isIgnited(star, stage));
  if (next === undefined) {
    return (
      <>
        <b className="text-ignite">最後の30秒</b>
        ：残っているヘリウムや炭素を、欲しい元素に変えきろう
      </>
    );
  }
  const spec = STAGES[next];
  if (spec.final) {
    return (
      <>
        次の目標：<b className="text-ignite">{spec.name}</b>
        が始まると30秒でコアが崩壊する。それまでに外層の元素を育てておこう
      </>
    );
  }
  return (
    <>
      次の目標：<b className="text-ignite">{spec.name}</b>を点火する（コア温度{" "}
      {formatNumber(spec.ignition, "K")}）
    </>
  );
}
