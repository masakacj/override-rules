export type UnknownRecord = Record<string, unknown>;

export type ScriptArgs = UnknownRecord;

export interface FeatureFlags {
    loadBalance: boolean;
    landing: boolean;
    ipv6Enabled: boolean;
    fullConfig: boolean;
    keepAliveEnabled: boolean;
    fakeIPEnabled: boolean;
    quicEnabled: boolean;
    regexFilter: boolean;
    countryThreshold: number;
}

export interface ProxyNode extends UnknownRecord {
    name?: string;
}

export interface ClashConfig extends UnknownRecord {
    proxies?: ProxyNode[];
}

export interface CountryMeta {
    weight?: number;
    pattern: string;
    icon: string;
}

export interface CountryInfoItem {
    country: string;
    nodes: string[];
}

export interface CaseInsensitiveNodeMatcher {
    source: string;
    regex: RegExp;
    pattern: string;
}

export interface BaseLists {
    defaultProxies: string[];
    defaultProxiesDirect: string[];
    defaultSelector: string[];
    defaultFallback: string[];
    frontProxySelector: string[];
}

export type ProxyGroup = UnknownRecord;

export interface BuildBaseListsInput {
    landing: boolean;
    lowCostNodes: string[];
    countryGroupNames: string[];
    nonLandingNodes: string[];
    regexFilter: boolean;
}

export interface BuildCountryProxyGroupsInput {
    countries: string[];
    landing: boolean;
    loadBalance: boolean;
    regexFilter: boolean;
    countryInfo: CountryInfoItem[];
}

export interface BuildProxyGroupsInput {
    landing: boolean;
    regexFilter: boolean;
    countries: string[];
    countryProxyGroups: ProxyGroup[];
    lowCostNodes: string[];
    landingNodes: string[];
    defaultProxies: string[];
    defaultProxiesDirect: string[];
    defaultSelector: string[];
    defaultFallback: string[];
    frontProxySelector: string[];
    allProxyNames: string[];
}
