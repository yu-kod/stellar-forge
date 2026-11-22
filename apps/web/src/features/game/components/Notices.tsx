import { reachName } from "@/game/merger";
import { LIGHT_SITES } from "@/game/light";
import { useEffect } from "react";
import { STAGES } from "@/game/balance";
import { ELEMENTS } from "../elements";
import { formatDuration, formatNumber } from "../format";
import type { Notice, NoticeEvent } from "../model";
import { elementOf } from "../periodicTable";

/** 安定な同位体のない元素（s過程の証拠） */
const TECHNETIUM = 43;

const TECHNETIUM_NOTE =
  "。テクネチウムには安定な同位体がない。1952年に赤色巨星のスペクトルで見つかり、星の中でいまも元素が作られている証拠になった";

/** トリウム・ウラン（年齢の時計） */
const isClock = (z: number) => z === 90 || z === 92;
const CLOCK_NOTE =
  "。ウラン238（半減期45億年）とトリウム232（140億年）の比は、古い星の年齢を測る時計になる";

const NOTICE_MS = 4200;

type Props = { notices: Notice[]; onDismiss: (id: number) => void };

/** 点火・新元素・新しい星を、画面の上に少しのあいだ出す */
/** 留守の間に増えたもの（「。超新星 120 回・白色矮星 30 個」）。どちらもなければ空 */
function awayCounts(supernovae: number, whiteDwarfs: number): string {
  const parts = [
    supernovae > 0 ? `超新星 ${formatNumber(supernovae)} 回` : null,
    whiteDwarfs > 0 ? `白色矮星 ${formatNumber(whiteDwarfs)} 個` : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? `。${parts.join("・")}` : "";
}

export function Notices({ notices, onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-label="知らせ"
      className="pointer-events-none fixed bottom-3 left-1/2 z-30 grid w-[min(92vw,26rem)] -translate-x-1/2 gap-1.5 sm:top-3 sm:bottom-auto"
    >
      {notices.map((notice) => (
        <NoticeItem key={notice.id} notice={notice} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function NoticeItem({ notice, onDismiss }: { notice: Notice; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notice.id), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice.id, onDismiss]);

  return (
    <p className="bg-popover border-ignite motion-safe:animate-pop rounded-lg border px-3 py-2 text-sm">
      <NoticeText event={notice.event} />
    </p>
  );
}

function NoticeText({ event }: { event: NoticeEvent }) {
  switch (event.type) {
    case "ignite": {
      const stage = STAGES[event.stage];
      return (
        <>
          <b className="text-ignite">{stage.name} 点火</b>{" "}
          <span className="font-mono">{formatNumber(stage.ignition, "K")}</span>
        </>
      );
    }
    case "discover": {
      const element = ELEMENTS[event.element];
      return (
        <>
          <b className="text-ignite">
            新元素 {element.name}（{event.element}）
          </b>{" "}
          {element.discovery}
        </>
      );
    }
    case "born":
      return <>第{event.generation}世代の星が生まれた。星屑で恒久強化を買おう</>;
    case "supernova": {
      const total = Object.values(event.gain).reduce((sum, n) => sum + n, 0);
      return (
        <>
          <b className="text-ignite">
            第{event.generation}世代 {event.end === "whiteDwarf" ? "白色矮星" : "超新星"}
          </b>{" "}
          星屑 +{formatNumber(total)}
        </>
      );
    }
    case "sDiscover": {
      const element = elementOf(event.z);
      return (
        <>
          <b className="text-ignite">
            新元素 {element.name}（{element.symbol}）
          </b>{" "}
          s過程で作った
          {event.z === TECHNETIUM && TECHNETIUM_NOTE}
        </>
      );
    }
    case "light": {
      const element = elementOf(event.z);
      return (
        <>
          <b className="text-ignite">
            新元素 {element.name}（{element.symbol}）
          </b>{" "}
          {LIGHT_SITES[event.z]}
        </>
      );
    }
    case "merger":
      return event.blackHole ? (
        <>
          中性子星が合体してすぐ<b className="text-ignite">ブラックホール</b>
          になった。放出物はわずか
        </>
      ) : (
        <>
          <b className="text-ignite">キロノバ（{event.reach > 56 ? "赤" : "青"}）</b>
          ：中性子星合体の r過程が
          {reachName(event.reach)}に届いた
        </>
      );
    case "rDiscover": {
      const element = elementOf(event.z);
      return (
        <>
          <b className="text-ignite">
            新元素 {element.name}（{element.symbol}）
          </b>{" "}
          中性子星合体で作った
          {isClock(event.z) && CLOCK_NOTE}
        </>
      );
    }
    case "burst": {
      const names = event.zs.map((z) => {
        const element = elementOf(z);
        return `${element.name}（${element.symbol}）`;
      });
      return (
        <>
          <b className="text-ignite">
            新元素 {event.zs.length}つ：{names.join("・")}
          </b>{" "}
          {event.process === "s" ? "s過程で作った" : "中性子星合体で作った"}
          {event.process === "s" && event.zs.includes(TECHNETIUM) && TECHNETIUM_NOTE}
          {event.process === "r" && event.zs.some(isClock) && CLOCK_NOTE}
        </>
      );
    }
    case "layer4Unlocked":
      return (
        <>
          <b className="text-ignite">第4層</b>
          ：中性子星合体が始まった。r過程タブで中性子星を2つ組もう
        </>
      );
    case "sLoop":
      return (
        <>
          <b className="text-ignite">第3層クリア</b>：ビスマス → ポロニウム →
          鉛の循環を見た。s過程はここで行き止まり
        </>
      );
    case "layer3Unlocked":
      return (
        <>
          <b className="text-ignite">第3層</b>：s過程が始まった。白色矮星で
          Ia型超新星を起こし、鉄の種を入れよう
        </>
      );
    case "layer2Unlocked":
      return (
        <>
          <b className="text-ignite">第2層</b>：次に生む星の質量を選べるようになった。8 M☉
          未満の星は白色矮星になる
        </>
      );
    case "autoShopReady":
      return (
        <>
          <b className="text-ignite">燃焼の自動制御</b>
          ：星屑タブの「交換できるものを自動で交換する」を ON にすると、目を離しても強化が進む
        </>
      );
    case "autoRebirthUnlocked":
      return <>超新星10回。これからは超新星のあと自動で次の星が生まれる（切り替えられる）</>;
    case "away":
      return (
        <>
          留守のあいだに <b className="text-ignite">{formatDuration(event.seconds)}</b>{" "}
          ぶん星が燃えた
          {awayCounts(event.supernovae, event.whiteDwarfs)}
        </>
      );
  }
}
