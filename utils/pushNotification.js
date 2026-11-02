const DeviceToken = require("../models/deviceTokenModel");

// Dynamically load the ESM-only Expo SDK.
let expoSdkPromise;
let expoClientPromise;

const getExpoSdk = () => {
  if (!expoSdkPromise) {
    expoSdkPromise = import("expo-server-sdk");
  }

  return expoSdkPromise;
};

const getExpoClient = async () => {
  if (!expoClientPromise) {
    expoClientPromise = getExpoSdk().then(
      ({ Expo }) => new Expo()
    );
  }

  return expoClientPromise;
};

/**
 * Sends a push notification to the supplied device records.
 *
 * Returns Expo submission statistics. An accepted ticket is not
 * confirmation that the notification was displayed on the device.
 */
const sendPushToDevices = async ({
  devices,
  title,
  message,
  data = {},
}) => {
  const result = {
    deviceCount: devices.length,
    attemptedCount: 0,
    acceptedCount: 0,
    failedCount: 0,
    invalidTokenCount: 0,
  };

  if (!devices.length) {
    return result;
  }

  try {
    const { Expo } = await getExpoSdk();
    const expo = await getExpoClient();

    const messages = [];

    for (const device of devices) {
      const pushToken = device.expoPushToken;

      if (!Expo.isExpoPushToken(pushToken)) {
        result.invalidTokenCount += 1;
        result.failedCount += 1;

        await DeviceToken.updateOne(
          { _id: device._id },
          { $set: { isActive: false } }
        );

        continue;
      }

      messages.push({
        to: pushToken,
        sound: "default",
        title,
        body: message,
        data,
        channelId: "default",
        priority: "high",
      });
    }

    result.attemptedCount = messages.length;

    if (!messages.length) {
      return result;
    }

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);

        for (let index = 0; index < chunk.length; index += 1) {
          const ticket = tickets[index];

          if (ticket?.status === "ok") {
            result.acceptedCount += 1;
            continue;
          }

          result.failedCount += 1;

          if (ticket?.details?.error === "DeviceNotRegistered") {
            result.invalidTokenCount += 1;

            await DeviceToken.updateOne(
              { expoPushToken: chunk[index].to },
              { $set: { isActive: false } }
            );
          }

          if (ticket) {
            console.error(
              "Expo push ticket error:",
              ticket.message,
              ticket.details
            );
          } else {
            console.error("Expo did not return a ticket for a message.");
          }
        }
      } catch (error) {
        console.error("Expo push batch error:", error);

        // The batch could not be submitted successfully.
        result.failedCount += chunk.length;
      }
    }
  } catch (error) {
    console.error("Send push notification error:", error);

    // If SDK initialization fails, no message was accepted.
    result.failedCount += result.attemptedCount || 0;
  }

  return result;
};

/**
 * Existing helper used by individual order/account notifications.
 */
const sendPushToUser = async ({
  userId,
  title,
  message,
  data = {},
  marketing = false,
}) => {
  try {
    const filter = {
      user: userId,
      isActive: true,
      notificationsEnabled: true,
    };

    // Retain the old behaviour for existing callers that explicitly
    // request marketing filtering. Campaigns use sendPushToDevices().
    if (marketing) {
      filter.marketingEnabled = true;
    }

    const devices = await DeviceToken.find(filter);

    return await sendPushToDevices({
      devices,
      title,
      message,
      data,
    });
  } catch (error) {
    console.error("Send push to user error:", error);

    return {
      deviceCount: 0,
      attemptedCount: 0,
      acceptedCount: 0,
      failedCount: 0,
      invalidTokenCount: 0,
    };
  }
};

module.exports = {
  sendPushToUser,
  sendPushToDevices,
};