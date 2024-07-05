import { createUnionType } from "type-graphql";
import { ArcadePart, Junk } from "@generated/type-graphql";

export const ExecuteExtractOutput = createUnionType({
  name: "ExecuteExtractOutput",
  types: () => [Junk, ArcadePart] as const,
  resolveType: (value) => {
    if ("ownerWalletAddress" in value) {
      return ArcadePart;
    }
    return Junk;
  },
});
