import type { Metadata } from "next";
import Image from "next/image";
import { getContent } from "@/lib/content";
import { Section, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "See Kip",
  description: "A simple look at Kip on iPhone.",
};

export default async function GalleryPage() {
  const gallery = await getContent("gallery");

  return (
    <Section className="py-16 sm:py-24">
      <SectionHeader
        kicker="Inside the app"
        title="See Kip in action"
        lead="Take a quick look at the iPhone app."
      />
      {gallery.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((item) => (
              <figure key={item.src} className="kip-card relative aspect-[9/19.5] overflow-hidden">
                <Image src={item.src} alt={item.alt} fill className="object-cover" />
                {item.caption ? (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-bg/80 px-3 py-2 text-xs text-ink-secondary backdrop-blur-sm">
                    {item.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
        </div>
      ) : (
        <div className="kip-card mt-10 max-w-xl p-7">
          <p className="font-semibold text-ink">More screens are coming.</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            We’ll add more views as the beta grows.
          </p>
        </div>
      )}
    </Section>
  );
}
