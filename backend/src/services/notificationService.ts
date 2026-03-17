import admin from 'firebase-admin';

// Expo push notification helper (no external SDK needed)
interface ExpoPushMessage {
  to: string;
  sound?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

// Initialize Firebase Admin (lazy — only if credentials are set)
function initFirebase() {
  if (admin.apps.length) return true;
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.warn('Firebase credentials not set — FCM push disabled');
    return false;
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
  return true;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendFCMNotification(fcmToken: string, payload: PushPayload) {
  if (!initFirebase()) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'prize-wins' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });
  } catch (err) {
    console.error('FCM send error:', err);
  }
}

export async function sendExpoPushNotification(expoPushToken: string, payload: PushPayload) {
  if (!expoPushToken.startsWith('ExponentPushToken[')) return;
  try {
    const message: ExpoPushMessage = {
      to: expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
    };
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([message]),
    });
  } catch (err) {
    console.error('Expo push error:', err);
  }
}

export async function sendWinNotification(
  fcmToken: string | null,
  expoPushToken: string | null,
  bondNumber: string,
  prizeAmount: number,
  drawNumber: number,
  prizeRank: number
) {
  const payload: PushPayload = {
    title: '🎉 আপনার প্রাইজবন্ড জিতেছে!',
    body: `বন্ড নং ${bondNumber} — ${prizeRank}ম পুরস্কার: ৳${prizeAmount.toLocaleString()}`,
    data: {
      type: 'WIN',
      bondNumber,
      drawNumber: String(drawNumber),
      prizeAmount: String(prizeAmount),
      prizeRank: String(prizeRank),
    },
  };

  const promises: Promise<void>[] = [];
  if (fcmToken) promises.push(sendFCMNotification(fcmToken, payload));
  if (expoPushToken) promises.push(sendExpoPushNotification(expoPushToken, payload));
  await Promise.allSettled(promises);
}
