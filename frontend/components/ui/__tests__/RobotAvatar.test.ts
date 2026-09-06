import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "../UserAvatar";
import { BotBadge, RobotAvatar } from "../RobotAvatar";

describe("RobotAvatar", () => {
  it("renders an accessible robot graphic", () => {
    const html = renderToStaticMarkup(
      createElement(RobotAvatar, { name: "AnAI 1.3 Pro", className: "h-9 w-9" }),
    );
    expect(html).toContain("robot avatar");
    expect(html).toContain("AnAI 1.3 Pro");
    expect(html).toContain("<svg");
    expect(html).toContain("#BBE331");
    expect(html).toContain("#ED7FB8");
  });

  it("is used by UserAvatar when isBot is set", () => {
    const html = renderToStaticMarkup(
      createElement(UserAvatar, {
        name: "AnAI 1.3 Pro",
        avatarUrl: "https://example.com/ignored.png",
        isBot: true,
      }),
    );
    expect(html).toContain("robot avatar");
    expect(html).not.toContain("https://example.com/ignored.png");
  });

  it("renders a compact Bot badge", () => {
    const html = renderToStaticMarkup(createElement(BotBadge));
    expect(html).toContain("Bot");
  });
});
