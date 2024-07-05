# Authentication sequence

## For Magic Login

1. FE: Magic Login
2. User: email click action
3. FE: getIdToken from magic sdk
4. FE to BE: send login mutation with didToken
5. BE: validate didToken
6. BE: respond accessToken and refreshToken
7. FE: api request with accessToken

## For Wallet Login

1. FE to BE: send RequestWeb3Challenge
2. BE: respond message
3. FE: sign request with Metamask
4. User: Metamask sign
5. FE to BE: send login mutation with signature
6. BE: validate signature
7. respond accessToken and refreshToken
8. FE: api request with accessToken

# Authorization

Accessing the API by setting an accessToken in the Authorization header.  
Returns an error if the token has expired.  
Access refresh mutation with a refresh token, respond new accessToken.
Returns an error if the refreshToken has expired, re-login please.