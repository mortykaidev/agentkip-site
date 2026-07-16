import Link from "next/link";
import {
  ArchitectureStrip,
  ArrowIcon,
  GetKipStrip,
  OrbitBackdrop,
  ProductPhone,
  RunFlow,
} from "@/components/launch";

export default function HomePage() {
  return (
    <div className="launch-page">
      <section className="launch-hero" aria-labelledby="launch-title">
        <div className="launch-hero-copy">
          <h1 id="launch-title">
            <span>Your personal AI agent.</span>
            <span>On your iPhone.</span>
            <span>On your server.</span>
          </h1>
          <p className="launch-hero-subhead">
            Kip connects your iPhone to a Noggin you control, so your AI can help without becoming
            someone else&apos;s data.
          </p>
          <div className="launch-hero-actions">
            <Link href="/get" className="launch-primary-button">
              Get Kip
            </Link>
            <Link href="#how-it-works" className="launch-text-link">
              See how it works <ArrowIcon />
            </Link>
          </div>
        </div>

        <div className="launch-hero-device">
          <OrbitBackdrop />
          <ProductPhone priority />
        </div>
      </section>

      <RunFlow />
      <ArchitectureStrip />
      <GetKipStrip />
    </div>
  );
}
