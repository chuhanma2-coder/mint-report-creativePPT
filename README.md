# Mint Report Creative PPT

独立实验版 **0.1.0-rc.3**。根据完整原始材料与已确认的页面指导 Prompt，由 Agent 在统一 Mint 原生母版下自由设计可编辑 PPT；不调用原 `mint-report-ppt` 的固定布局链路。

## 与原版的区别

- 原版保留不动，新 Skill 名称为 **`mint-report-creative-ppt`**。
- Director Prompt = **强设计意图 + 推荐构图**。实际排版发现更好方案时，设计 Agent 可以调整构图，保留页面目标、信息层级、视觉任务和用户硬要求，并记录理由。
- 直接使用 Presentations 原生 API。允许本次报告专用构建脚本、非等宽构图和对象内部设计，不强制 Slide IR 或 Scene Grammar。
- 默认导入 `mint-ppt-16x9-template.pptx`。模板统一母版、字体、品牌色、线条语言和自动页码，但不固定内容槽位；模板没有的图形由 Agent 使用同一视觉语言组合原生对象。
- 复用旧仓库的来源解析、事实覆盖、文案、字号、图片细字、原生数据和复核凭证检查。来源见 [REUSE.md](REUSE.md)。
- 保持完整正文、原生编辑、禁止自动缩字和无意义拉伸。技术检查通过不等于视觉通过。

## 安装

需要 Codex 的 **Presentations** Skill 和其配套本地运行时。没有这些依赖时不能宣称已生成或验证 PPT。Mac 与 Windows 各自使用发现到的运行时路径，不复制另一台机器的绝对路径。

向 Codex 发送：

```text
请从 https://github.com/chuhanma2-coder/mint-report-creativePPT
安装 v0.1.0-rc.3 的 mint-report-creative-ppt Skill。
仓库根目录就是 Skill，安装名称为 mint-report-creative-ppt。
不要替换、修改或卸载 mint-report-ppt。
安装后验证版本和运行时指纹，并确认 Presentations 依赖可用。
```

维护者可使用自带 skill-installer：

```sh
python install-skill-from-github.py --repo chuhanma2-coder/mint-report-creativePPT --ref v0.1.0-rc.3 --path . --name mint-report-creative-ppt
```

安装后下一轮对话即可使用。若同名目录已存在，先检查版本和本地修改，不直接覆盖。Release ZIP 是纯 Skill 运行资源，不含私有材料或历史 PPT。

## 推荐流程

个人临时制作可以直接使用短 Prompt。多人正式协作建议使用四步流程：先做简化任务卡，再由撰写人让 AI 生成并确认详细页面指导 Prompt，随后套用同一母版制作，最后人工修改或重新生成。完整可复制 Prompt 见 [团队操作手册](references/team-workflow.md)。

任务卡只统一：章节顺序、负责人、来源范围、汇报受众/目的、Skill与母版版本。它是防止多人重复、漏做、错序、拿错材料和版本不一致的轻量协作合同，不规定页数和版式。若团队已经用其他方式明确并共同确认这些信息，可以不用任务卡，但需要人工承担同样的协调与合并核对。真正保证合并后格式基本一致的是：**相同 Skill 版本 + 相同原生母版版本 + 相同品牌合同**。

## 个人制作的最简单 Prompt

附上材料后发送：

```text
请使用 $mint-report-creative-ppt，根据附件制作管理层汇报PPT。
先完整理解材料，再形成设计导演预案和可读文案，直接制作原生可编辑PPT。
全部业务事实进入正文，相关内容尽量集中成页，不要无必要拆页。
你可以根据真实排版优化推荐构图，但必须保留页面目标、信息层级和视觉任务。
完成来源、原生对象和独立视觉检查，不覆盖已有文件；未通过的检查如实说明。
```

个人制作不强制任务卡，也可以直接使用短 Prompt。团队正式交付则建议先在 Skill 外生成并人工确认详细页面指导 Prompt；这一步能让作者明确页面主题、重点、构图、文案层级、颜色、动画和内容边界。明确要求单页、指定图片、指定配色时直接补充；单页要求与完整可读性冲突时说明原因，不能删内容或偷偷缩字。

单独负责人的补充：`只制作我提供的这一部分，不混入其他负责人的材料。`

## 后续修改、合并和发布

人工直接在 PowerPoint 修改。各负责人使用同一 Skill 与母版版本，交付后可在 Mac 或 Windows PowerPoint 人工合并。团队建议使用简化任务卡避免章节漏项、重复和顺序冲突；Agent 合并不是必需。

若需要 Agent 修改：

```text
使用 $mint-report-creative-ppt，修改附件PPT的以下内容：【具体修改】。
以这份PPT为准，保留其他内容与关系，另存新文件并检查受影响页面。
```

若需要统一风格：

```text
使用 $mint-report-creative-ppt，检查附件合并PPT的字体、颜色、标题层级是否协调。
先列出差异，只调整明确的样式问题，不改数字、事实、关系和页面顺序，不套统一版式。
```

若需要只读 HTML：

```text
使用 $mint-report-creative-ppt，将附件最终PPT发布为离线只读HTML。
只读取这份PPT的实际页面和顺序，不根据旧材料恢复或改写内容。
```

## 怎么测试效果

使用相同模型、材料、渲染尺寸，分别测试 B、C 和肯尼亚资料。第一次只用上面的短 Prompt，不读旧 PPT/IR/构建脚本。比较完整性、无必要拆页、第一视觉、关系表达、文案、字号、空间与颜色层级。带教图只作设计能力参考，不要求所有页面长一样。

查看每次私有工作目录中的原始来源台账、brief、实际构建脚本、证据映射、原生渲染、容量尝试及复核报告。输出文件的 `.creative-audit.json` 通过，只代表技术候选；独立复核及 `.delivery-audit.json` 通过后才是本地验收。Windows 打开/编辑/保存/重开另列，不能用本机渲染代替。

## 开发与发布验证

加载配套 runtime，设置 `RUNTIME_NODE_MODULES`、`RUNTIME_PYTHON`、`RUNTIME_BIN_DIR`、`PRESENTATIONS_SKILL_DIR`，用捆绑 Node 运行：

```sh
node --test tests/contracts.test.mjs
node tests/native.e2e.mjs
node scripts/package-skill.mjs --fingerprint
```

首次原生创建遵循 Presentations 的 `mark_artifact_operation_started.mjs` 指令。原生测试是合成基础验证，不是 B/C Fresh Benchmark，不作为高层汇报视觉已解决的证据。

只有维护者在修改代码并重新测试时运行 `node scripts/package-skill.mjs --stamp`；制作任务不得重盖指纹以掩盖运行时变更。

本版的真实验证记录及限制见 [VALIDATION.md](VALIDATION.md)。
