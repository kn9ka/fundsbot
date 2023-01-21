FROM node:16.14.0-buster-slim as build

## подменяем баш на sh, чтобы верно определять енвы в проектах
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

COPY . /tmp/workspace
WORKDIR /tmp/workspace

RUN npm set progress=false && npm ci
CMD ["npm", "start"]
