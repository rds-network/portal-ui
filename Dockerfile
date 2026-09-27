# Define the node environment
FROM node:22-alpine

ARG NPM_TOKEN
ARG GIT_SHA=dev
ARG BUILD_NUMBER=local
ENV GITHUB_RUSSIAN_RS_NPM_TOKEN=$NPM_TOKEN

COPY . /src
WORKDIR /src

RUN apk --no-cache add curl

RUN mkdir -p public \
 && SHORT_SHA=$(printf '%s' "$GIT_SHA" | cut -c1-7) \
 && printf '{"build":"%s","sha":"%s"}\n' "$BUILD_NUMBER" "$SHORT_SHA" > public/build-info.json

RUN npm install
RUN npm run build

EXPOSE 3000

CMD [ "node", "server.js" ]
