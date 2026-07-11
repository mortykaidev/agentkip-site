import { deleteContactMessage, deleteWaitlistEntry } from "@/lib/actions";
import { getStore } from "@/lib/store";
import { getErrorMessage, type ContactMessageEntry, type WaitlistEntry } from "@/lib/store-types";

type Loaded<T> = { ok: true; data: T } | { ok: false; message: string };

async function loadWaitlist(): Promise<Loaded<WaitlistEntry[]>> {
  try {
    return { ok: true, data: await getStore().listWaitlist() };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

async function loadContactMessages(): Promise<Loaded<ContactMessageEntry[]>> {
  try {
    return { ok: true, data: await getStore().listContactMessages() };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

/* Server-rendered submission viewers for /admin/waitlist and /admin/messages.
   Stacked rows (not <table>) so they read well on a phone. */

const DELETE_BUTTON =
  "kip-press shrink-0 rounded-[10px] border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-hairline-strong hover:text-danger";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="kip-card p-5">
      <p className="text-sm text-danger" role="alert">
        Couldn&apos;t load entries: {message}
      </p>
    </div>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <p className="rounded-[10px] border border-dashed border-hairline px-4 py-8 text-center text-sm text-ink-muted">
      {label}
    </p>
  );
}

export async function WaitlistTable() {
  const result = await loadWaitlist();
  if (!result.ok) return <ErrorCard message={result.message} />;
  const entries = result.data;
  if (entries.length === 0) return <EmptyCard label="No waitlist signups yet." />;
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-secondary">
        {entries.length} {entries.length === 1 ? "signup" : "signups"}
      </p>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className="kip-card flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{entry.email}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{formatDate(entry.createdAt)}</p>
            </div>
            <form action={deleteWaitlistEntry}>
              <input type="hidden" name="id" value={entry.id} />
              <button type="submit" className={DELETE_BUTTON}>
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function MessagesTable() {
  const result = await loadContactMessages();
  if (!result.ok) return <ErrorCard message={result.message} />;
  const messages = result.data;
  if (messages.length === 0) return <EmptyCard label="No contact messages yet." />;
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-secondary">
        {messages.length} {messages.length === 1 ? "message" : "messages"}
      </p>
      <ul className="space-y-2">
        {messages.map((message) => (
          <li key={message.id} className="kip-card space-y-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{message.name}</p>
                <a
                  href={`mailto:${message.email}`}
                  className="block truncate text-xs text-ink-secondary hover:text-ink"
                >
                  {message.email}
                </a>
              </div>
              <form action={deleteContactMessage}>
                <input type="hidden" name="id" value={message.id} />
                <button type="submit" className={DELETE_BUTTON}>
                  Delete
                </button>
              </form>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
              {message.message}
            </p>
            <p className="text-xs text-ink-muted">{formatDate(message.createdAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
