import nodemailer from "nodemailer";
import { env } from "@/env.js";
import { logger } from "@/framework/support/logger.js";

type MailPayload = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

const transport = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: false,
  auth: env.MAIL_USERNAME ? { user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD } : undefined
});

export const mail = {
  /**
   * Why: Sends transactional email through configured SMTP transport.
   * When: Features need notifications/password reset/signup email.
   * Where: Jobs and event handlers.
   * How: Uses nodemailer transport and respects MAIL_FAIL_SILENT behavior.
   */
  async sendMail(payload: MailPayload) {
    try {
      return await transport.sendMail({
        from: env.MAIL_FROM_ADDRESS,
        ...payload
      });
    } catch (error) {
      logger.error("Mail send failed", {
        to: payload.to,
        subject: payload.subject,
        error: error instanceof Error ? error.message : error
      });

      if (!env.MAIL_FAIL_SILENT) throw error;
      return null;
    }
  }
};
