import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { generateBuiltinClashConfig } from '../../functions/modules/subscription/builtin-clash-generator.js';
import { buildPersonalStandardPolicy } from '../../functions/modules/subscription/personal-standard.js';
import { PERSONAL_STANDARD } from '../../functions/modules/subscription/personal-standard-data.js';

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

describe('Personal native Clash Standard routing', () => {
    it('replaces service proliferation with the 27 requested groups plus hidden built-in DNS', () => {
        const config = render();
        expect(config['proxy-groups'].map((g) => g.name)).toEqual([
            '🌐 DNS 出口',
            ...PERSONAL_STANDARD.groups.map((g) => g.name),
        ]);
        expect(config['proxy-groups'][0].hidden).toBe(true);
        expect(
            config['proxy-groups'].some((g) => /🤖|Spotify|游戏平台|视频广告|流媒体/.test(g.name))
        ).toBe(false);
        validateReferences(config);
    });

    it('preserves the working built-in DNS block, ports and node conversion', () => {
        const standard = render();
        const full = render({ ruleLevel: 'full' });
        expect(standard.dns).toEqual(full.dns);
        expect(standard.proxies).toEqual(full.proxies);
        for (const key of [
            'mixed-port',
            'allow-lan',
            'bind-address',
            'ipv6',
            'external-controller',
        ])
            expect(standard[key]).toEqual(full[key]);
    });

    it('puts Play downloads and Google CN ahead of direct, ads and China rules', () => {
        const config = render();
        const unban = Object.entries(config['rule-providers']).find(([, p]) =>
            p.url.endsWith('/UnBan.list')
        )[0];
        const unbanIndex = config.rules.indexOf(`RULE-SET,${unban},🎯 全球直连`);
        for (const rule of [
            'DOMAIN,play.google.com,📢 谷歌',
            'DOMAIN,dl.google.com,📢 谷歌',
            'DOMAIN-SUFFIX,gvt1.com,📢 谷歌',
            'DOMAIN-SUFFIX,googleapis.cn,📢 谷歌',
            'DOMAIN-SUFFIX,xn--ngstr-lra8j.com,📢 谷歌',
        ]) {
            const index = config.rules.indexOf(rule);
            expect(index, rule).toBeGreaterThanOrEqual(0);
            expect(index, rule).toBeLessThan(unbanIndex);
        }
        expect(config.rules.at(-1)).toBe('MATCH,🐟 漏网之鱼');
        expect(config.rules.at(-2)).toBe('GEOIP,CN,🎯 全球直连');
    });

    it('keeps regional Telegram IP priority and no-resolve, and embeds personal lists', () => {
        const config = render();
        const apac = config.rules.indexOf('IP-CIDR,149.154.168.0/22,📲 TG亚太,no-resolve');
        const fallback = config.rules.indexOf('IP-CIDR,149.154.160.0/20,📲 TG兜底,no-resolve');
        expect(apac).toBeGreaterThan(0);
        expect(fallback).toBeGreaterThan(apac);
        expect(config.rules).toContain('IP-CIDR6,2001:b28:f23f::/48,📲 TG亚太,no-resolve');
        expect(config.rules.indexOf('DOMAIN-SUFFIX,emby.wtf,🎬 Emby')).toBeLessThan(apac);
        expect(
            Object.values(config['rule-providers']).some((p) => p.url.includes('imauzzc/clash'))
        ).toBe(false);
    });

    it('uses pinned text lists without the custom template YAML URL rewrite', () => {
        for (const provider of Object.values(render()['rule-providers'])) {
            expect(provider).toMatchObject({ behavior: 'classical', format: 'text' });
            expect(provider.url).toMatch(
                /ACL4SSR@433381ebc4b1de59350fa8bed2a04a888228f801\/Clash\/.*\.list$/
            );
        }
    });

    it('has no dangling, empty automatic groups or cycles when regions are absent', () => {
        const config = yaml.load(
            generateBuiltinClashConfig('trojan://test@192.0.2.1:443#Unknown', { ruleLevel: 'std' })
        );
        validateReferences(config);
        for (const name of ['🇸🇬 新加坡节点', '🇺🇸 美国节点', '🌍 欧洲节点'])
            expect(config['proxy-groups'].find((g) => g.name === name).proxies).toEqual(['REJECT']);
    });

    it('honors full DNS overrides without leaving the hidden DNS group behind', () => {
        const dns = {
            enable: true,
            nameserver: ['https://1.1.1.1/dns-query'],
            'enhanced-mode': 'fake-ip',
        };
        const config = render({ customDnsOverride: JSON.stringify(dns) });
        expect(config.dns).toEqual(dns);
        expect(config['proxy-groups'].some((g) => g.name === '🌐 DNS 出口')).toBe(false);
        validateReferences(config);
    });

    it('does not alter Base, Full, Relay or Hiddify routing', () => {
        for (const ruleLevel of ['base', 'full', 'relay'])
            expect(render({ ruleLevel })['proxy-groups'].some((g) => g.name === '💬 Ai平台')).toBe(
                false
            );
        const hiddify = render({ hiddifyCompatible: true });
        expect(hiddify.rules).toEqual(['MATCH,🚀 节点选择']);
        expect(hiddify['rule-providers']).toBeUndefined();
    });

    it('does not let US match RUSSIA/AUS and does not leak a regional override to another region', () => {
        const proxies = ['RUSSIA', 'AUS', 'SG-custom'].map((name) => ({ name }));
        const { groups } = buildPersonalStandardPolicy(proxies, {
            regionOverrides: [{ pattern: 'SG-custom', region: '美国' }],
        });
        expect(groups.find((g) => g.name === '🇺🇸 美国自动测速').proxies).toEqual(['SG-custom']);
        expect(groups.find((g) => g.name === '🇸🇬 新加坡节点').proxies).toEqual(['REJECT']);
    });
});
