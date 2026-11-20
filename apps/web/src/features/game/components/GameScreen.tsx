import { createJsonStorage, type JsonStorage } from "@app/web-core";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AGB_SECONDS,
  AUTO_REBIRTH_AFTER,
  LAYER2_AFTER,
  SHOP,
  STAGES,
  WHITE_DWARF_HYDROGEN,
} from "@/game/balance";
import { canAutoRebirth, canBuyShopItem, rebirth } from "@/game/actions";
import { nextShopGoal } from "@/game/goal";
import { nextRDiscovery } from "@/game/merger";
import { nextSDiscovery } from "@/game/sprocess";
import { isIgnited } from "@/game/rates";
import { finalStageSeconds, isLowMass } from "@/game/step";
import { createGame } from "@/game/star";
import { SHOP_IDS, STAGE_IDS, type GameState } from "@/game/types";
import { currencyName, targetHint } from "../elements";
import { formatDuration, formatMass, formatNumber } from "../format";
import { createModel, gameReducer, type Action, type Model, type Speed } from "../model";
import { restoreSave, SAVE_KEY, toSave } from "../save";
import { animationFrameTicker, type Ticker } from "../ticker";
import { Notices } from "./Notices";
import { PeriodicTableView } from "./PeriodicTableView";
import { RecordsView } from "./RecordsView";
import { ResetDialog } from "./ResetDialog";
import { RProcessPanel } from "./RProcessPanel";
import { ShopView } from "./ShopView";
import { ClusterPanel } from "./ClusterPanel";
import { MassPicker } from "./MassPicker";
import { elementOf } from "../periodicTable";
import { SProcessPanel } from "./SProcessPanel";
import { StageCard } from "./StageCard";
import { TargetPicker } from "./TargetPicker";
import { StarPanel } from "./StarPanel";
import { SupernovaDialog } from "./SupernovaDialog";

type Props = {
  /** 始める状態。省略すると保存した進行（なければ第1世代の星）から */
  initial?: GameState;
  /** 時間の進め方。テストでは手で進めるものに差し替える */
  ticker?: Ticker;
  /** 進行の保存先 */
  storage?: JsonStorage;
  /** 今の時刻 [ms]。保存した時刻と留守中の進行に使う */
  now?: () => number;
  /** 確認用の早送り（×3）を出すか。開発中だけ出す */
  showSpeed?: boolean;
};

type Tab = "star" | "cluster" | "sprocess" | "rprocess" | "shop" | "table" | "records";
const SPEEDS: Speed[] = [1, 3];
const SAVE_EVERY_MS = 5000;
/** これより短い留守は知らせない [秒] */
const browserStorage = createJsonStorage();

function initialModel(
  initial: GameState | undefined,
  storage: JsonStorage,
  now: () => number
): Model {
  if (initial) return createModel(initial);
  const restored = restoreSave(storage.get(SAVE_KEY), now());
  if (!restored) return createModel(createGame());
  return gameReducer(createModel(restored.game), { type: "away", seconds: restored.awaySeconds });
}

