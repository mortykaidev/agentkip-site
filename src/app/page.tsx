import Link from "next/link";
import { ArrowIcon, GetKipStrip, OrbitBackdrop, ProductPhone, RunFlow } from "@/components/launch";
import { BenefitsSection, CompareStrip, DemoSection, ScreensStrip } from "@/components/home-sections";
import { getContent } from "@/lib/content";

export default async function HomePage() {
  const [hero, benefits] = await Promise.all([getContent("hero"), getContent("homeBenefits")]);

  return (
    <div className="launch-page">
      <section className="launch-hero" aria-labelledby="launch-title">
        <div className="launch-hero-copy">
          {hero.announcement ? <p className="get-eyebrow mb-4">{hero.announcement}</p> : null}
          <h1 id="launch-title">{hero.headline}</h1>
          <p className="launch-hero-subhead">{hero.subhead}</p>
          <div className="launch-hero-actions">
            <Link href="/get" className="launch-primary-button">
              {hero.primaryCtaLabel}
            </Link>
            <Link href="/#what-kip-can-do" className="launch-text-link">
              {hero.secondaryCtaLabel} <ArrowIcon />
            </Link>
          </div>
        </div>

        <div className="launch-hero-device">
          <OrbitBackdrop />
          <ProductPhone priority />
        </div>
      </section>

      <RunFlow />
      <BenefitsSection benefits={benefits} />
      <DemoSection />
      <ScreensStrip />
      <CompareStrip />
      <GetKipStrip />
    </div>
  );
}
