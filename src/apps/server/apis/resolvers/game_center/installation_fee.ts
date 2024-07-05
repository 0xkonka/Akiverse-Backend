import { FieldResolver, Resolver } from "type-graphql";
import { GameCenter } from "@generated/type-graphql";
import { Service } from "typedi";
import { INSTALLATION_FEE_OF_DAY } from "../../../../../constants";
import { DecimalJSScalar } from "@generated/type-graphql/scalars";
import { getInstallingFee } from "../../../../../helpers/fee";

@Service()
@Resolver(() => GameCenter)
export default class InstallationFeeFieldResolver {
  @FieldResolver(() => DecimalJSScalar)
  dailyInstallationFee() {
    return INSTALLATION_FEE_OF_DAY;
  }

  @FieldResolver(() => DecimalJSScalar)
  installationFee() {
    return getInstallingFee();
  }
}
