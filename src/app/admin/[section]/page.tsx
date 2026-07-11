import { notFound } from "next/navigation";
import { MessagesTable, WaitlistTable } from "@/app/admin/_components/admin-tables";
import { SectionEditor } from "@/app/admin/_components/section-editor";
import { findAdminSection } from "@/app/admin/_lib/sections";
import { Pill } from "@/components/ui";
import { DEFAULT_CONTENT } from "@/content/defaults";
import { getStore } from "@/lib/store";
import { getErrorMessage } from "@/lib/store-types";

/* One admin surface per slug: a content-section editor, or the submission tables.
   The admin gate lives in the layout AND inside every server action. */

function SectionHeading({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
        {badge}
      </div>
      <p className="mt-1.5 text-sm text-ink-secondary">{description}</p>
    </div>
  );
}

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (section === "waitlist") {
    return (
      <div>
        <SectionHeading
          title="Waitlist"
          description="Everyone who joined the waitlist from the public forms."
        />
        <WaitlistTable />
      </div>
    );
  }

  if (section === "messages") {
    return (
      <div>
        <SectionHeading
          title="Contact messages"
          description="Submissions from the /contact form."
        />
        <MessagesTable />
      </div>
    );
  }

  const definition = findAdminSection(section);
  if (!definition) notFound();

  let stored: unknown = null;
  let storeError: string | null = null;
  try {
    stored = await getStore().getSection(definition.key);
  } catch (error) {
    storeError = getErrorMessage(error);
  }

  const isCustomized = stored !== null;
  const value = stored ?? DEFAULT_CONTENT[definition.key];

  return (
    <div>
      <SectionHeading
        title={definition.title}
        description={definition.description}
        badge={isCustomized ? <Pill tone="mint">Customized</Pill> : <Pill tone="outline">Defaults</Pill>}
      />

      {storeError ? (
        <p className="mb-5 rounded-[10px] bg-elevated px-3.5 py-2.5 text-sm text-danger" role="alert">
          Couldn&apos;t read the saved version ({storeError}) — editing the seeded defaults
          instead.
        </p>
      ) : null}

      <SectionEditor
        sectionKey={definition.key}
        spec={definition.spec}
        initialValue={value}
        blobEnabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
      />
    </div>
  );
}
