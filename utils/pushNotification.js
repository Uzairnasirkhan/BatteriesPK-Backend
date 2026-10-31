const DeviceToken = require("../models/deviceTokenModel");

// Dynamically load the ESM-only Expo SDK
let expoSdkPromise;
let expoClientPromise;

const getExpoSdk = () => {
  if (!expoSdkPromise) {
    expoSdkPromise = import("expo-server-sdk");
  }

  return expoSdkPromise;
};

// Reuse one Expo client
const getExpoClient = async () => {
  if (!expoClientPromise) {
    expoClientPromise = getExpoSdk().then(({ Expo }) => new Expo());
  }

  return expoClientPromise;
};

const sendPushToUser = async ({
  userId,
  title,
  message,
  data = {},
  marketing = false,
}) => {
  try {
    // Load SDK and Expo client
    const { Expo } = await getExpoSdk();
    const expo = await getExpoClient();

    const filter = {
      user: userId,
      isActive: true,
      notificationsEnabled: true,
    };

    // Promotional notifications only go to opted-in devices
    if (marketing) {
      filter.marketingEnabled = true;
    }

    const devices = await DeviceToken.find(filter);

    if (!devices.length) {
      return;
    }

    const messages = [];

    for (const device of devices) {
      const pushToken = device.expoPushToken;

      if (!Expo.isExpoPushToken(pushToken)) {
        console.warn("Invalid Expo push token:", pushToken);

        device.isActive = false;
        await device.save();

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

    if (!messages.length) {
      return;
    }

    // Split messages into Expo-supported chunks
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);

        tickets.forEach((ticket, index) => {
          if (ticket.status === "error") {
            console.error(
              "Expo push error:",
              ticket.message,
              ticket.details
            );

            if (ticket.details?.error === "DeviceNotRegistered") {
              const failedMessage = chunk[index];

              DeviceToken.updateOne(
                {
                  expoPushToken: failedMessage.to,
                },
                {
                  $set: {
                    isActive: false,
                  },
                }
              ).catch((error) => {
                console.error(
                  "Failed to deactivate invalid device:",
                  error
                );
              });
            }
          }
        });
      } catch (error) {
        console.error("Expo push batch error:", error);
      }
    }
  } catch (error) {
    console.error("Send push notification error:", error);
  }
};

module.exports = {
  sendPushToUser,
};