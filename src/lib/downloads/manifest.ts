import {
  productionClerkAuth,
  requireClerkSubject,
  type ClerkAuthPort,
} from "@/lib/w1/auth";
import { w1Error } from "@/lib/w1/errors";
import { errorResponse, jsonResponse, makeRequestId } from "@/lib/w1/http";
import {
  createProductionW1ScopeFactory,
  createW1Services,
  type W1EntitlementRequestScope,
  type W1RequestScopeFactory,
} from "@/lib/w1/services";

const SUBJECT_SELECTOR_HEADERS = [
  "x-user-id",
  "x-clerk-user-id",
  "x-clerk-subject",
  "x-subject",
] as const;

function hasExactManifestSelector(request: Request): boolean {
  const url = new URL(request.url);
  const entries = [...url.searchParams.entries()];
  return (
    entries.length === 2 &&
    url.searchParams.getAll("platform").length === 1 &&
    url.searchParams.get("platform") === "macos" &&
    url.searchParams.getAll("architecture").length === 1 &&
    url.searchParams.get("architecture") === "arm64"
  );
}

async function closeScope(scope: W1EntitlementRequestScope | undefined): Promise<void> {
  try {
    await scope?.close();
  } catch {
    // The fail-closed response has already been selected; never expose close details.
  }
}

export function createDownloadManifestHandler(
  factory: W1RequestScopeFactory = createProductionW1ScopeFactory(),
  clerk: ClerkAuthPort = productionClerkAuth,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const requestId = makeRequestId(request);
    let scope: W1EntitlementRequestScope | undefined;
    try {
      const subject = await requireClerkSubject(clerk);
      if (
        !hasExactManifestSelector(request) ||
        SUBJECT_SELECTOR_HEADERS.some((name) => request.headers.has(name))
      ) {
        throw w1Error("invalid_selector");
      }

      scope = await factory.create("entitlement");
      const result = await createW1Services({ repository: scope.repository }).getEntitlement(subject);
      if (result.entitlement.status !== "active") {
        throw w1Error("active_entitlement_required");
      }

      return jsonResponse({ ready: false }, requestId);
    } catch (error) {
      return errorResponse(error, requestId, "entitlement");
    } finally {
      await closeScope(scope);
    }
  };
}

export const downloadManifest = createDownloadManifestHandler();
