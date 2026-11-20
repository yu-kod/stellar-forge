import { ErrorBoundary } from "@/features/game/components/ErrorBoundary";
import { GameScreen } from "@/features/game/components/GameScreen";

export default function GamePage() {
  return (
    <ErrorBoundary>
      <GameScreen />
    </ErrorBoundary>
  );
}
