# Standard：同步精简版分流

## 暂定修订：YouTube

新增“📺 YouTube”独立分组，默认全局自动选择，可选故障转移、地区组和手动节点。MetaCubeX youtube 清单来源固定于 c8c1a27018377ec8a7f60c320efb3023681909eb，与 clash 仓库同源转换，共 178 条。规则放在 AI 后、Emby 和通用 Google/CN 前；广告规则保持最高优先级。仅增加该组和规则源，既有 Google/Play、DNS、广告、AI、Emby、Telegram 的配置不变。需要用户实际测试播放与 Google Play 下载，不代表视频广告拦截功能。

内置 Clash/Mihomo Standard 已同步 clash 仓库精简版，来源提交 ec674a9b6a22b204bc82fc35924f3feb106b034e（config/MiSub_Compact_20261023.ini 及配套快照）。

- 地区保留香港、台湾、日本、新加坡、美国、欧洲、其他；欧洲合并，地区只设一个手选组。无节点的地区不显示；全局自动选择和故障转移保留。内置版仍支持节点地区 metadata 和 regionOverrides，这些原生能力在通用 INI 中不能完整复现。
- AI 使用同一份 MetaCubeX 六项服务快照，共 104 条，统一指向智能 AI，默认候选依次为美国、日本、新加坡、台湾、欧洲、手动切换。原生零散 AI 域名和旧 OpenAi 提供者已替换。清单来源版本和转换说明见 clash 仓库。
- Emby 引用 https://raw.githubusercontent.com/imauzzc/clash/main/rules/Emby.list，当前 8 个域名，位置与精简版一致；后续在该文件统一维护。
- Telegram 保留区域 IP、no-resolve 和域名兜底，与精简版展开后内容相同；欧洲出口首选欧洲组。缺少对应地区时区域组默认 REJECT，可手选出口。
- 三份广告、Apple、Microsoft、google.com、github.com、GEOIP CN、MATCH 维持精简版的内容和顺序。DNS 配置和隐藏 DNS 出口保持原生设置；节点转换及其他连接选项保持原行为。

个人策略数据保存在 personal-standard-data.js，运行时不依赖另一个仓库读取策略定义。AI、Emby 等远程规则源仍由客户端拉取。后续修改 clash 模板需显式同步这里的策略数据，不能只修改模板后假定内置自动变化。

仅影响内置 Clash/Mihomo Standard；Base、Full、Relay、自定义模板、其他格式及 Hiddify 兼容输出维持原路径。更新并激活 OpenClash 订阅后，测试 Google Play 下载、AI、Emby 和 Telegram。配置检查通过不能代替用户真实网络测试。

Fork 自动同步的定时触发已移除，保留手动触发。Node 26 下测试使用 NODE_OPTIONS=--no-experimental-webstorage，让 happy-dom 提供测试用浏览器存储。
