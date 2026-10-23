import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { generateBuiltinClashConfig } from '../../functions/modules/subscription/builtin-clash-generator.js';
import { urlsToClashProxies } from '../../functions/utils/url-to-clash.js';
import {
    POLICY_GROUPS,
    getBuiltinRules,
    getRemoteProviderDefinitions,
    pruneProxyGroups,
} from '../../functions/modules/subscription/builtin-rules-provider.js';

const names = ['HK-01', 'TW-01', 'JP-01', 'SG-01', 'US-01', 'DE-01'];
const nodes = names
    .map((name, index) => `trojan://test@192.0.2.${index + 1}:443#${name}`)
    .join('\n');
const render = (options = {}) =>
    yaml.load(generateBuiltinClashConfig(nodes, { ruleLevel: 'std', ...options }));

function validateReferences(config) {
    const groups = config['proxy-groups'];
    const valid = new Set([
        'DIRECT',
        'REJECT',
        ...config.proxies.map((p) => p.name),
        ...groups.map((g) => g.name),
    ]);
    expect(new Set(groups.map((g) => g.name)).size).toBe(groups.length);
    for (const group of groups) {
        expect(group.proxies.length, group.name).toBeGreaterThan(0);
        for (const member of group.proxies) {
            expect(valid.has(member), `${group.name} -> ${member}`).toBe(true);
            expect(member).not.toBe(group.name);
        }
    }
    for (const rule of config.rules) {
        const parts = rule.split(',');
        expect(valid.has(parts[0] === 'MATCH' ? parts[1] : parts[2]), rule).toBe(true);
        if (parts[0] === 'RULE-SET') expect(config['rule-providers'][parts[1]], rule).toBeTruthy();
    }
    const byName = new Map(groups.map((g) => [g.name, g]));
    function visit(name, path = new Set()) {
        if (!byName.has(name)) return;
        expect(path.has(name), `cycle: ${[...path, name].join(' -> ')}`).toBe(false);
        for (const member of byName.get(name).proxies) visit(member, new Set([...path, name]));
    }
    groups.forEach((g) => visit(g.name));
}

