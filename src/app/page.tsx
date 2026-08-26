import { Canvas } from "@/components/whiteboard/Canvas";
import { Menu } from "@/components/whiteboard/Menu";
import { PropertiesPanel } from "@/components/whiteboard/PropertiesPanel";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { SharedSceneBanner } from "@/components/whiteboard/SharedSceneBanner";

export default function HomePage() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#fafaf9] dark:bg-slate-950">
      <SharedSceneBanner />
      <Canvas />
      <div className="absolute left-4 top-4 z-20">
        <Menu />
      </div>
      <PropertiesPanel />
      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
        <div className="pointer-events-auto">
          <Toolbar />
        </div>
      </div>
    </main>
  );
}
