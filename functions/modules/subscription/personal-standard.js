import { PERSONAL_STANDARD } from './personal-standard-data.js';

/** Render the reviewed compact policy; preserve native metadata and region overrides. */
export function buildPersonalStandardPolicy(proxies, options = {}) {
    const regional = PERSONAL_STANDARD.groups.filter(
        (group) => group.type === 'select' && group.name.endsWith('节点')
    );
    const overrides = (
        Array.isArray(options.regionOverrides) ? options.regionOverrides : []
    ).flatMap((rule) => {
        if (!rule?.pattern || !rule?.region) return [];
        try {
            return [{ pattern: new RegExp(rule.pattern, rule.flags || 'i'), region: rule.region }];
        } catch {
            return [];
        }
    });
    const members = new Map(regional.map((group) => [group.name, []]));
    for (const proxy of proxies) {
        const override = overrides.find((rule) => {
            rule.pattern.lastIndex = 0;
            return rule.pattern.test(proxy.name);
        });
        const metadataRegion = proxy.metadata?.region;
        const label =
            override?.region ||
            (metadataRegion && metadataRegion !== '其他' ? metadataRegion : proxy.name);
        const region = regional.find(
            (group) => group.name !== '🌍 其他节点' && new RegExp(group.nodeFilter, 'i').test(label)
        );
        members.get(region?.name || '🌍 其他节点').push(proxy.name);
    }
    const absent = new Set([...members].filter(([, names]) => !names.length).map(([name]) => name));
    const groups = PERSONAL_STANDARD.groups
        .filter((group) => !absent.has(group.name))
        .map(({ nodeFilter, ...group }) => ({
            ...structuredClone(group),
            proxies: members.has(group.name)
                ? [...members.get(group.name)]
                : [
                      ...group.proxies,
                      ...(nodeFilter
                          ? proxies
                                .filter((p) => new RegExp(nodeFilter, 'i').test(p.name))
                                .map((p) => p.name)
                          : []),
                  ],
        }));
    const valid = new Set([
        ...groups.map((group) => group.name),
        ...proxies.map((p) => p.name),
        'DIRECT',
        'REJECT',
    ]);
    for (const group of groups) {
        const preferred = group.proxies[0];
        group.proxies = group.proxies.filter((name) => valid.has(name));
        if (group.name.startsWith('📲 TG') && group.name !== '📲 TG兜底' && !valid.has(preferred)) {
            group.proxies.unshift('REJECT');
        }
        if (!group.proxies.length) group.proxies = ['REJECT'];
    }
    return {
        groups,
        rules: [...PERSONAL_STANDARD.rules],
        providers: structuredClone(PERSONAL_STANDARD.providers),
    };
}
