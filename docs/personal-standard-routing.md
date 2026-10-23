# Standard：仅三项修订

使用“内置渲染 → 使用内置自动分流 → Standard”。本版撤回上一版整体导入远程 INI 的分组、规则和规则源，重新以原始内置 Standard 为基础，仅修改 Clash/Mihomo 输出的以下三项：

1. 原“🎥 流媒体”替换为“🎬 Emby”：移除 Netflix STREAM 规则源，使用已审核个人清单中的 8 个 Emby 域名；有日本节点时默认日本。
2. 原 AI 服务分组及 AI 自动/故障转移辅助组全部聚合为“🤖 智能 AI”。原 AI 域名规则及 OpenAi 规则源保留，只改变目标组。候选使用原全局自动选择、故障转移、原地区组和手动切换，不增加 AI 域名或 DIRECT。
3. 原 Telegram 组替换为“📲 TG亚太 / 📲 TG北美 / 📲 TG欧洲 / 📲 TG兜底”。区域 IP 规则优先于较宽兜底范围和域名规则，保留 no-resolve；最后使用内置 SOCIAL Telegram YAML 规则源补充。候选引用原有地区节点组，不另建地区分组。没有对应地区节点时该区域默认 REJECT，可手动选择其他候选。

原 Standard 的 DNS、隐藏 DNS 出口、节点转换、地区识别、节点选择、自动选择、故障转移、手动切换、广告、苹果、微软、Google、GitHub、GEOIP CN 和 MATCH 逻辑全部保留。原广告规则仍在首位。Emby 和 Telegram 新规则位于原 STREAM 规则的位置；其他规则保留原相对顺序。

不再导入上一版的 Google Play / Google CN 专项规则、UnBan、中国域名/公司 IP、额外广告清单、ProxyLite 或自定义谷歌组。没有修改 DNS 或新增代理出口方案。Base、Full、Relay、Hiddify 兼容输出、其他客户端格式、自定义模板路径维持原行为。

个人数据只保留来源提交 36ebc4f1b2317ceb8ee299c2cd07a7ccbd46ec65 的 Emby 和 Telegram 内联规则；后续修改远程 INI 不会自动修改本内置方案。

部署后更新并激活 OpenClash 订阅，先保持当前路由器 DNS 和模式不变，用原来可用的节点测试 Google Play 下载。配置校验通过不代表手机下载已恢复，以实际测试为准。

定时同步保留之前修复的合并策略，不再强制覆盖 fork 定制。

Node 26 下运行测试时使用 NODE_OPTIONS=--no-experimental-webstorage，让 happy-dom 提供测试用浏览器存储。
