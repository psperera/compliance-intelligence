// email/mock.ts — captures emails in memory instead of sending.
// Used by workers in dev and by tests to assert on dispatched messages.

import type { EmailProvider, EmailMessage, EmailResult } from "./provider";

export class MockEmailProvider implements EmailProvider {
  public readonly outbox: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<EmailResult> {
    this.outbox.push(message);
    // eslint-disable-next-line no-console
    console.log(`[mock-email] → ${message.to.join(", ")} :: ${message.subject}`);
    return { id: `mock-${this.outbox.length}`, status: "SENT" };
  }

  clear() { this.outbox.length = 0; }
}

export const mockEmailProvider = new MockEmailProvider();
