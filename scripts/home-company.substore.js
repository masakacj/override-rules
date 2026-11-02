/*
 * home-company / Sub-Store Mihomo full-config transformer
 * Input: a Sub-Store subscription/collection that contains sc.company.* proxy nodes.
 * Output: complete standalone Mihomo/OpenClash configuration using only company.
 * No airport proxies, Smart/url-test/fallback/load-balance, or remote proxy provider.
 * Normal daily configuration is not modified.
 *
 * For Sub-Store's JavaScript configuration override, same execution format as convert.min.js:
 * globalThis.main(config) -> Mihomo config object.
 */
'use strict';

// Fail closed if no company node is present. This prevents accidental airport fallback.
const COMPANY_NAME_RE = /^sc\.company\./i;
const ALLOW_EXACT_COMPANY_NAME = true;
// Match the existing convert.min.js default: block UDP/443 QUIC to prefer TCP/HTTPS.
const BLOCK_QUIC = true;

// These are intentionally preserved from the user's original OpenClash custom rules.
// Sub-Store should generate a separate company-only config, not modify daily custom rules.
const RULE_TEXT = String.raw`
# Original explicit direct exceptions, do not route these through company
DOMAIN-SUFFIX,argotunnel.com,DIRECT
DOMAIN-SUFFIX,cftunnel.com,DIRECT
DOMAIN-SUFFIX,dabcs.it,DIRECT
DOMAIN-SUFFIX,dabpumps.com,DIRECT
DOMAIN-SUFFIX,appsflyer.com,DIRECT

# Corporate/private exceptions are ahead of generic private DIRECT
IP-CIDR,10.0.92.89/32,company,no-resolve
DOMAIN,cc.781751.xyz,company
DOMAIN-SUFFIX,home-assistant.io,company
DOMAIN-SUFFIX,nintendo.net,company
DOMAIN-SUFFIX,nintendo.com,company
DOMAIN-SUFFIX,igg.com,company
DOMAIN-SUFFIX,skyunion.net,company

# VS Code / Visual Studio
DOMAIN,marketplace.visualstudio.com,company
DOMAIN-SUFFIX,visualstudio.com,company
DOMAIN-SUFFIX,vsassets.io,company
DOMAIN-SUFFIX,vscode.dev,company
DOMAIN-SUFFIX,vscode-unpkg.net,company
DOMAIN-SUFFIX,vscode-cdn.net,company

# Adobe blocking
DOMAIN-SUFFIX,adobe.com,REJECT
DOMAIN-SUFFIX,adobe.io,REJECT
DOMAIN-SUFFIX,adobestats.io,REJECT
DOMAIN-SUFFIX,adobedtm.com,REJECT
DOMAIN-SUFFIX,demdex.net,REJECT
DOMAIN-SUFFIX,omtrdc.net,REJECT

# Pinterest
DOMAIN-KEYWORD,pinterest,company
DOMAIN-SUFFIX,pinterest.com,company
DOMAIN-SUFFIX,pinimg.com,company
DOMAIN-SUFFIX,pin.it,company

# Instagram / Meta / Threads
DOMAIN-SUFFIX,instagram.com,company
DOMAIN-SUFFIX,cdninstagram.com,company
DOMAIN-SUFFIX,instagr.am,company
DOMAIN-SUFFIX,ig.me,company
DOMAIN-KEYWORD,instagram,company
DOMAIN-SUFFIX,threads.net,company
DOMAIN-SUFFIX,fbcdn.net,company
DOMAIN-SUFFIX,fbsbx.com,company
DOMAIN-SUFFIX,facebook.com,company
DOMAIN-SUFFIX,facebook.net,company
DOMAIN-SUFFIX,tfbnw.net,company
DOMAIN-SUFFIX,fb.com,company
DOMAIN-SUFFIX,fb.me,company
DOMAIN-SUFFIX,m.me,company
DOMAIN-KEYWORD,facebook,company

# ChatGPT / OpenAI
DOMAIN-SUFFIX,openai.com,company
DOMAIN-SUFFIX,chatgpt.com,company
DOMAIN-SUFFIX,oaistatic.com,company
DOMAIN-SUFFIX,oaiusercontent.com,company
DOMAIN-SUFFIX,openaiapi-site.azureedge.net,company
DOMAIN-SUFFIX,openaicom-api-bdcpf8c6d2e9atf6.z01.azurefd.net,company
DOMAIN-SUFFIX,openaicomproductionae4b.blob.core.windows.net,company
DOMAIN-SUFFIX,statsigapi.net,company
DOMAIN-SUFFIX,intercom.io,company
DOMAIN-SUFFIX,intercomcdn.com,company
DOMAIN-SUFFIX,sentry.io,company

# Google / YouTube
GEOSITE,google,company
GEOSITE,youtube,company
GEOIP,google,company,no-resolve

# GitHub
DOMAIN-SUFFIX,github.com,company
DOMAIN-SUFFIX,github.io,company
DOMAIN-SUFFIX,github.dev,company
DOMAIN-SUFFIX,githubapp.com,company
DOMAIN-SUFFIX,githubassets.com,company
DOMAIN-SUFFIX,githubusercontent.com,company
DOMAIN-SUFFIX,githubstatus.com,company
DOMAIN-SUFFIX,github.blog,company
DOMAIN-SUFFIX,github.community,company
DOMAIN-SUFFIX,githubcopilot.com,company
DOMAIN-SUFFIX,ghcr.io,company
DOMAIN-SUFFIX,github.map.fastly.net,company
DOMAIN-SUFFIX,github.global.ssl.fastly.net,company
DOMAIN,raw.githubusercontent.com,company
DOMAIN,objects.githubusercontent.com,company
DOMAIN,github-releases.githubusercontent.com,company
DOMAIN,github-registry-files.githubusercontent.com,company
DOMAIN,github-cloud.s3.amazonaws.com,company
DOMAIN,github-com.s3.amazonaws.com,company
DOMAIN,github-production-release-asset-2e65be.s3.amazonaws.com,company
DOMAIN,github-production-user-asset-6210df.s3.amazonaws.com,company
DOMAIN,github-production-repository-file-5c1aeb.s3.amazonaws.com,company

# Docker
DOMAIN-SUFFIX,docker.com,company
DOMAIN-SUFFIX,docker.io,company
DOMAIN-SUFFIX,dockerhub.com,company
DOMAIN-SUFFIX,dockerstatic.com,company
DOMAIN-SUFFIX,dockerproject.org,company
DOMAIN,registry-1.docker.io,company
DOMAIN,auth.docker.io,company
DOMAIN,index.docker.io,company
DOMAIN,hub.docker.com,company
DOMAIN,production.cloudflare.docker.com,company

# Reddit
DOMAIN-SUFFIX,reddit.com,company
DOMAIN-SUFFIX,redd.it,company
DOMAIN-SUFFIX,redditmedia.com,company
DOMAIN-SUFFIX,redditstatic.com,company
DOMAIN-SUFFIX,redditspace.com,company
DOMAIN-SUFFIX,redditinc.com,company

# Previously 选择代理: temporary company-only replacement
DOMAIN-SUFFIX,tikhub.io,company
DOMAIN-SUFFIX,hjd2048.com,company
DOMAIN-SUFFIX,img9g2026.com,company
DOMAIN-SUFFIX,maoxinquan.net,company
DOMAIN-SUFFIX,api.qsy.ink,company
DOMAIN-SUFFIX,todoist.com,company
DOMAIN-SUFFIX,todoist.net,company
DOMAIN,todoist.b-cdn.net,company
DOMAIN-SUFFIX,parsec.app,company
DOMAIN-SUFFIX,mi.com,DIRECT

# OCSP
DOMAIN-KEYWORD,ocsp,DIRECT

# Douyin / ByteDance DIRECT
GEOSITE,douyin,DIRECT
DOMAIN-SUFFIX,amemv.com,DIRECT
DOMAIN-SUFFIX,douyin.com,DIRECT
DOMAIN-SUFFIX,douyincdn.com,DIRECT
DOMAIN-SUFFIX,douyinpic.com,DIRECT
DOMAIN-SUFFIX,douyinstatic.com,DIRECT
DOMAIN-SUFFIX,douyinvod.com,DIRECT
DOMAIN-SUFFIX,idouyinvod.com,DIRECT
DOMAIN-SUFFIX,douyin280.com,DIRECT
DOMAIN-SUFFIX,douyinhb.com,DIRECT
DOMAIN-SUFFIX,ixigua.com,DIRECT
DOMAIN-SUFFIX,ixiguavideo.com,DIRECT
DOMAIN-SUFFIX,pstatp.com,DIRECT
DOMAIN-SUFFIX,snssdk.com,DIRECT
DOMAIN-SUFFIX,realshortvideo.com,DIRECT
DOMAIN-SUFFIX,huoshanstatic.com,DIRECT
DOMAIN-SUFFIX,huoshanzhibo.com,DIRECT
DOMAIN-SUFFIX,huoshan.com,DIRECT
DOMAIN-SUFFIX,toutiao.com,DIRECT
DOMAIN-SUFFIX,toutiaocdn.com,DIRECT
DOMAIN-SUFFIX,toutiaostatic.com,DIRECT
DOMAIN-SUFFIX,toutiaovod.com,DIRECT
DOMAIN-SUFFIX,toutiaopage.com,DIRECT
DOMAIN-SUFFIX,bytednsdoc.com,DIRECT
DOMAIN-KEYWORD,zjcdn,DIRECT
DOMAIN-KEYWORD,bytegslb,DIRECT

# PikPak downloads only DIRECT; other PikPak domains fall through company unless CN
DOMAIN-REGEX,^dl-[A-Za-z0-9-]+\.mypikpak\.com$,DIRECT

# Other DIRECT exceptions
DOMAIN-SUFFIX,1panel.live,DIRECT
DOMAIN-SUFFIX,alitrip.com,DIRECT
DOMAIN-SUFFIX,fliggy.com,DIRECT
DOMAIN-SUFFIX,feizhu.com,DIRECT
DOMAIN-SUFFIX,aliyuncs.com,DIRECT

# LAN & China direct. Keep unqualified GEOIP,CN to resolve ambiguous IP-based traffic.
GEOSITE,private,DIRECT
GEOIP,private,DIRECT,no-resolve
GEOSITE,cn,DIRECT
GEOIP,CN,DIRECT

# Emergency fallback
MATCH,company
`;

