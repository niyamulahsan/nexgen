// ./src/framework/notification/contracts.ts

import type { NotifiableTarget, NotificationRecord } from "@/framework/providers/contracts.js";

export type NotificationTarget = number | string | NotifiableTarget;
export type NormalizedTarget = { type: string; id: number | string };

export type NotificationOptions = {
  type?: string;
  title: string;
  body?: string;
  link?: string;
  data?: Record<string, unknown>;

  // Built-in Channels
  broadcast?: boolean;
  mail?: {
    to?: string;
    subject?: string;
    html?: string;
  };

  // Extensible: Add any custom channel options here (e.g., sms, push, discord)
  sms?: { to?: string; message?: string };
  push?: { token?: string; payload?: any };
};

export interface NotificationChannel {
  name: string;
  send(target: NormalizedTarget, notification: NotificationRecord, options: NotificationOptions): Promise<boolean>;
}
