import { VideoPreview } from "@/components/VideoPreview";
import {
  Circle,
  Confetti,
  Deco,
  DottedBlock,
  HalfCircle,
  Squiggle,
  Triangle,
  Zigzag,
} from "@/components/MemphisShapes";

const ROUTES = [
  {
    route: "POST /api/script",
    description: "Generate a voice-over script with OpenAI or Gemini.",
    bg: "bg-sky",
    shadow: "shadow-block-accent",
    Shape: Circle,
    shapeColor: "text-brand",
    tilt: "-rotate-1",
  },
  {
    route: "POST /api/tts",
    description: "Turn text into an MP3 with ElevenLabs, saved under /public/audio.",
    bg: "bg-pink",
    shadow: "shadow-block-sun",
    Shape: Triangle,
    shapeColor: "text-accent",
    tilt: "rotate-1",
  },
  {
    route: "POST /api/render",
    description: "Render the PromoVideo composition to ./out with Remotion.",
    bg: "bg-mint",
    shadow: "shadow-block-brand",
    Shape: HalfCircle,
    shapeColor: "text-sun",
    tilt: "-rotate-1",
  },
] as const;

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 overflow-x-clip px-6 py-16 sm:px-10">
      {/* Background decoration: big shapes cropped by the viewport edges */}
      <Deco className="-top-16 -right-24 h-72 w-72 text-sun sm:-right-32 sm:h-96 sm:w-96">
        <Circle className="h-full w-full" />
      </Deco>
      <Deco className="top-[46rem] -left-20 h-40 w-40 rotate-12 text-lilac sm:top-[38rem]">
        <DottedBlock className="h-full w-full" />
      </Deco>
      <Deco className="-bottom-6 -right-10 h-48 w-48 -rotate-12 text-accent">
        <Triangle className="h-full w-full" />
      </Deco>
      <Deco className="bottom-8 left-1/2 hidden w-56 sm:block">
        <Zigzag className="w-full" stroke="#006dd8" />
      </Deco>
      <Deco className="top-96 right-2 hidden w-52 sm:block">
        <Confetti className="w-full" />
      </Deco>
      <Deco className="top-2 right-24 w-32 sm:hidden">
        <Confetti className="w-full" />
      </Deco>

      <header className="relative flex flex-col gap-6">
        <span className="block-outline w-fit rounded-pill bg-sun px-4 py-1.5 font-mono text-sm font-bold tracking-wide text-ink uppercase">
          Tectonic × SD Worx
        </span>

        <h1 className="text-display max-w-4xl text-5xl text-ink sm:text-7xl">
          AI video generator that{" "}
          <span className="relative mt-3 inline-block -rotate-2 bg-brand px-4 py-2 text-paper shadow-block-lg-accent">
            makes work work
          </span>
        </h1>

        <Squiggle className="w-40 text-accent" stroke="#f1002f" />

        <p className="max-w-2xl text-lg leading-relaxed text-body">
          Next.js app with Remotion for video, ElevenLabs for voices, and OpenAI / Google Gemini
          for scripts. Edit the composition in{" "}
          <code className="border-2 border-ink bg-surface px-1.5 py-0.5 font-mono text-sm text-ink">
            src/remotion
          </code>
          .
        </p>
      </header>

      <section className="relative">
        <Deco className="-top-8 -left-8 h-20 w-20 text-accent">
          <Circle className="h-full w-full" />
        </Deco>
        <Deco className="-right-14 -bottom-9 w-40 rotate-6">
          <Zigzag className="w-full" stroke="#0b0b12" />
        </Deco>
        <div className="block-outline relative bg-surface p-2 shadow-block-lg sm:p-3">
          <VideoPreview />
        </div>
      </section>

      <section className="grid gap-8 sm:grid-cols-3 sm:gap-6">
        {ROUTES.map(({ route, description, bg, shadow, Shape, shapeColor, tilt }) => (
          <article
            key={route}
            className={`relative border-3 border-ink ${bg} ${shadow} ${tilt} p-5 transition-transform hover:translate-x-1 hover:-translate-y-1 hover:rotate-0`}
          >
            <Shape className={`absolute -top-5 -right-3 h-11 w-11 ${shapeColor}`} />
            <code className="font-mono text-sm font-bold text-ink">{route}</code>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">{description}</p>
          </article>
        ))}
      </section>

      <footer className="relative flex flex-wrap items-center gap-4 border-t-3 border-ink pt-6 text-sm text-body">
        <span className="flex items-center gap-2" aria-hidden>
          <span className="h-4 w-4 border-2 border-ink bg-brand" />
          <span className="h-4 w-4 rounded-full border-2 border-ink bg-accent" />
          <Triangle className="h-5 w-5 text-sun" />
        </span>
        <span>
          SD Worx palette, Memphis Milano treatment.{" "}
          <a
            href="https://github.com/lregaladohdez/tectonic-sdworx/blob/main/docs/STYLE.md"
            className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4 hover:bg-sun"
          >
            Style guide
          </a>
        </span>
      </footer>
    </main>
  );
}