function main(config) {
    if (!config || !Array.isArray(config.proxies)) {
        throw new Error('home-company: source must be an existing Sub-Store subscription/collection with a proxies array');
    }
    const input = config.proxies;
    const matched = input.filter(p => p && typeof p.name === 'string' && (
        COMPANY_NAME_RE.test(p.name) || (ALLOW_EXACT_COMPANY_NAME && p.name.toLowerCase() === 'company')
    ));
    if (!matched.length) {
        throw new Error('home-company: no sc.company.* nodes found; refusing to create a configuration that could route via airport');
    }

    const names = new Set();
    const selected = matched.map((p) => {
        const node = { ...p };
        // A proxy cannot share a name with its parent proxy group.
        if (node.name.toLowerCase() === 'company') node.name = 'sc.company.primary';
        if (names.has(node.name)) throw new Error('home-company: duplicate company node: ' + node.name);
        names.add(node.name);
        return node;
    });

    // If a company node requires an airport dialer proxy, this emergency profile must fail closed.
    for (const node of selected) {
        const parent = node['dialer-proxy'];
        if (parent && parent !== 'DIRECT' && !names.has(parent)) {
            throw new Error('home-company: company node ' + node.name + ' references external dialer-proxy ' + parent);
        }
    }

    const rules = RULE_TEXT.trim().split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    if (BLOCK_QUIC) {
        rules.unshift('AND,((DST-PORT,443),(NETWORK,UDP)),REJECT');
    }

    return {
        'mixed-port': 7890,
        'redir-port': 7892,
        'tproxy-port': 7893,
        'routing-mark': 7894,
        'allow-lan': true,
        'bind-address': '*',
        mode: 'rule',
        ipv6: false,
        'log-level': 'info',
        'unified-delay': true,
        'tcp-concurrent': true,
        'geodata-mode': true,
        'geodata-loader': 'standard',
        profile: { 'store-selected': true },
        proxies: selected,
        'proxy-groups': [
            { name: 'company', type: 'select', proxies: selected.map(n => n.name) },
            { name: '选择代理', type: 'select', proxies: ['company'] }
        ],
        dns: {
            enable: true,
            ipv6: false,
            'enhanced-mode': 'fake-ip',
            'fake-ip-range': '198.18.0.1/16',
            'default-nameserver': ['223.5.5.5', '119.29.29.29'],
            'proxy-server-nameserver': [
                '223.5.5.5', '119.29.29.29'
            ],
            'direct-nameserver': [
                'https://dns.alidns.com/dns-query',
                'https://doh.pub/dns-query'
            ],
            'nameserver-policy': {
                'geosite:cn': [
                    'https://dns.alidns.com/dns-query',
                    'https://doh.pub/dns-query'
                ],
                'geosite:private': ['system']
            },
            // All other DNS requests use company, never an exhausted airport group.
            nameserver: [
                'https://1.1.1.1/dns-query#company',
                'https://8.8.8.8/dns-query#company'
            ],
            'fake-ip-filter': [
                'geosite:private', 'geosite:connectivity-check', 'geosite:cn',
                '*.lan', '*.local', 'localhost',
                'Mijia Cloud', 'dig.io.mi.com', 'localhost.ptlogin2.qq.com',
                '*.icloud.com', '*.stun.*.*', '*.stun.*.*.*'
            ]
        },
        sniffer: {
            enable: true,
            'force-dns-mapping': true,
            'override-destination': false,
            sniff: {
                TLS: { ports: [443, 8443] },
                HTTP: { ports: [80, 8080, 8880] },
                QUIC: { ports: [443, 8443] }
            },
            'skip-domain': ['Mijia Cloud', 'dlg.io.mi.com', '+.push.apple.com']
        },
        rules
    };
}

