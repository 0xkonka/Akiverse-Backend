import { ArgsType, Field, InputType } from "type-graphql";
import {
  NotificationOrderByWithRelationInput,
  DateTimeFilter,
  EnumNotificationTypeFilter,
  StringNullableFilter,
  EnumNftTypeFilter,
} from "@generated/type-graphql";

@InputType()
class CurrentUserNotificationWhereInput {
  @Field(() => DateTimeFilter, { nullable: true })
  createdAt?: DateTimeFilter | undefined;

  @Field(() => EnumNotificationTypeFilter, { nullable: true })
  notificationType?: EnumNotificationTypeFilter | undefined;

  @Field(() => StringNullableFilter, { nullable: true })
  tokenId?: StringNullableFilter | undefined;

  @Field(() => EnumNftTypeFilter, { nullable: true })
  nftType?: EnumNftTypeFilter | undefined;
}

@ArgsType()
export class NotificationsArgs {
  @Field(() => CurrentUserNotificationWhereInput, { nullable: true })
  where?: CurrentUserNotificationWhereInput;

  @Field(() => NotificationOrderByWithRelationInput, { nullable: true })
  orderBy?: NotificationOrderByWithRelationInput[] | undefined;

  @Field(() => String, { nullable: true, description: "cursor is required id" })
  cursor?: string | undefined;

  @Field(() => Number, { nullable: true })
  take?: number | undefined;

  @Field(() => Number, { nullable: true })
  skip?: number | undefined;
}

@ArgsType()
export class NotificationsCountArgs {
  @Field(() => CurrentUserNotificationWhereInput, { nullable: true })
  where?: CurrentUserNotificationWhereInput;
}
