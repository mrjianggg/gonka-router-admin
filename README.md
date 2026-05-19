# Gonka Router Admin

Vue 3 后台管理控制台,对接 `model-gateway` 的 `/admin/*` 接口。

## 功能 (Phase 1)

- 登录(用户名 + 密码)
- Dashboard:每日请求数 / Token 消耗 / 收入 / 活跃用户 / 新增用户 + 日趋势图 + 模型使用占比
- 用户管理:列表(钱包地址 / API Key / 注册时间 / 请求数 / Tokens / 余额 / 累计充值)、详情(按模型 token 拆分)
- 占位 5 项指标(成功率 / TTFT / 平均延迟 / Stream 中断率 / QPS)— Phase 2 实现

## 本地运行

### 1. 后端 (model-gateway)

`.env` 需要新增以下三项(`.env.example` 已包含):

```bash
ADMIN_USERNAME=

ADMIN_PASSWORD_HASH=
# 可选:独立的 admin JWT 签名密钥
ADMIN_JWT_SECRET=
```

**别忘了** 把前端开发地址加入 `CORS_ORIGINS`:

```bash
CORS_ORIGINS=http://localhost:5173,https://your-prod-admin.example.com
```

启动后端(本地或容器):

```bash
cd model-gateway
docker compose --profile prod up -d --build   # 生产
# 或本地
go run ./cmd/gateway
```

### 2. 前端

```bash
cd gonka-router-admin
cp .env.example .env.local       # 把后端地址改成你的实际地址
npm install
npm run dev                      # http://localhost:5173
```


### 3. 生产构建

```bash
npm run build      # 产物在 dist/
```

把 `dist/` 部署到任意静态服务器(nginx / Caddy / Cloudflare Pages)即可,通过 `VITE_API_BASE_URL` 指向后端域名。

## 修改 admin 密码

```bash
# 用 htpasswd:
htpasswd -nbB admin '你的新密码' | cut -d: -f2

# 或写一个 Go 小程序:
cat > /tmp/h.go <<'GO'
package main
import (
  "fmt"
  "golang.org/x/crypto/bcrypt"
)
func main() {
  h, _ := bcrypt.GenerateFromPassword([]byte("你的新密码"), bcrypt.DefaultCost)
  fmt.Println(string(h))
}
GO
go run /tmp/h.go
```

将输出的哈希填入 `ADMIN_PASSWORD_HASH`,重启后端即可。

## API 路由

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/admin/login` | 用户名密码登录 |
| GET | `/admin/stats/overview` | 总览(总用户/请求/Token/收入 + 今日数据) |
| GET | `/admin/stats/daily?days=14` | 日趋势(请求/Token/收入/新增/活跃) |
| GET | `/admin/stats/models?days=30` | 按模型分组的 Token 占比 |
| GET | `/admin/users?page=&page_size=&q=&channel=` | 用户列表 |
| GET | `/admin/users/:id` | 用户详情 |

所有 `/admin/*` 除登录外,需带 `Authorization: Bearer <token>`。

## 技术栈

- Vue 3 + Vite + Pinia + Vue Router 4
- Element Plus(UI)
- ECharts(图表)
- axios(HTTP)
