import type { SceneElement } from "../editor/model/types";

export interface LibraryItem {
  id: string;
  name: string;
  elements: SceneElement[];
  thumbnail: string;
}
