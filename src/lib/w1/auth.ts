import { auth } from "@clerk/nextjs/server";
import { w1Error } from "./errors";

export interface ClerkAuthPort {
  subject(): Promise<string | null | undefined>;
}

export const productionClerkAuth: ClerkAuthPort = {
  async subject() {
    const result = await auth();
    return result.userId;
  },
};

export async function requireClerkSubject(port: ClerkAuthPort = productionClerkAuth): Promise<string> {
  try {
    const subject = await port.subject();
    if (typeof subject !== "string" || subject.trim().length === 0) throw new Error("missing subject");
    return subject;
  } catch {
    throw w1Error("unauthorized");
  }
}
