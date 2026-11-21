import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Galaxy } from "@/game/types";
import { GalaxyPicker } from "./GalaxyPicker";

type Props = {
  onReset: (galaxy: Galaxy) => void;
  /** 次の周の銀河を選べるか（1回完結した後） */
  chooseGalaxy: boolean;
};

/** 進行を消して最初からやり直す。消す前に確かめる。1回完結した後は次の周の銀河を選ぶ */
export function ResetDialog({ onReset, chooseGalaxy }: Props) {
  const [open, setOpen] = useState(false);
  const [galaxy, setGalaxy] = useState<Galaxy>("milkyWay");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-muted-foreground h-11">
          最初からやり直す
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>最初からやり直しますか？</DialogTitle>
          <DialogDescription>
            星屑・発見した元素・超新星の記録が消えます。記録への挑戦（完結の回数と最速）は残ります。元には戻せません。
          </DialogDescription>
        </DialogHeader>
        {chooseGalaxy && <GalaxyPicker value={galaxy} onChange={setGalaxy} />}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11">
              やめる
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="h-11"
            onClick={() => {
              onReset(galaxy);
              setOpen(false);
            }}
          >
            消してやり直す
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
