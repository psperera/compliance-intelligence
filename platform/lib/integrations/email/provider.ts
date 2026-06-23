// email/provider.ts — port interface for transactional email.
//
// PRODUCTION INTEGRATION: implement against Resend / SendGrid / SES in resend.ts and bind
// via EMAIL_PROVIDER env. The notification service depends only on this interface.

export interface EmailMessage {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text: string;
  /** Tags for delivery analytics / audit linkage (e.g. watchlistId, changeRef). */
  tags?: Record<string, string>;
}

export interface EmailResult {
  id: string;
  status: "SENT" | "FAILED";
  error?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}
