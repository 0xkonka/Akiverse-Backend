import RequestWeb3ChallengeResolver from "./request_web3_challenge";
import LoginResolver from "./login";
import TokenRefreshResolver from "./token_refresh";

const CustomAuthResolvers = [
  RequestWeb3ChallengeResolver,
  LoginResolver,
  TokenRefreshResolver,
];

export default CustomAuthResolvers;
