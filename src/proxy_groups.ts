import {
    CDN_URL,
    LANDING_NODE_MATCHER,
    LOW_COST_NODE_MATCHER,
    SUCAI_NODE_MATCHER,
    SUCAI_NODE_PATTERN,
    NODE_SUFFIX,
    PROXY_GROUPS,
    countriesMeta,
} from "./constants";
import type {
    BuildCountryProxyGroupsInput,
    BuildProxyGroupsInput,
    CountryInfoItem,
    ProxyGroup,
} from "./types";

// createCaseInsensitiveNodeMatcher 生成的 pattern 可能包含 (?i)，
// 这是给 Clash/Mihomo filter 使用的，不能直接传给 JavaScript RegExp。
const SUCAI_NODE_REGEXP = new RegExp(SUCAI_NODE_PATTERN, "i");

function isSucaiNode(nodeName: string): boolean {
    return SUCAI_NODE_REGEXP.test(nodeName);
}

function withoutSucaiNodes(nodes: string[]): string[] {
    return nodes.filter((nodeName) => !isSucaiNode(nodeName));
}

function combineExcludeFilters(...filters: Array<string | undefined>): string | undefined {
    const validFilters = filters.filter(Boolean) as string[];
    return validFilters.length > 0 ? validFilters.join("|") : undefined;
}

/**
 * 为每个地区生成对应的代理组配置。
 * @param input - 构建地区代理组所需的输入参数
 * @param input.countries - 需要生成代理组的地区名称列表（不含后缀）
 * @param input.landing - 是否启用落地节点模式；启用时将排除落地节点
 * @param input.loadBalance - 是否使用负载均衡模式（`load-balance`），否则使用自动测速（`url-test`）
 * @param input.regexFilter - 是否使用正则过滤模式（`include-all` + `filter`）
 * @param input.countryInfo - 地区节点信息数组，用于非正则模式下直接枚举节点名称
 * @returns 生成的地区代理组配置数组
 */
export function buildCountryProxyGroups({
    countries,
    landing,
    loadBalance,
    regexFilter,
    countryInfo,
}: BuildCountryProxyGroupsInput): ProxyGroup[] {
    const groups: ProxyGroup[] = [];
    const groupType = loadBalance ? "load-balance" : "url-test";

    const nodesByCountry: Record<string, string[]> | null = !regexFilter
        ? Object.fromEntries(countryInfo.map((item: CountryInfoItem) => [item.country, item.nodes]))
        : null;

    for (const country of countries) {
        const meta = countriesMeta[country];
        if (!meta) continue;

        const groupConfig: ProxyGroup = {
            name: `${country}${NODE_SUFFIX}`,
            icon: meta.icon,
            type: groupType,
            url: "https://cp.cloudflare.com/generate_204",
            interval: 60,
            tolerance: 20,
            ...(loadBalance ? { strategy: "sticky-sessions" } : {}),
        };

        if (!regexFilter) {
            const nodeNames = nodesByCountry?.[country] || [];
            groupConfig["proxies"] = withoutSucaiNodes(nodeNames);
        } else {
            Object.assign(groupConfig, {
                "include-all": true,
                filter: meta.pattern,
            });
            const excludeFilter = combineExcludeFilters(
                landing ? LANDING_NODE_MATCHER.pattern : undefined,
                SUCAI_NODE_MATCHER.pattern
            );
            if (excludeFilter) groupConfig["exclude-filter"] = excludeFilter;
        }

        groups.push(groupConfig);
    }

    return groups;
}

