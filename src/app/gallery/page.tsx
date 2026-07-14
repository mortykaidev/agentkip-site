import type { Metadata } from "next";
import Image from "next/image";
import { getContent } from "@/lib/content";
import { Section, PageHeader } from "@/components/ui";
import { OrbitMark } from "@/components/brand";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Screenshots and clips of AgentKip in action.",
};

export default async function GalleryPage() {
  const gallery = await getContent("gallery");

  return (
    <Section className="py-16 sm:py-24">
      <PageHeader
        kicker="Gallery"
        title="See it in action"
        lead="Screenshots and clips from the app, updated as the beta grows."
      />
      <div className="mt-10">
        {gallery.length > 0
          ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{gallery.map((item) => (
              <figure key={item.src} className="kip-card relative aspect-[9/19.5] overflow-hidden">
                <Image src={item.src} alt={item.alt} fill className="object-cover" />
                {item.caption ? (
                  <figcaption className="absolute inset-x-0 bottom-0 border-t border-hairline bg-bg px-3 py-2 text-xs text-ink-secondary">
                    {item.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}</div>
          : <div className="kip-card flex min-h-64 max-w-2xl flex-col items-center justify-center gap-4 border-dashed p-8 text-center">
              <OrbitMark size={54} />
              <p className="max-w-sm text-sm leading-relaxed text-ink-secondary">Real media is being prepared. This gallery will stay intentionally empty until it can show the actual product.</p>
            </div>}
      </div>
    </Section>
  );
}
