import { WhiteboardApp } from "@/components/whiteboard/WhiteboardApp";

export default function HomePage() {
  return (
    <>
      <div className="sr-only">
        <h1>Garranchos — quadro branco com estilo desenhado à mão</h1>
        <p>
          Desenhe, crie diagramas e organize ideias em um quadro branco
          gratuito, com estilo desenhado à mão e sem login.
        </p>
      </div>
      <WhiteboardApp />
    </>
  );
}
