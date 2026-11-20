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

type Props = { onReset: () => void };

/** 進行を消して最初からやり直す。消す前に確かめる */
export function ResetDialog({ onReset }: Props) {
  const [open, setOpen] = useState(false);
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
              onReset();
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
