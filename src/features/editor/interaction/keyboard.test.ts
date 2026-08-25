import { describe, expect, it } from "vitest";
import { isDeletionKey, isTextInputTarget } from "./keyboard";

describe("keyboard helpers", () => {
  it("reconhece Delete e Backspace", () => {
    expect(isDeletionKey("Delete")).toBe(true);
    expect(isDeletionKey("Backspace")).toBe(true);
    expect(isDeletionKey("Enter")).toBe(false);
  });

  it("ignora atalhos quando o foco está em campos de texto", () => {
    expect(isTextInputTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isTextInputTarget({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true);
    expect(isTextInputTarget({ tagName: "CANVAS" } as unknown as EventTarget)).toBe(false);
    expect(isTextInputTarget(null)).toBe(false);
  });
});
