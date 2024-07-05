import { Inject, Service } from "typedi";
import { Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { ListBoxItemsOutput } from "./outputs/list_box_items";
import { ExtractUseCase } from "../../../../../use_cases/extract_usecase";
import { toResolverError } from "../errors";
import { sum } from "../../../../../utils";

@Service()
@Resolver()
export class ListBoxItemsResolver {
  constructor(
    @Inject("extract.useCase")
    private readonly useCase: ExtractUseCase,
  ) {}

  @Authorized()
  @Query(() => ListBoxItemsOutput)
  async listExtractInventory(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<ListBoxItemsOutput> {
    ctx = ctx.getChildContext(info);
    try {
      const ret = await this.useCase.listBoxItems(ctx);
      const featuredItems = ret.filter((v) => {
        // Featured ItemかつJunkじゃない
        return v.isFeaturedItem && !v.isJunk;
      });
      const otherItems = ret.filter((v) => {
        // Featured Itemじゃない かつ Junkじゃない
        return !v.isFeaturedItem && !v.isJunk;
      });
      const totalAmount = sum(ret.map((v) => v.amount));
      return new ListBoxItemsOutput(featuredItems, otherItems, totalAmount);
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
