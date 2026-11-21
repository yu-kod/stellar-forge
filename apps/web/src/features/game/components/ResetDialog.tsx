import { useId, useState } from "react";
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
import { GALAXIES } from "@/game/balance";
import { GALAXY_IDS, type Galaxy } from "@/game/types";

type Props = {
  onReset: (galaxy: Galaxy) => void;
  /** 次の周の銀河を選べるか（1回完結した後） */
  chooseGalaxy: boolean;
};

/** 進行を消して最初からやり直す。消す前に確かめる。1回完結した後は次の周の銀河を選ぶ */
export function ResetDialog({ onReset, chooseGalaxy }: Props) {
  const [open, setOpen] = useState(false);
  const [galaxy, setGalaxy] = useState<Galaxy>("milkyWay");
  const labelId = useId();
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
            星屑・発見した元素・記録がすべて消えます。元には戻せません。
          </DialogDescription>
        </DialogHeader>
        {chooseGalaxy && (
          <fieldset className="grid gap-2">
            <legend id={labelId} className="mb-1 text-sm font-medium">
              次の周の銀河
            </legend>
            <div role="radiogroup" aria-labelledby={labelId} className="grid gap-2">
              {GALAXY_IDS.map((id) => (
                <label
                  key={id}
                  className="has-focus-visible:ring-ring/50 has-checked:border-foreground/40 has-checked:bg-accent flex min-h-11 cursor-pointer items-start gap-2 rounded-md border p-3 text-sm has-focus-visible:ring-[3px]"
                >
                  <input
                    type="radio"
                    name="galaxy"
                    className="accent-ignite mt-1"
                    checked={galaxy === id}
                    onChange={() => setGalaxy(id)}
                  />
                  <span>
                    <b>{GALAXIES[id].name}</b>
                    <span className="text-muted-foreground block">
                      {GALAXIES[id].description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
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
