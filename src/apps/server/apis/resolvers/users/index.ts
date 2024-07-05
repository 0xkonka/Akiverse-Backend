import RegisterWalletAddressResolver from "./reqister_wallet_address";
import UpdateUserResolver from "./update_user_resolver";
import CreateUserResolver from "./create_user_resolver";
import CurrentUserResolver from "./current_user_resolver";

const CustomUserResolvers = [
  RegisterWalletAddressResolver,
  UpdateUserResolver,
  CreateUserResolver,
  CurrentUserResolver,
];

export default CustomUserResolvers;