// Sub-Store has two distinct JS environments:
// 1) Mihomo override: globalThis.main(config) -> config
// 2) 文件 -> 脚本操作: read $content/$files and assign YAML text to $content.
// Keep both supported because the same source may be used from either editor.
globalThis.main = main;

if (typeof $content !== 'undefined' || typeof $files !== 'undefined') {
    if (typeof ProxyUtils === 'undefined' ||
        !ProxyUtils.yaml ||
        typeof ProxyUtils.yaml.safeLoad !== 'function' ||
        typeof ProxyUtils.yaml.dump !== 'function') {
        throw new Error('home-company: Sub-Store file script requires ProxyUtils.yaml');
    }

    const candidates = [
        typeof $content !== 'undefined' ? $content : undefined,
        ...(typeof $files !== 'undefined' && Array.isArray($files) ? $files : [])
    ];
    let sourceConfig = null;
    for (const item of candidates) {
        if (item === null || typeof item === 'undefined') continue;
        let data = item;
        if (typeof data === 'string') {
            if (!data.trim()) continue;
            data = ProxyUtils.yaml.safeLoad(data);
        }
        // Some Sub-Store file sources return the array of node definitions
        // rather than a Mihomo mapping containing a proxies array.
        if (Array.isArray(data)) data = { proxies: data };
        if (data && Array.isArray(data.proxies)) {
            sourceConfig = data;
            break;
        }
    }
    if (!sourceConfig) {
        throw new Error('home-company: select a subscription/collection source containing sc.company.* nodes in the file editor, or add them with "从订阅添加节点" before this script');
    }

    // It is the FILE output, not the raw JavaScript, that OpenClash subscribes to.
    $content = ProxyUtils.yaml.dump(main(sourceConfig));
}
