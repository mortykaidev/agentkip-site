import type { Metadata } from "next";
import Image from "next/image";
import { getContent } from "@/lib/content";
import { Section, SectionHeader } from "@/components/ui";
import { OrbitMark } from "@/components/brand";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Screenshots and clips of AgentKip in action.",
};

const PLACEHOLDER_COUNT = 6;

export default async function GalleryPage() {
  const gallery = await getContent("gallery");

  return (
    <Section className="py-16 sm:py-24">
      <SectionHeader
        kicker="Gallery"
        title="See it in action"
        lead="Screenshots and clips from the app, updated as the beta grows."
      />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {gallery.length > 0
          ? gallery.map((item) => (
              <figure key={item.src} className="kip-card relative aspect-[9/19.5] overflow-hidden">
                <Image src={item.src} alt={item.alt} fill className="object-cover" />
                {item.caption ? (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-bg/80 px-3 py-2 text-xs text-ink-secondary backdrop-blur-sm">
                    {item.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))
          : Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
              <div
                key={i}
                className="kip-card flex aspect-[9/19.5] flex-col items-center justify-center gap-3 bg-elevated p-4 text-center"
              >
                <OrbitMark size={44} />
                <p className="text-xs leading-relaxed text-ink-muted">
                  Screenshots coming soon — the app is camera-shy until TestFlight.
                </p>
              </div>
            ))}
      </div>
    </Section>
  );
}
