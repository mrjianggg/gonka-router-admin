import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'
import http from 'node:http'
import https from 'node:https'

// The dev proxy reaches a Cloudflare-fronted backend whose AAAA record points
// to an IPv6 address most residential ISPs can't route. Without forcing IPv4
// the http-proxy hangs with ETIMEDOUT. Use explicit agents so every proxied
// request goes over IPv4 regardless of Node's default DNS ordering.
const ipv4Agent = {
  http: new http.Agent({ family: 4 }),
  https: new https.Agent({ family: 4 }),
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // VITE_PROXY_TARGET selects where /admin/* gets forwarded to during dev.
  // Use https://api.gonkascan.com to hit production, or http://localhost:4000
  // when running model-gateway locally via docker compose.
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:4000'

  return {
    plugins: [
      vue(),
      AutoImport({ resolvers: [ElementPlusResolver()] }),
      Components({ resolvers: [ElementPlusResolver()] }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: {
        '/admin': {
          target: proxyTarget,
          changeOrigin: true,
          // Allow proxying to HTTPS upstreams (Caddy / Let's Encrypt).
          secure: false,
          agent: proxyTarget.startsWith('https') ? ipv4Agent.https : ipv4Agent.http,
        },
      },
    },
  }
})
