const { Expo } = require("expo-server-sdk");
const DeviceToken = require("../models/deviceTokenModel");

const expo = new Expo();

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


    // Promotional notifications only go to opted-in devices.
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

            if (
              ticket.details?.error === "DeviceNotRegistered"
            ) {
              const failedMessage = chunk[index];

              DeviceToken.updateOne(
                {
                  expoPushToken: failedMessage.to,
                },
                {
                  $set: { isActive: false },
                }
              ).catch(console.error);
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