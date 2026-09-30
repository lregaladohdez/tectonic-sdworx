import { Composition, staticFile } from "remotion";
import "../app/globals.css";
import { PromoVideo } from "./compositions/PromoVideo";
import { promoVideoSchema, PROMO_VIDEO } from "./compositions/PromoVideo.schema";
import { DemoVideo } from "./compositions/DemoVideo";
import { demoVideoSchema, DEMO_VIDEO } from "./compositions/DemoVideo.schema";

/** True when the static file exists and is an image (the dev server answers 200 for unknown paths). */
async function imageExists(file: string): Promise<boolean> {
  try {
    const res = await fetch(staticFile(file), { method: "HEAD" });
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

export const RemotionRoot = () => (
  <>
    <Composition
      id={PROMO_VIDEO.id}
      component={PromoVideo}
      schema={promoVideoSchema}
      durationInFrames={PROMO_VIDEO.durationInFrames}
      fps={PROMO_VIDEO.fps}
      width={PROMO_VIDEO.width}
      height={PROMO_VIDEO.height}
      defaultProps={PROMO_VIDEO.defaultProps}
    />
    <Composition
      id={DEMO_VIDEO.id}
      component={DemoVideo}
      schema={demoVideoSchema}
      durationInFrames={DEMO_VIDEO.durationInFrames}
      fps={DEMO_VIDEO.fps}
      width={DEMO_VIDEO.width}
      height={DEMO_VIDEO.height}
      defaultProps={DEMO_VIDEO.defaultProps}
      calculateMetadata={async ({ props }) => ({
        props: {
          ...props,
          aikido: { before: await imageExists("aikido/before.png"), after: await imageExists("aikido/after.png") },
        },
      })}
    />
  </>
);
