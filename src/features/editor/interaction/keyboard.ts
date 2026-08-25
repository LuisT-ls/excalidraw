export function isTextInputTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;

  return Boolean(
    element &&
      (element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.isContentEditable),
  );
}

export function isDeletionKey(key: string): boolean {
  return key === "Delete" || key === "Backspace";
}
