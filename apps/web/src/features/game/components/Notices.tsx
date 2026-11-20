import { useEffect } from "react";
import { STAGES } from "@/game/balance";
import { ELEMENTS } from "../elements";
import { formatNumber } from "../format";
import type { Notice, NoticeEvent } from "../model";

const NOTICE_MS = 4200;

type Props = { notices: Notice[]; onDismiss: (id: number) => void };

/** 点火・新元素・新しい星を、画面の上に少しのあいだ出す */
export function Notices({ notices, onDismiss }: Props) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed top-3 left-1/2 z-30 grid w-[min(92vw,26rem)] -translate-x-1/2 gap-1.5"
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
    case "away":
      return (
        <>
          留守のあいだに <b className="text-ignite">{Math.round(event.seconds / 60)}分</b>{" "}
          ぶん星が燃えた
        </>
      );
  }
}
