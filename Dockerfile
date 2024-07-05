FROM node:20.8.1-alpine as base
FROM base as builder

ARG NODE_AUTH_TOKEN
#ENV NODE_OPTIONS "--max-old-space-size=4096"

WORKDIR /app
RUN apk update && apk add postgresql-client python3 make gcc g++ openssl3 && rm -rf /var/cache/apk/*

COPY package.json yarn.lock .npmrc ./
RUN yarn install --immutable

COPY . .
RUN rm .npmrc

RUN NODE_OPTIONS="--max-old-space-size=4096" yarn generate

RUN NODE_OPTIONS="--max-old-space-size=4096" /app/node_modules/.bin/webpack

FROM base as runner
WORKDIR /app
COPY --from=builder /app/dist/schema.prisma /app/dist/*.node ./
COPY --from=builder /app/node_modules ./node_modules

FROM runner as server
WORKDIR /app
COPY --from=builder /app/dist/server.js  ./
CMD node server.js

FROM runner as confirmer
WORKDIR /app
COPY --from=builder /app/dist/confirmer.js  ./
CMD node confirmer.js

FROM runner as executor
WORKDIR /app
COPY --from=builder /app/dist/executor.js ./
CMD node executor.js

FROM runner as fee_collector
WORKDIR /app
COPY --from=builder /app/dist/fee_collector.js  ./
CMD node fee_collector.js

FROM runner as play_manager
WORKDIR /app
COPY --from=builder /app/dist/play_manager.js ./
CMD node play_manager.js

FROM runner as watcher
WORKDIR /app
COPY --from=builder /app/dist/watcher.js ./
CMD node watcher.js

FROM runner as pfp_icon_checker
WORKDIR /app
COPY --from=builder /app/dist/pfp_icon_checker.js  ./
CMD node pfp_icon_checker.js


FROM runner as migration
WORKDIR /app
COPY --from=builder /app/prisma ./prisma
WORKDIR /app/prisma
CMD /app/node_modules/.bin/prisma migrate deploy

FROM runner as rovi_tournament_manager
WORKDIR /app
COPY --from=builder /app/dist/rovi_tournament_manager.js  ./
CMD node rovi_tournament_manager.js

FROM runner as paid_tournament_manager
WORKDIR /app
COPY --from=builder /app/dist/paid_tournament_manager.js  ./
CMD node paid_tournament_manager.js
