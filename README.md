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

按"数据 / 判断 / 存储 / 页面"分层，无新增依赖：

- `src/domain/canalAccess.ts`：数据层 —— 牙位记录类型（术前片号、根管口定位结果、初始通畅深度、暂封状态）与示例数据
- `src/domain/canalRules.ts`：判断层 —— 观察区锁定（影像提示穿孔风险或超声工作尖已用过一次）、医生确认根管口解锁、进入预备后冻结、定位修改留痕（旧值 + 原因）、指标与筛选
- `src/storage/canalStorage.ts`：存储层 —— localStorage 持久化，重开页面可继续处理
- `src/App.tsx`：页面层 —— 顶部指标、筛选列表、牙位详情，三处读同一份记录