export function buildProxyGroups({
    landing,
    regexFilter,
    countries,
    countryProxyGroups,
    lowCostNodes,
    landingNodes,
    defaultProxies,
    defaultProxiesDirect,
    defaultSelector,
    defaultFallback,
    frontProxySelector,
}: BuildProxyGroupsInput): ProxyGroup[] {
    const hasTW = countries.includes("台湾");
    const hasHK = countries.includes("香港");
    const hasUS = countries.includes("美国");

    const defaultSelectorWithoutSucai = withoutSucaiNodes(defaultSelector);
    const defaultProxiesWithoutSucai = withoutSucaiNodes(defaultProxies);
    const defaultProxiesDirectWithoutSucai = withoutSucaiNodes(defaultProxiesDirect);
    const defaultFallbackWithoutSucai = withoutSucaiNodes(defaultFallback);
    const frontProxySelectorWithoutSucai = withoutSucaiNodes(frontProxySelector);
    const landingNodesWithoutSucai = withoutSucaiNodes(landingNodes);
    const lowCostNodesWithoutSucai = withoutSucaiNodes(lowCostNodes);

    const groups: Array<ProxyGroup | null> = [
        {
            name: PROXY_GROUPS.SELECT,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Proxy.png`,
            type: "select",
            proxies: defaultSelectorWithoutSucai,
        },
        {
            name: PROXY_GROUPS.MANUAL,
            icon: `${CDN_URL}/gh/shindgewongxj/WHATSINStash@master/icon/select.png`,
            "include-all": true,
            "exclude-filter": SUCAI_NODE_MATCHER.pattern,
            type: "select",
        },
        {
            name: PROXY_GROUPS.SUCAI,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Star.png`,
            type: "select",
            "include-all": true,
            filter: SUCAI_NODE_MATCHER.pattern,
        },
        landing
            ? {
                  name: PROXY_GROUPS.FRONT_PROXY,
                  icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Area.png`,
                  type: "select",
                  ...(regexFilter
                      ? {
                            "include-all": true,
                            "exclude-filter": combineExcludeFilters(
                                LANDING_NODE_MATCHER.pattern,
                                SUCAI_NODE_MATCHER.pattern
                            ),
                            proxies: frontProxySelectorWithoutSucai,
                        }
                      : { proxies: frontProxySelectorWithoutSucai }),
              }
            : null,
        landing
            ? {
                  name: PROXY_GROUPS.LANDING,
                  icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Airport.png`,
                  type: "select",
                  ...(regexFilter
                      ? {
                            "include-all": true,
                            filter: LANDING_NODE_MATCHER.pattern,
                            "exclude-filter": SUCAI_NODE_MATCHER.pattern,
                        }
                      : { proxies: landingNodesWithoutSucai }),
              }
            : null,
        {
            name: PROXY_GROUPS.STATIC_RESOURCES,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cloudflare.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.AI_SERVICE,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.CRYPTO,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cryptocurrency_1.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.APPLE,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Apple_2.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.GOOGLE,
            icon: `${CDN_URL}/gh/Orz-3/mini@master/Color/Google.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.MICROSOFT,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Microsoft_Copilot.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.BILIBILI,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/bilibili.png`,
            type: "select",
            proxies:
                hasTW && hasHK
                    ? [PROXY_GROUPS.DIRECT, "台湾节点", "香港节点"]
                    : defaultProxiesDirectWithoutSucai,
        },
        {
            name: PROXY_GROUPS.BAHAMUT,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png`,
            type: "select",
            proxies: hasTW
                ? ["台湾节点", PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL, PROXY_GROUPS.DIRECT]
                : defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.YOUTUBE,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/YouTube.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.NETFLIX,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Netflix.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.TIKTOK,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/TikTok.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.SPOTIFY,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Spotify.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.TELEGRAM,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Telegram.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.TWITTER,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Twitter.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.WEIBO,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Weibo.png`,
            type: "select",
            proxies: defaultProxiesDirectWithoutSucai,
        },
        {
            name: PROXY_GROUPS.TRUTH_SOCIAL,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Truth_Social.png`,
            type: "select",
            proxies: hasUS
                ? ["美国节点", PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL]
                : defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.EHENTAI,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Ehentai.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.PIKPAK,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/PikPak.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.SOGOU_INPUT,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Sougou.png`,
            type: "select",
            proxies: [PROXY_GROUPS.DIRECT, "REJECT"],
        },
        {
            name: PROXY_GROUPS.SSH,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Server.png`,
            type: "select",
            proxies: defaultProxiesWithoutSucai,
        },
        {
            name: PROXY_GROUPS.AUTO,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Auto.png`,
            type: "url-test",
            url: "https://cp.cloudflare.com/generate_204",
            proxies: defaultFallbackWithoutSucai,
            interval: 60,
            tolerance: 20,
        },
        {
            name: PROXY_GROUPS.FALLBACK,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Available_1.png`,
            type: "fallback",
            url: "https://cp.cloudflare.com/generate_204",
            proxies: defaultFallbackWithoutSucai,
            interval: 60,
            tolerance: 20,
        },
        {
            name: PROXY_GROUPS.DIRECT,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Direct.png`,
            type: "select",
            proxies: ["DIRECT", PROXY_GROUPS.SELECT],
        },
        {
            name: PROXY_GROUPS.AD_BLOCK,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png`,
            type: "select",
            proxies: ["REJECT", "REJECT-DROP", PROXY_GROUPS.DIRECT],
        },
        lowCostNodesWithoutSucai.length > 0 || regexFilter
            ? {
                  name: PROXY_GROUPS.LOW_COST,
                  icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Lab.png`,
                  type: "url-test",
                  url: "https://cp.cloudflare.com/generate_204",
                  interval: 60,
                  tolerance: 20,
                  ...(!regexFilter
                      ? { proxies: lowCostNodesWithoutSucai }
                      : {
                            "include-all": true,
                            filter: LOW_COST_NODE_MATCHER.pattern,
                            "exclude-filter": SUCAI_NODE_MATCHER.pattern,
                        }),
              }
            : null,
        ...countryProxyGroups,
    ];

    return groups.filter(Boolean) as ProxyGroup[];
}
