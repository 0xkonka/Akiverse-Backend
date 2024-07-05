import { Args, Ctx, Query, Resolver } from "type-graphql";
import { CheckVersionInput } from "./inputs/check_version_input";
import { Context } from "../../../../../context";
import { Service } from "typedi";
import { CheckVersionOutput } from "./outputs/check_version_output";

@Service()
@Resolver()
export default class CheckVersionResolver {
  @Query(() => CheckVersionOutput)
  async checkVersion(@Args() args: CheckVersionInput, @Ctx() ctx: Context) {
    const ret = await ctx.prisma.appVersion.findUnique({
      where: {
        os_version: {
          os: args.os,
          version: args.version,
        },
      },
    });
    // 存在しない時は通常状態として返す
    if (!ret) {
      return new CheckVersionOutput(false);
    }
    return new CheckVersionOutput(ret.underReview);
  }
}
