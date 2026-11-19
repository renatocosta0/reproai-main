import type { CareNotification } from "@/lib/notifications";

export const NOTIFICATIONS_UPDATED_EVENT = "reproai:notifications-updated";

export interface NotificationsUpdatedDetail {
  notifications: CareNotification[];
  unreadCount: number;
}

let latestUpdate: NotificationsUpdatedDetail | null = null;

export function publishNotificationsUpdated(detail: NotificationsUpdatedDetail) {
  latestUpdate = detail;
  window.dispatchEvent(new CustomEvent<NotificationsUpdatedDetail>(NOTIFICATIONS_UPDATED_EVENT, { detail }));
}

export function getLatestNotificationsUpdate() {
  return latestUpdate;
}
