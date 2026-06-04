import {
    AUTO_SC_GROUP_REGEXP,
    CDN_URL,
    LANDING_NODE_MATCHER,
    LOW_COST_NODE_MATCHER,
    NODE_SUFFIX,
    PROXY_GROUPS,
    countriesMeta,
} from "./constants";
import type {
    BuildCountryProxyGroupsInput,
    BuildProxyGroupsInput,
    ProxyGroup,
} from "./types";


function isAutoScNode(nodeName: string): boolean {
    return AUTO_SC_GROUP_REGEXP.test(nodeName);
}

function extractAutoScGroupName(nodeName: string): string | null {
    const match = nodeName.match(AUTO_SC_GROUP_REGEXP);
    return match?.[1]?.trim() || null;
}

function withoutAutoScNodes(nodes: string[], autoScNodeSet: Set<string>): string[] {
    return nodes.filter((nodeName) => !autoScNodeSet.has(nodeName));
}

function combineExcludeFilters(...filters: Array<string | undefined>): string | undefined {
    const validFilters = filters.filter(Boolean) as string[];
    return validFilters.length > 0 ? validFilters.join("|") : undefined;
}

function buildAutoScProxyGroups(countryInfo: CountryInfoItem[]): {
    groups: ProxyGroup[];
    autoScNodeSet: Set<string>;
} {
    const groupMap = new Map<string, string[]>();
    const autoScNodeSet = new Set<string>();

    for (const item of countryInfo) {
        for (const nodeName of item.nodes) {
            const groupName = extractAutoScGroupName(nodeName);
            if (!groupName) continue;

            autoScNodeSet.add(nodeName);

            if (!groupMap.has(groupName)) {
                groupMap.set(groupName, []);
            }
            groupMap.get(groupName)!.push(nodeName);
        }
    }

    const groups: ProxyGroup[] = Array.from(groupMap.entries()).map(([groupName, nodeNames]) => ({
        name: groupName,
        icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Star.png`,
        type: "select",
        proxies: nodeNames,
    }));

    return { groups, autoScNodeSet };
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
            groupConfig["proxies"] = nodeNames.filter((nodeName) => !isAutoScNode(nodeName));
        } else {
            Object.assign(groupConfig, {
                "include-all": true,
                filter: meta.pattern,
            });

            const excludeFilter = combineExcludeFilters(
                landing ? LANDING_NODE_MATCHER.pattern : undefined,
                AUTO_SC_GROUP_REGEXP.source
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
    countryInfo,
}: BuildProxyGroupsInput & { countryInfo: CountryInfoItem[] }): ProxyGroup[] {
    const hasTW = countries.includes("台湾");
    const hasHK = countries.includes("香港");
    const hasUS = countries.includes("美国");

    // 先自动扫描 sc.<group>. 节点，生成独立 group
    const { groups: autoScGroups, autoScNodeSet } = buildAutoScProxyGroups(countryInfo);

    const defaultSelectorWithoutAutoSc = withoutAutoScNodes(defaultSelector, autoScNodeSet);
    const defaultProxiesWithoutAutoSc = withoutAutoScNodes(defaultProxies, autoScNodeSet);
    const defaultProxiesDirectWithoutAutoSc = withoutAutoScNodes(defaultProxiesDirect, autoScNodeSet);
    const defaultFallbackWithoutAutoSc = withoutAutoScNodes(defaultFallback, autoScNodeSet);
    const frontProxySelectorWithoutAutoSc = withoutAutoScNodes(frontProxySelector, autoScNodeSet);
    const landingNodesWithoutAutoSc = withoutAutoScNodes(landingNodes, autoScNodeSet);
    const lowCostNodesWithoutAutoSc = withoutAutoScNodes(lowCostNodes, autoScNodeSet);

    const groups: Array<ProxyGroup | null> = [
        {
            name: PROXY_GROUPS.SELECT,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Proxy.png`,
            type: "select",
            proxies: defaultSelectorWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.MANUAL,
            icon: `${CDN_URL}/gh/shindgewongxj/WHATSINStash@master/icon/select.png`,
            "include-all": true,
            "exclude-filter": AUTO_SC_GROUP_REGEXP.source,
            type: "select",
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
                                AUTO_SC_GROUP_REGEXP.source
                            ),
                            proxies: frontProxySelectorWithoutAutoSc,
                        }
                      : { proxies: frontProxySelectorWithoutAutoSc }),
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
                            "exclude-filter": AUTO_SC_GROUP_REGEXP.source,
                        }
                      : { proxies: landingNodesWithoutAutoSc }),
              }
            : null,
        {
            name: PROXY_GROUPS.STATIC_RESOURCES,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cloudflare.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.AI_SERVICE,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.CRYPTO,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Cryptocurrency_1.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.APPLE,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Apple_2.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.GOOGLE,
            icon: `${CDN_URL}/gh/Orz-3/mini@master/Color/Google.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.MICROSOFT,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Microsoft_Copilot.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.BILIBILI,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/bilibili.png`,
            type: "select",
            proxies:
                hasTW && hasHK
                    ? [PROXY_GROUPS.DIRECT, "台湾节点", "香港节点"]
                    : defaultProxiesDirectWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.BAHAMUT,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Bahamut.png`,
            type: "select",
            proxies: hasTW
                ? ["台湾节点", PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL, PROXY_GROUPS.DIRECT]
                : defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.YOUTUBE,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/YouTube.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.NETFLIX,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Netflix.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.TIKTOK,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/TikTok.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.SPOTIFY,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Spotify.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.TELEGRAM,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Telegram.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.TWITTER,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Twitter.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.WEIBO,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Weibo.png`,
            type: "select",
            proxies: defaultProxiesDirectWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.TRUTH_SOCIAL,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Truth_Social.png`,
            type: "select",
            proxies: hasUS
                ? ["美国节点", PROXY_GROUPS.SELECT, PROXY_GROUPS.MANUAL]
                : defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.EHENTAI,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/Ehentai.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.PIKPAK,
            icon: `${CDN_URL}/gh/powerfullz/override-rules@master/icons/PikPak.png`,
            type: "select",
            proxies: defaultProxiesWithoutAutoSc,
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
            proxies: defaultProxiesWithoutAutoSc,
        },
        {
            name: PROXY_GROUPS.AUTO,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Auto.png`,
            type: "url-test",
            url: "https://cp.cloudflare.com/generate_204",
            proxies: defaultFallbackWithoutAutoSc,
            interval: 60,
            tolerance: 20,
        },
        {
            name: PROXY_GROUPS.FALLBACK,
            icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Available_1.png`,
            type: "fallback",
            url: "https://cp.cloudflare.com/generate_204",
            proxies: defaultFallbackWithoutAutoSc,
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
        lowCostNodesWithoutAutoSc.length > 0 || regexFilter
            ? {
                  name: PROXY_GROUPS.LOW_COST,
                  icon: `${CDN_URL}/gh/Koolson/Qure@master/IconSet/Color/Lab.png`,
                  type: "url-test",
                  url: "https://cp.cloudflare.com/generate_204",
                  interval: 60,
                  tolerance: 20,
                  ...(!regexFilter
                      ? { proxies: lowCostNodesWithoutAutoSc }
                      : {
                            "include-all": true,
                            filter: LOW_COST_NODE_MATCHER.pattern,
                            "exclude-filter": AUTO_SC_GROUP_REGEXP.source,
                        }),
              }
            : null,
        // 自动生成的 sc.<group>. 节点组插在最后
        ...autoScGroups,
        ...countryProxyGroups,
    ];

    return groups.filter(Boolean) as ProxyGroup[];
}
