// ./src/framework/notification/channels/mail.ts

import { dispatchEvent } from "@/framework/events/dispatcher.js";
import type { NotificationChannel } from "@/framework/notification/contracts.js";
import { resolveAuthProvider } from "@/framework/providers/adapter.js";
import { redisClientIfReady } from "@/framework/redis/client.js";
import { mail } from "@/framework/support/mail.js";

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const mailChannel: NotificationChannel = {
  name: "mail",
  async send(target, notification, options) {
    if (!options.mail) return false;

    let to = options.mail.to || null;
    if (!to) {
      try {
        const provider = await resolveAuthProvider();
        if (provider?.getUserContact) {
          const contact = await provider.getUserContact(target.id);
          if (contact?.email) to = contact.email as string;
        }
      } catch {}
    }

    if (!to) return false;

    const subject = options.mail.subject || notification.title;
    const html =
      options.mail.html ||
      `<h2>${escapeHtml(notification.title)}</h2>${notification.body ? `<p>${escapeHtml(notification.body)}</p>` : ""}`;

    if (redisClientIfReady()) {
      await dispatchEvent("notification:mail", { to, subject, html }, { queue: "mail" });
    } else {
      await mail.sendMail({ to, subject, html });
    }

    return true;
  }
};