describe('Three bounded revisions to original Clash Standard', () => {
    it('keeps every unrelated original group exactly, including DNS and region selectors', () => {
        const config = render();
        const proxies = urlsToClashProxies(nodes.split('\n'));
        const original = pruneProxyGroups(POLICY_GROUPS.STD(proxies), proxies);
        const touched = (name) =>
            name.startsWith('🤖') || name === '🎥 流媒体' || name === '📲 Telegram';
        expect(
            config['proxy-groups'].filter(
                (g) => !touched(g.name) && !g.name.startsWith('📲 TG') && g.name !== '🎬 Emby'
            )
        ).toEqual(original.filter((g) => !touched(g.name)));
        expect(
            config['proxy-groups'].filter((g) => g.name.startsWith('🤖')).map((g) => g.name)
        ).toEqual(['🤖 智能 AI']);
        expect(config['proxy-groups'].find((g) => g.name === '🤖 智能 AI').proxies).not.toContain(
            'DIRECT'
        );
        expect(config['proxy-groups'].some((g) => g.name === '🎥 流媒体')).toBe(false);
        expect(config['proxy-groups'].some((g) => g.name === '🎬 Emby')).toBe(true);
        expect(
            config['proxy-groups'].filter((g) => g.name.startsWith('📲')).map((g) => g.name)
        ).toEqual(['📲 TG亚太', '📲 TG北美', '📲 TG欧洲', '📲 TG兜底']);
        validateReferences(config);
    });

    it('preserves original rule ordering outside the three changes, including Google, ads and CN', () => {
        const config = render();
        const original = getBuiltinRules('STD', 'clash')
            .filter((r) => typeof r === 'string' || r.provider !== 'STREAM')
            .map((r) => {
                if (typeof r !== 'string') return `RULE-SET,${r.provider},${r.target}`;
                const parts = r.split(',');
                if (parts[2]?.startsWith('🤖')) parts[2] = '🤖 智能 AI';
                return parts.join(',');
            });
        expect(
            config.rules.filter(
                (r) =>
                    !r.includes(',🎬 Emby') &&
                    !r.includes(',📲 TG') &&
                    !/^RULE-SET,ADS_(PROGRAM|CHINA),/.test(r)
            )
        ).toEqual(original);
        expect(config.rules[0]).toBe('RULE-SET,ADS,🎬 视频广告');
        expect(config.rules.slice(-4)).toEqual([
            'DOMAIN-SUFFIX,google.com,🚀 节点选择',
            'DOMAIN-SUFFIX,github.com,🚀 节点选择',
            'GEOIP,CN,DIRECT',
            'MATCH,🚀 节点选择',
        ]);
        expect(config.rules.some((r) => /gvt1|googleapis.cn|GoogleCN|UnBan/.test(r))).toBe(false);
        expect(config.rules).toContain('DOMAIN-SUFFIX,claude.ai,🤖 智能 AI');
        expect(config.rules).toContain('DOMAIN-SUFFIX,gemini.google.com,🤖 智能 AI');
    });

    it('retains original providers except Netflix and adds Telegram and the two ad supplements', () => {
        const config = render();
        const originals = getRemoteProviderDefinitions('clash', getBuiltinRules('STD', 'clash'));
        delete originals.STREAM;
        for (const [name, provider] of Object.entries(originals))
            expect(config['rule-providers'][name]).toEqual(provider);
        expect(Object.keys(config['rule-providers']).sort()).toEqual([
            'ADS',
            'ADS_CHINA',
            'ADS_PROGRAM',
            'AI',
            'APPLE',
            'MICROSOFT',
            'SOCIAL',
        ]);
        expect(config['rule-providers'].SOCIAL.url).toContain(
            '/Clash/Providers/Ruleset/Telegram.yaml'
        );
    });

    it('adds exactly the two requested ad lists immediately after BanAD using the same policy', () => {
        const config = render();
        expect(config.rules.slice(0, 3)).toEqual([
            'RULE-SET,ADS,🎬 视频广告',
            'RULE-SET,ADS_PROGRAM,🎬 视频广告',
            'RULE-SET,ADS_CHINA,🎬 视频广告',
        ]);
        for (const [name, file] of [
            ['ADS_PROGRAM', 'BanProgramAD'],
            ['ADS_CHINA', 'BanEasyListChina'],
        ]) {
            expect(config['rule-providers'][name]).toMatchObject({
                type: 'http',
                behavior: 'classical',
                format: 'text',
                interval: 86400,
                path: `./ruleset/${name}.list`,
            });
            expect(config['rule-providers'][name].url).toBe(
                `https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@433381ebc4b1de59350fa8bed2a04a888228f801/Clash/${file}.list`
            );
        }
        expect(config['proxy-groups'].find((g) => g.name === '🎬 视频广告').proxies).toEqual([
            'REJECT',
            'DIRECT',
        ]);
        validateReferences(config);
    });

    it('keeps Emby rules and Telegram regional priority and no-resolve', () => {
        const config = render();
        expect(config.rules).toContain('DOMAIN-SUFFIX,emby.wtf,🎬 Emby');
        expect(config.rules).toContain('IP-CIDR6,2001:b28:f23f::/48,📲 TG亚太,no-resolve');
        const region = config.rules.indexOf('IP-CIDR,149.154.168.0/22,📲 TG亚太,no-resolve');
        const fallback = config.rules.indexOf('IP-CIDR,149.154.160.0/20,📲 TG兜底,no-resolve');
        expect(region).toBeGreaterThan(0);
        expect(fallback).toBeGreaterThan(region);
        expect(config.rules.indexOf('RULE-SET,SOCIAL,📲 TG兜底')).toBeGreaterThan(fallback);
        expect(config['proxy-groups'].find((g) => g.name === '📲 TG北美').proxies[0]).toBe(
            '🇺🇸 美国节点'
        );
        expect(config['proxy-groups'].find((g) => g.name === '📲 TG欧洲').proxies[0]).toBe(
            '🇩🇪 德国节点'
        );
    });

    it('preserves DNS, node conversion and connection settings', () => {
        for (const dnsMode of ['clean', 'polluted']) {
            const config = render({ dnsMode });
            const full = render({ ruleLevel: 'full', dnsMode });
            expect(config.dns).toEqual(full.dns);
            expect(config.proxies).toEqual(full.proxies);
            for (const key of [
                'mixed-port',
                'allow-lan',
                'bind-address',
                'ipv6',
                'external-controller',
                'profile',
            ])
                expect(config[key]).toEqual(full[key]);
        }
    });

    it('does not create invalid references or cross-region defaults when regions are absent', () => {
        const config = yaml.load(generateBuiltinClashConfig('trojan://test@192.0.2.1:443#Unknown'));
        validateReferences(config);
        for (const name of ['📲 TG亚太', '📲 TG北美', '📲 TG欧洲'])
            expect(config['proxy-groups'].find((g) => g.name === name).proxies[0]).toBe('REJECT');
    });

    it('keeps DNS override and other levels and Hiddify compatibility behavior', () => {
        const dns = {
            enable: true,
            'enhanced-mode': 'fake-ip',
            nameserver: ['https://1.1.1.1/dns-query'],
        };
        const config = render({ customDnsOverride: JSON.stringify(dns) });
        expect(config.dns).toEqual(dns);
        expect(config['proxy-groups'].some((g) => g.name === '🌐 DNS 出口')).toBe(false);
        for (const ruleLevel of ['base', 'full', 'relay'])
            expect(render({ ruleLevel })['proxy-groups'].some((g) => g.name === '🎬 Emby')).toBe(
                false
            );
        expect(render({ hiddifyCompatible: true }).rules).toEqual(['MATCH,🚀 节点选择']);
    });
});
