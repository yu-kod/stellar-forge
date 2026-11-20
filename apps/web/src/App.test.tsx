import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { renderWithProviders } from "./test-utils/render";

describe("App", () => {
  it("/ でゲームの画面を表示する", () => {
    renderWithProviders(<App />, { route: "/" });

    expect(screen.getByRole("heading", { level: 1, name: "星の炉" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "水素燃焼" })).toBeInTheDocument();
  });

  it("存在しない URL では「ページが見つからない」を表示し、トップへ戻れる", async () => {
    const { user } = renderWithProviders(<App />, { route: "/no-such-page" });

    expect(screen.getByRole("heading", { name: "ページが見つからない" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "トップへ戻る" }));

    expect(screen.getByRole("heading", { level: 1, name: "星の炉" })).toBeInTheDocument();
  });
});
