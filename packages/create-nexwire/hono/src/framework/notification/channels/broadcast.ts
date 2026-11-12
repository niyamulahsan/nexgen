// ./src/framework/notification/channels/broadcast.ts

import { dispatchEvent } from "@/framework/events/dispatcher.js";
import type { NotificationChannel } from "@/framework/notification/contracts.js";

export const broadcastChannel: NotificationChannel = {
  name: "broadcast",
  async send(target, notification, options) {
    if (!options.broadcast) return false;

    await dispatchEvent("notification.created", notification, {
      broadcast: { users: [target.id] }
    });

    return true;
  }
};
