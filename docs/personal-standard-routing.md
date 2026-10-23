# Personal Clash / Mihomo Standard routing

Select **Built-in rendering → Built-in automatic routing → Standard**. Existing
subscription groups that inherit these global settings use this policy after deployment
and their next subscription update. A remote INI or `custom:` template still takes
precedence when explicitly selected; it does not use this native Standard policy.

The 27 policy groups and first-match ordering follow
[`ACL4SSR_Mini_AI_Custom.ini`](https://github.com/imauzzc/clash/blob/36ebc4f1b2317ceb8ee299c2cd07a7ccbd46ec65/config/ACL4SSR_Mini_AI_Custom.ini).
Taiwan and US flags are normalized to MiSub's existing labels. The original hidden
DNS exit group remains, so a full six-region subscription has 28 total groups and
27 visible groups in panels that respect `hidden`. Empty regional automatic groups
are omitted; their regional selectors retain REJECT and never silently cross regions.
Region overrides remain supported for these six regions, with European countries
mapped to the European group.

The native generator still handles node parsing, UDP, managed URLs, DNS overrides,
and clean/polluted DNS modes. Its DNS block is unchanged. Base, Full, Relay, Hiddify
compatibility output, other client formats, and custom-template paths are unchanged.

Play, Google CN and FCM share **📢 谷歌**. Play endpoints, `googleapis.cn`,
`xn--ngstr-lra8j.com`, `gvt1.com`, and GoogleCNProxyIP precede UnBan, ads and China
rules. AI and YouTube precede general Google rules. Apple/Microsoft default to DIRECT;
Emby defaults to Japan. The global selector defaults to automatic selection; AI,
Google and YouTube default to the global selector. Existing client selections can
override these defaults after updating a subscription.

Personal Emby and Telegram lists are embedded from the same source revision; no
runtime request for the remote INI or these personal lists is needed. ACL4SSR lists
remain HTTP text rule-providers pinned to MiSub's existing reviewed ACL4SSR revision.
This avoids the template path's `.list` to YAML-provider URL rewriting. The static
data in `personal-standard-data.js` is intentional: later edits to the remote INI
do not silently change the built-in policy. Update that data deliberately and rerun
the routing checks when changing the personal rules.

`fork-sync.yml` now merges upstream changes with a normal push. A conflict stops the
workflow and retains fork customizations instead of resetting/force-pushing main.

## Validation and OpenClash use

- Unit tests check routing order, group references/cycles, missing regions, overrides,
  DNS equivalence, and unchanged alternate modes.
- Refresh the OpenClash subscription and activate the updated configuration. Keep
  the existing DNS settings for the first comparison and use a known working node
  in 📢 谷歌.
- Successful generation/core validation does not demonstrate Google Play downloads.
  Test downloading/updating an app on the actual phone. If it still waits, check
  OpenClash's running connection rule and any firewall-level mainland-IP bypass;
  traffic bypassed before reaching the core cannot match these rules.

On Node 26, run the unit suite with `NODE_OPTIONS=--no-experimental-webstorage` so
happy-dom provides browser storage rather than Node's unconfigured native storage.