export function GameScreen({
  initial,
  ticker = animationFrameTicker,
  storage = browserStorage,
  now = Date.now,
  showSpeed = import.meta.env.DEV,
}: Props) {
  const [model, dispatch] = useReducer(gameReducer, null, () =>
    initialModel(initial, storage, now)
  );
  const [tab, setTab] = useState<Tab>("star");
  const { game } = model;
  const latest = useRef(game);
  const lastSaved = useRef(-Infinity);

  useEffect(() => ticker((seconds) => dispatch({ type: "tick", seconds })), [ticker]);
  const dismiss = useCallback((id: number) => dispatch({ type: "dismiss", id }), []);

  // 5秒ごとに保存する。星屑の交換や次の星など大事な操作の直後は待たずに保存する
  useEffect(() => {
    latest.current = game;
    if (now() - lastSaved.current < SAVE_EVERY_MS) return;
    lastSaved.current = now();
    storage.set(SAVE_KEY, toSave(game, lastSaved.current));
  }, [game, storage, now]);

  // ページを離れる・タブが裏に回るときにも保存する（モバイルでは閉じる前に必ず hidden になる）
  useEffect(() => {
    function saveNow() {
      lastSaved.current = now();
      storage.set(SAVE_KEY, toSave(latest.current, lastSaved.current));
    }
    // タブが裏に回っている間は画面が止まるので、表に戻ったら離れていた時間をまとめて進める
    let hiddenAt: number | null = null;
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        saveNow();
        hiddenAt = now();
      } else if (hiddenAt !== null) {
        dispatch({ type: "away", seconds: (now() - hiddenAt) / 1000 });
        hiddenAt = null;
      }
    }
    window.addEventListener("pagehide", saveNow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", saveNow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [storage, now]);

  function dispatchAndSave(action: Action) {
    lastSaved.current = -Infinity;
    dispatch(action);
  }

  // 次の星を生んだら、交換できる強化があるときだけ星屑のタブを開く
  function startNextStar() {
    dispatchAndSave({ type: "rebirth" });
    if (SHOP_IDS.some((item) => canBuyShopItem(rebirth(game).meta, item))) setTab("shop");
  }

  function reset() {
    dispatchAndSave({ type: "reset" });
    setTab("star");
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-3 py-4 sm:px-4">
      <Notices notices={model.notices} onDismiss={dismiss} />
      {model.away && (
        <p
          role="status"
          aria-label="留守の間の進み具合"
          className="bg-card text-muted-foreground rounded-xl border px-4 py-2 text-sm"
        >
          留守の間を進めています（あと {formatDuration(model.away.remaining)}）
        </p>
      )}
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl tracking-wider sm:text-3xl">星の炉</h1>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <p className="font-mono tabular-nums">
            第{game.star.generation}世代の星・{Math.floor(game.star.time)}秒
          </p>
          {showSpeed && (
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
          )}
        </div>
      </header>
      <p role="note" className="bg-muted rounded-lg border px-3 py-2 text-sm">
        <GoalText game={game} />
      </p>
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="min-w-0 gap-3">
        <TabsList
          aria-label="画面"
          className="w-full max-w-full justify-start overflow-x-auto sm:w-fit"
        >
          <TabsTrigger value="star">星</TabsTrigger>
          {game.meta.cluster.length > 0 && <TabsTrigger value="cluster">星団</TabsTrigger>}
          {game.meta.sProcess.unlocked && <TabsTrigger value="sprocess">s過程</TabsTrigger>}
          {game.meta.rProcess.unlocked && <TabsTrigger value="rprocess">r過程</TabsTrigger>}
          <TabsTrigger value="shop">星屑</TabsTrigger>
          <TabsTrigger value="table">周期表</TabsTrigger>
          <TabsTrigger value="records">記録</TabsTrigger>
        </TabsList>
        <TabsContent value="star">
          <div className="grid items-start gap-4 md:grid-cols-[minmax(17.5rem,23.75rem)_1fr]">
            <StarPanel game={game} />
            <section
              aria-labelledby="stages-label"
              className="order-first grid gap-2 md:order-none"
            >
              <h2 id="stages-label" className="sr-only">
                燃焼段階
              </h2>
              {game.meta.supernovae >= LAYER2_AFTER && (
                <MassPicker meta={game.meta} dispatch={dispatch} />
              )}
              <TargetPicker meta={game.meta} dispatch={dispatch} />
              {game.meta.supernovae >= AUTO_REBIRTH_AFTER && (
                <label className="text-muted-foreground flex h-11 items-center gap-2 px-1 text-sm">
                  <input
                    type="checkbox"
                    className="accent-ignite size-4"
                    checked={game.meta.autoRebirth}
                    onChange={(e) => dispatch({ type: "setAutoRebirth", on: e.target.checked })}
                  />
                  超新星のあと自動で次の星を生む
                </label>
              )}
              {STAGE_IDS.map((stage) => (
                <StageCard key={stage} game={game} stage={stage} dispatch={dispatch} />
              ))}
            </section>
          </div>
        </TabsContent>
        <TabsContent value="cluster">
          <ClusterPanel meta={game.meta} dispatch={dispatch} />
        </TabsContent>
        <TabsContent value="sprocess">
          <SProcessPanel meta={game.meta} dispatch={dispatchAndSave} />
        </TabsContent>
        <TabsContent value="rprocess">
          <RProcessPanel meta={game.meta} dispatch={dispatchAndSave} />
        </TabsContent>
        <TabsContent value="shop" className="bg-card rounded-xl border p-4">
          <ShopView meta={game.meta} dispatch={dispatchAndSave} />
        </TabsContent>
        <TabsContent value="table" className="bg-card rounded-xl border p-4">
          <PeriodicTableView meta={game.meta} />
        </TabsContent>
        <TabsContent value="records" className="bg-card rounded-xl border p-4">
          <RecordsView meta={game.meta} />
        </TabsContent>
      </Tabs>
      <footer className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 pb-6 text-sm">
        <p>進行はこのブラウザに保存されます。</p>
        <ResetDialog onReset={reset} />
      </footer>
      <SupernovaDialog game={game} onRebirth={startNextStar} dispatch={dispatch} />
    </main>
  );
}

function GoalText({ game }: { game: GameState }) {
  const { meta, star } = game;
  if (isLowMass(star) && star.agbStartedAt !== null) {
    const left = Math.max(0, Math.ceil(AGB_SECONDS - (star.time - star.agbStartedAt)));
    return (
      <>
        <b className="text-ignite">漸近巨星分枝星</b>：あと {left} 秒で外層を放って白色矮星になる
      </>
    );
  }
  if (isLowMass(star)) {
    return (
      <>
        外層の水素が{" "}
        <b className="text-ignite">{formatMass(WHITE_DWARF_HYDROGEN * star.initialMass)}</b>{" "}
        を下回ると白色矮星になる。それまでにヘリウムを炭素・酸素に変えよう
      </>
    );
  }
  const next = STAGE_IDS.find((stage) => !isIgnited(star, stage));
  if (meta.supernovae === 0 || (next === undefined && !canAutoRebirth(meta))) {
    return <RunGoal game={game} />;
  }
  const goal = nextShopGoal(meta);
  const spec = SHOP[goal.item];
  if (!goal.affordable && meta.rProcess.unlocked) return <RProcessGoal meta={meta} />;
  if (!goal.affordable && meta.sProcess.unlocked) return <SProcessGoal meta={meta} />;
  if (goal.affordable) {
    return (
      <>
        <b className="text-ignite">星屑タブ</b>で「{spec.name}」と交換できる
      </>
    );
  }
  return (
    <>
      次の目標：「<b className="text-ignite">{spec.name}</b>」まで{currencyName(spec.currency)} あと{" "}
      {formatNumber(goal.shortfall)}
      {targetHint(spec.currency)}
    </>
  );
}

/** 第4層の目標：r過程で次に作る元素 */
function RProcessGoal({ meta }: { meta: GameState["meta"] }) {
  const next = nextRDiscovery(meta.rProcess);
  if (!next) return <>r過程：金まで作った</>;
  const element = elementOf(next.z);
  return (
    <>
      r過程：次は{" "}
      <b className="text-ignite">
        {element.name}（{element.symbol}）
      </b>
      を作る（{Math.floor(next.progress * 100)}%）
    </>
  );
}

/** 第3層の目標：s過程で次に見つける元素 */
function SProcessGoal({ meta }: { meta: GameState["meta"] }) {
  if (meta.sProcess.looped) {
    return (
      <>
        <b className="text-ignite">第3層クリア</b>
        ：s過程はビスマスで行き止まり。金は中性子星合体で作る
      </>
    );
  }
  const next = nextSDiscovery(meta.sProcess);
  if (!next) return <>s過程：ビスマスまで見つけた。ビスマスが中性子を捕まえて鉛へ戻るのを待つ</>;
  const element = elementOf(next.z);
  return (
    <>
      s過程：次は{" "}
      <b className="text-ignite">
        {element.name}（{element.symbol}）
      </b>
      を見つける（{Math.floor(next.progress * 100)}%）
    </>
  );
}

/** 星の中の目標（最初の星と、最後の数十秒） */
function RunGoal({ game: { meta, star } }: { game: GameState }) {
  const next = STAGE_IDS.find((stage) => !isIgnited(star, stage));
  if (next === undefined) {
    return (
      <>
        <b className="text-ignite">最後の{Math.round(finalStageSeconds(meta))}秒</b>
        ：強化の費用が4分の1になる。貯めたエネルギーで、残りを欲しい元素に変えきろう
      </>
    );
  }
  const spec = STAGES[next];
  if (spec.final) {
    return (
      <>
        次の目標：<b className="text-ignite">{spec.name}</b>
        が始まると{Math.round(finalStageSeconds(meta))}
        秒でコアが崩壊する。それまでに外層の元素を育てておこう
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
