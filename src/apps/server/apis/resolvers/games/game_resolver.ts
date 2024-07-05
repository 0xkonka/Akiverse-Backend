import "reflect-metadata";

import { MetadataUseCase } from "../../../../../use_cases/metadata_usecase";
import { Inject, Service } from "typedi";
import { Args, Ctx, Info, Query, Resolver } from "type-graphql";
import { Games } from "../outputs/game";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import * as crypto from "node:crypto";
import { ListGamesInput } from "./inputs/list_games_input";

@Service()
@Resolver(() => Games)
export class GameResolver {
  version: string;
  games: Games;
  constructor(
    @Inject("metadata.useCase") private readonly useCase: MetadataUseCase,
  ) {
    const ret = useCase.getGames();
    const jsonString = JSON.stringify(ret);
    this.version = crypto.createHash("sha256").update(jsonString).digest("hex");
    this.games = new Games(this.version, ret);
  }

  @Query(() => Games, { nullable: true })
  listGames(
    @Ctx() ctx: Context,
    @Args() args: ListGamesInput,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (args.version === this.version) {
      return null;
    }
    return this.games;
  }
}
