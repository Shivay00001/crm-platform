# CRM Platform backend — production-ready container image.
# Builds and runs the demo contacts API from backend/.
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY backend/src ./src
COPY backend/package.json ./
EXPOSE 8004
# API_KEY must be provided at runtime (Render env vars / docker -e).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||'8004')+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "src/index.js"]
