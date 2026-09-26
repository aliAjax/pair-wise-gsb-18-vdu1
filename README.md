# hxwl-04 牙科根管治疗

按牙位组织根管步骤、工作长度与复诊计划

## 技术栈

React + Vite + TypeScript + CSS

## 本地运行

```bash
npm install
npm run dev
```

开发端口：5104

## 初始功能

- 领域指标看板
- 角色和分类筛选
- 专业字段录入区
- 示例记录列表
- 可继续扩展IndexedDB、权限、后端API和复杂图表

## 钙化根管通路台

按牙位+根管登记钙化根管通路，代码分层放在 `src/calcified/`：

- `model.ts`（数据）：术前片号、根管口定位结果、初始通畅深度、暂封状态、风险标记与留痕记录
- `rules.ts`（判断）：影像提示穿孔风险或超声工作尖已用过一次 → 留在观察区，医生确认根管口后解锁；进入镍钛预备即冻结；改定位结果强制保留旧值与原因
- `storage.ts`（存储）：localStorage 持久化（键 `hxwl04.calcified-canals.v1`），重开页面可继续处理
- `CalcifiedBoard.tsx`（页面）：顶部指标、筛选列表、牙位详情读同一份记录

不新增第三方依赖。
