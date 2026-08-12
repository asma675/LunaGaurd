FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_CREATOR_LINKEDIN=
ARG NEXT_PUBLIC_CREATOR_GITHUB=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_CREATOR_LINKEDIN=${NEXT_PUBLIC_CREATOR_LINKEDIN}
ENV NEXT_PUBLIC_CREATOR_GITHUB=${NEXT_PUBLIC_CREATOR_GITHUB}
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN mkdir -p public
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
