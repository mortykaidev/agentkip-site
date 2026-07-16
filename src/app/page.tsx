import Link from "next/link";
import { ArrowIcon, GetKipStrip, OrbitBackdrop, ProductPhone, RunFlow } from "@/components/launch";
import { CompareStrip, DemoSection, ScreensStrip } from "@/components/home-sections";

export default function HomePage() {
  return (
    <div className="launch-page">
      <section className="launch-hero" aria-labelledby="launch-title">
        <div className="launch-hero-copy">
          <h1 id="launch-title">
            <span>Your personal AI.</span>
            <span>On your iPhone.</span>
            <span>In your home.</span>
          </h1>
          <p className="launch-hero-subhead">
            An iPhone app with its brain on a small computer in your home — so your conversations
            stay yours.
          </p>
          <div className="launch-hero-actions">
            <Link href="/get" className="launch-primary-button">
              Get Kip
            </Link>
            <Link href="/how-it-works" className="launch-text-link">
              How it works <ArrowIcon />
            </Link>
          </div>
        </div>

        <div className="launch-hero-device">
          <OrbitBackdrop />
          <ProductPhone priority />
        </div>
      </section>

      <RunFlow />
      <DemoSection />
      <ScreensStrip />
      <CompareStrip />
      <GetKipStrip />
    </div>
  );
}
