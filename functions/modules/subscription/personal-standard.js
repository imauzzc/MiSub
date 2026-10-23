import { PERSONAL_STANDARD } from './personal-standard-data.js';
import {
    POLICY_GROUPS,
    getBuiltinRules,
    getRemoteProviderDefinitions,
    pruneProxyGroups,
    pinRemoteRuleUrl,
    PINNED_RULE_REVISIONS,
} from './builtin-rules-provider.js';

const AI_GROUP = '🤖 智能 AI';

/** Apply the personal service groups and supplemental ads to the original Standard. */
export function buildPersonalStandardPolicy(proxies, options = {}) {
    const originalGroups = pruneProxyGroups(POLICY_GROUPS.STD(proxies, options), proxies);
    const regions = originalGroups.filter(
        (group) => group.name.endsWith('节点') && group.type === 'select'
    );
    const regionNames = regions.map((group) => group.name);
    const regionalChoices = (preferred) => {
        const first = regionNames.find((name) => preferred.test(name)) || 'REJECT';
        return [...new Set([first, '♻️ 自动选择', ...regionNames, '👋 手动切换'])];
    };
    const telegramGroups = [
        { name: '📲 TG亚太', type: 'select', proxies: regionalChoices(/新加坡|狮城/) },
        { name: '📲 TG北美', type: 'select', proxies: regionalChoices(/美国/) },
        {
            name: '📲 TG欧洲',
            type: 'select',
            proxies: regionalChoices(/欧洲|荷兰|德国|英国|法国|芬兰|瑞典|瑞士|挪威|西班牙|意大利/),
        },
        {
            name: '📲 TG兜底',
            type: 'select',
            proxies: ['♻️ 自动选择', ...regionNames, '👋 手动切换'],
        },
    ];
    const groups = originalGroups.flatMap((group) => {
        if (group.name.startsWith('🤖')) {
            return group.name === AI_GROUP
                ? [
                      {
                          name: AI_GROUP,
                          type: 'select',
                          proxies: ['♻️ 自动选择', '🔯 故障转移', ...regionNames, '👋 手动切换'],
                      },
                  ]
                : [];
        }
        if (group.name === '🎥 流媒体') {
            const choices = [...new Set(['🇯🇵 日本节点', ...group.proxies])];
            const valid = new Set([...originalGroups.map((item) => item.name), 'DIRECT']);
            return [
                { ...group, name: '🎬 Emby', proxies: choices.filter((name) => valid.has(name)) },
            ];
        }
        if (group.name === '📲 Telegram') return telegramGroups;
        return [group];
    });

    const originalRules = getBuiltinRules('STD', 'clash');
    const providers = getRemoteProviderDefinitions('clash', originalRules);
    delete providers.STREAM;
    for (const [name, file] of [
        ['ADS_PROGRAM', 'BanProgramAD'],
        ['ADS_CHINA', 'BanEasyListChina'],
    ]) {
        providers[name] = {
            type: 'http',
            behavior: 'classical',
            format: 'text',
            url: pinRemoteRuleUrl(
                `https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/${PINNED_RULE_REVISIONS.ACL4SSR}/Clash/${file}.list`
            ),
            path: `./ruleset/${name}.list`,
            interval: 86400,
        };
    }
    // Reuse the original built-in Telegram YAML provider for the domain/IP fallback.
    Object.assign(
        providers,
        getRemoteProviderDefinitions('clash', [
            { type: 'rule-provider', provider: 'SOCIAL', target: '📲 TG兜底' },
        ])
    );
    const additions = PERSONAL_STANDARD.rules.map((rule) =>
        [rule.type.toUpperCase(), rule.value, rule.policy, ...(rule.extras || [])].join(',')
    );
    const rules = originalRules.flatMap((rule) => {
        if (typeof rule === 'string') {
            const parts = rule.split(',');
            if (parts[2]?.startsWith('🤖')) parts[2] = AI_GROUP;
            return [parts.join(',')];
        }
        if (rule.provider === 'STREAM') return [...additions, 'RULE-SET,SOCIAL,📲 TG兜底'];
        if (rule.provider === 'ADS')
            return [
                'RULE-SET,ADS,🎬 视频广告',
                'RULE-SET,ADS_PROGRAM,🎬 视频广告',
                'RULE-SET,ADS_CHINA,🎬 视频广告',
            ];
        return [
            `RULE-SET,${rule.provider},${rule.target.startsWith('🤖') ? AI_GROUP : rule.target}`,
        ];
    });
    return { groups, rules, providers };
}
