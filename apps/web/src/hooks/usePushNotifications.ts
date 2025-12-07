"use client";

import { ENV } from "@/config/env";
import { PushService } from "@/features/foundations/push/data/PushService";
import { useCurrentUserContext } from "@/features/foundations/user/contexts/CurrentUserContext";
import { AuthRole } from "@/permisions/enums/AuthRole";
import { useEffect } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function usePushNotifications(): void {
  const { currentUser, hasRole } = useCurrentUserContext();

  useEffect(() => {
    const register = async () => {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          // Check if we've already processed push notifications for this user in this session
          const sessionKey = `push_registered_${currentUser?.id}`;
          const lastRegisteredSubscription = sessionStorage.getItem(sessionKey);

          const registration = await navigator.serviceWorker.register(`${ENV.APP_URL}/sw.js`);

          // Check current permission status first
          let permission = Notification.permission;

          // Only request permission if it's not already determined
          if (permission === "default") {
            permission = await Notification.requestPermission();
          }

          if (permission !== "granted") {
            return; // User denied permission, this is not an error
          }

          const vapidPublicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
          const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

          await navigator.serviceWorker.ready;

          let subscription = await registration.pushManager.getSubscription();
          if (!subscription) {
            const appServerKey = new Uint8Array(Array.from(convertedKey));

            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: appServerKey,
            });
          }

          const plainSubscription = {
            endpoint: subscription.endpoint,
            keys: subscription.toJSON().keys,
          };

          // Create a simple hash to detect subscription changes
          const subscriptionHash = btoa(JSON.stringify(plainSubscription));

          // Only call the API if subscription has changed or this is the first registration
          if (lastRegisteredSubscription !== subscriptionHash) {
            await PushService.register({ data: plainSubscription });
            // Store the current subscription hash to avoid duplicate registrations
            sessionStorage.setItem(sessionKey, subscriptionHash);
          }
        } catch (error) {
          console.error("Error during service worker registration or push subscription:", error);
        }
      }
    };

    if (currentUser && !hasRole(AuthRole.Administrator)) register();
  }, [currentUser]);
}
