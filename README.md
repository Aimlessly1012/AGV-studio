# 🎬 AI生成视频

基于AI的动画视频制作平台，支持分镜驱动、一键生成。

## 功能

- 📋 **分镜管理** - 创建项目，按时间轴管理场景
- ✏️ **提示词编辑** - 每个场景独立编辑提示词和反向提示词
- 🚀 **一键生成** - 调用可灵AI API批量生成视频
- 🔄 **状态轮询** - 自动查询生成进度
- 🎥 **视频预览** - 生成完成后直接在线播放

## 技术栈

- **前端**: Next.js 14 (App Router) + React 18
- **后端**: Next.js API Routes
- **样式**: 原生CSS (暗黑科技风)
- **API**: 可灵AI (JWT认证)、豆包AI

## 快速开始

```bash
# 安装依赖
npm install

# 配置API密钥
cp .env.example .env.local
# 编辑 .env.local 填入可灵AI密钥

# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

## 配置

在 `.env.local` 中配置：

```env
KLING_AK=你的Access Key
KLING_SK=你的Secret Key
```

## 项目结构

```
kling-studio/
├── app/
│   ├── layout.tsx          # 布局
│   ├── page.tsx            # 主页面（分镜编辑器）
│   ├── globals.css         # 样式
│   └── api/kling/route.ts  # 后端API
├── lib/
│   ├── kling.ts            # 可灵API封装（JWT认证）
│   └── store.ts            # 数据存储
└── .env.example            # 环境变量模板
```

## API接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/kling` | GET | 获取项目列表/详情 |
| `/api/kling` | POST | 创建项目/添加场景/生成视频等 |

### POST Actions

- `createProject` - 创建项目
- `addScene` - 添加场景
- `updateScene` - 更新场景
- `deleteScene` - 删除场景
- `generate` - 生成单个场景视频
- `generateAll` - 批量生成所有场景
- `checkStatus` - 查询任务状态

## License

MIT
