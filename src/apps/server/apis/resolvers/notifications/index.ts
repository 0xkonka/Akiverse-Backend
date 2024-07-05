import { CustomFindManyNotificationsResolver } from "./notifications";
import { CountNotificationsResolver } from "./notifications_count";

const CustomNotificationResolvers = [
  CustomFindManyNotificationsResolver,
  CountNotificationsResolver,
];

export default CustomNotificationResolvers;
