import EnterTournament from "./enter_tournament";
import PaidTournamentPrizeResolver from "./prize";
import { ListPaidTournamentRankings } from "./list_paid_tournament_rankings";
import BadgeResolver from "./badge";
import ClaimStatusResolver from "./claim_status";
import ClaimPrizeResolver from "./claim_prize";
import PaidTournamentsResolver from "./paid_tournaments";
import AdminPaidTournamentsResolver from "./admin_paid_tournaments";

const CustomPaidTournamentResolvers = [
  EnterTournament,
  PaidTournamentPrizeResolver,
  ListPaidTournamentRankings,
  BadgeResolver,
  ClaimStatusResolver,
  ClaimPrizeResolver,
  PaidTournamentsResolver,
  AdminPaidTournamentsResolver,
];

export default CustomPaidTournamentResolvers;
