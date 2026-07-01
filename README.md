# 星幕电影推荐与票务系统

一个基于 **React + TypeScript + Express + MySQL + Docker** 的电影推荐与票务系统课程项目。系统区分普通用户和管理员，普通用户负责浏览电影、选座购票和本地评论，管理员负责票房统计、用户管理、订单管理、数据报表和同步真实热门电影。

## 功能概览

### 用户端

- JWT 登录与用户注册
- 首页电影推荐：热门、同城热映、评分最高
- DeepSeek 电影助手：结合本地片库、评分和评论样本回答热门、风评与推荐问题
- TMDB 近两年热门电影展示，单次最多同步 60 部
- 电影详情：海报、简介、评分、上映年份、本地评论区
- 本地评论：用户可对每部电影打分并发布短评
- 每部电影包含 2 至 4 条明确标识的演示评论，重复同步不会重复添加
- 影院场次查询
- SVG 可视化选座
- 座位状态：可选、已售、锁定、故障、已选
- 创建订单、15 分钟支付倒计时、模拟支付
- 用户中心：会员等级、积分、余额、偏好标签、我的订单

### 管理端

- 管理员 JWT 登录
- 实时票房统计
- 上座率、订单数、用户增长数据
- 用户管理
- 订单管理
- 热门影片排行
- 数据报表与系统日志
- 手动同步 TMDB 近两年热门电影

## 技术栈

- 前端：React 19、TypeScript、Vite
- 后端：Node.js、Express、TypeScript
- 数据库：MySQL 8
- 鉴权：JWT
- 外部电影数据：TMDB API
- 部署：Docker Compose
- 测试：Node.js built-in test runner

## 项目结构

```txt
.
├── db/                    # MySQL 初始化脚本
├── docs/                  # 设计文档和实施计划
├── server/                # Express 后端
│   ├── domain/            # 领域逻辑和测试
│   ├── db.ts              # MySQL 连接池
│   ├── index.ts           # 服务入口
│   └── routes.ts          # REST API
├── src/                   # React 前端
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## 环境变量

复制 `.env.example` 为 `.env`，然后填入自己的 TMDB 配置。

```bash
cp .env.example .env
```

`.env` 不会提交到 git，避免泄露 API Token。

```env
TMDB_ACCESS_TOKEN=你的_TMDB_Read_Access_Token
TMDB_API_KEY=你的_TMDB_API_Key
DEEPSEEK_API_KEY=你的_DeepSeek_API_Key
DEEPSEEK_MODEL=deepseek-v4-flash
```

## 快速启动

```bash
docker compose up --build -d
```

启动完成后访问：

```txt
http://localhost:3000
```

停止服务：

```bash
docker compose down
```

如果需要清空数据库并重新初始化：

```bash
docker compose down -v
docker compose up --build -d
```

## 默认账号

普通用户：

```txt
账号：demo
密码：demo
```

管理员：

```txt
账号：admin
密码：admin123
```

也可以在登录页选择“用户注册”，注册的新账号只会拥有普通用户权限。

## 常用命令

安装依赖：

```bash
npm install
```

运行测试：

```bash
npm test
```

构建项目：

```bash
npm run build
```

本地开发前端：

```bash
npm run dev
```

本地开发后端：

```bash
npm run server:dev
```

## API 简要说明

认证：

- `POST /api/auth/login`：登录并返回 JWT
- `POST /api/auth/register`：注册普通用户并返回 JWT
- `GET /api/users/me`：获取当前登录用户

电影：

- `GET /api/movies`：电影列表
- `GET /api/movies/recommendations`：推荐电影分组
- `GET /api/movies/:id`：电影详情和本地评论
- `POST /api/movies/:id/reviews`：发布本地评论
- `POST /api/movies/sync-tmdb`：管理员同步 TMDB 近两年热门电影
- `POST /api/assistant/chat`：普通用户使用本地电影数据向 DeepSeek 电影助手提问

票务：

- `GET /api/showtimes`：场次列表
- `GET /api/showtimes/:id/seats`：座位图
- `POST /api/orders`：创建订单
- `POST /api/orders/:id/pay`：模拟支付
- `GET /api/orders`：用户查自己的订单，管理员查全部订单

后台：

- `GET /api/admin/stats`：票房、用户、订单和数据报表

## 安全说明

- `.env` 已加入 `.gitignore`，不会提交真实密钥
- `.env` 已加入 `.dockerignore`，不会被打进 Docker 镜像
- Git 仓库只提交 `.env.example` 占位配置
- 普通用户无法访问管理员接口
- 管理员接口由 JWT 角色校验保护
- DeepSeek 密钥只在服务端环境变量中使用，电影助手接口仅允许普通登录用户访问
- 电影助手会将本地评论标记为演示样本，不将其描述为全网真实口碑
- TMDB 只作为电影资料来源，本地评论、订单、场次和座位都保存在 MySQL

## 说明

这是课程作业性质的演示系统，支付、密码存储、权限模型等为了便于演示做了简化。真实生产环境需要使用密码哈希、HTTPS、更严格的权限控制和正式支付网关。
