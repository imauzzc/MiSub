import { PERSONAL_STANDARD } from './personal-standard-data.js';
import { dnsProxyGroup } from './builtin-rules-provider.js';

const REGION_NAMES = {
    香港: '香港',
    台湾: '台湾',
    日本: '日本',
    新加坡: '新加坡',
    狮城: '新加坡',
    美国: '美国',
    欧洲: '欧洲',
    英国: '欧洲',
    德国: '欧洲',
    法国: '欧洲',
    荷兰: '欧洲',
    芬兰: '欧洲',
    瑞典: '欧洲',
    瑞士: '欧洲',
    挪威: '欧洲',
};

/** Native Clash Standard policy; keeps the built-in DNS and node conversion path. */
export function buildPersonalStandardPolicy(proxies, options = {}) {
    const nodeNames = proxies.map((proxy) => proxy.name || proxy.tag).filter(Boolean);
    const overrides = (Array.isArray(options.regionOverrides) ? options.regionOverrides : [])
        .map((rule) => {
            try {
                if (!rule?.pattern || !rule.region) return null;
                return { regex: new RegExp(rule.pattern, rule.flags || 'i'), region: rule.region };
            } catch {
                return null;
            }
        })
        .filter(Boolean);
    const groups = PERSONAL_STANDARD.groups
        .map((definition) => {
            const region = Object.values(REGION_NAMES).find(
                (name) =>
                    definition.name.includes(`${name}节点`) ||
                    definition.name.includes(`${name}自动测速`)
            );
            const matches = (definition.filters || []).flatMap((filter) => {
                const regex = new RegExp(filter, 'i');
                return nodeNames.filter((name) => {
                    const override =
                        region &&
                        overrides.find((rule) => {
                            rule.regex.lastIndex = 0;
                            return rule.regex.test(name);
                        });
                    if (override) return REGION_NAMES[override.region] === region;
                    return regex.test(name);
                });
            });
            const members = [...new Set([...(definition.members || []), ...matches])];
            const automatic = definition.type === 'url-test';
            return {
                name: definition.name,
                type: definition.type,
                proxies: automatic
                    ? members.filter((name) => !['DIRECT', 'REJECT'].includes(name))
                    : members,
                ...(automatic
                    ? { url: 'http://www.gstatic.com/generate_204', interval: 300, tolerance: 50 }
                    : {}),
            };
        })
        .filter((group) => group.type !== 'url-test' || group.proxies.length > 0);

    const validNames = new Set([
        ...nodeNames,
        ...groups.map((group) => group.name),
        'DIRECT',
        'REJECT',
    ]);
    groups.forEach((group) => {
        group.proxies = group.proxies.filter((name) => name !== group.name && validNames.has(name));
        if (!group.proxies.length) group.proxies = ['REJECT'];
    });

    const providers = {};
    const providerNames = new Map();
    const rules = PERSONAL_STANDARD.rules.map((rule) => {
        if (rule.source === 'remote') {
            if (!providerNames.has(rule.value)) {
                const name = `personal_${providerNames.size}`;
                providerNames.set(rule.value, name);
                providers[name] = {
                    type: 'http',
                    behavior: 'classical',
                    format: 'text',
                    url: rule.value,
                    path: `./ruleset/${name}.list`,
                    interval: 86400,
                };
            }
            return `RULE-SET,${providerNames.get(rule.value)},${rule.policy}`;
        }
        if (rule.type === 'final' || rule.type === 'match') return `MATCH,${rule.policy}`;
        return [rule.type.toUpperCase(), rule.value, rule.policy, ...(rule.extras || [])].join(',');
    });
    return { groups: [dnsProxyGroup(nodeNames), ...groups], rules, providers };
}
