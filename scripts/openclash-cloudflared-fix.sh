#!/bin/sh
# OpenClash / Mihomo: Cloudflare Tunnel Fake-IP exclusion + DIRECT routing.
# For the owner's OpenWrt router. Does not change MosDNS or system DNS.
# Usage: sh openclash-cloudflared-fix.sh check|apply|rollback
set -eu
umask 077

ROOT="/etc/openclash"
FILTER="$ROOT/custom/openclash_custom_fake_filter.list"
RULES="$ROOT/custom/openclash_custom_rules.list"
BACKUP_ROOT="$ROOT/repair-backups"
RULE_A="  - DOMAIN-SUFFIX,argotunnel.com,DIRECT"
RULE_B="  - DOMAIN-SUFFIX,cftunnel.com,DIRECT"
ACTION="$1"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
have_line() { grep -Fxq "$1" "$2"; }
count_line() { grep -Fxc "$1" "$2" || true; }

preflight() {
    [ "$(id -u)" = 0 ] || die "Run as root on the OpenClash router"
    [ -f "$FILTER" ] || die "Missing $FILTER"
    [ -f "$RULES" ] || die "Missing $RULES"
    [ "$(head -n 1 "$RULES")" = "rules:" ] || die "Unknown custom rules format"
    [ "$(uci -q get openclash.config.custom_fakeip_filter)" = 1 ] ||
        die "OpenClash custom Fake-IP filter is not enabled"
    [ "$(uci -q get openclash.config.custom_fakeip_filter_mode)" = blacklist ] ||
        die "Unexpected Fake-IP filter mode; refusing changes"
    [ "$(uci -q get openclash.config.enable_custom_clash_rules)" = 1 ] ||
        die "Custom Clash rules are not enabled"
    [ "$(uci -q get openclash.config.en_mode)" = fake-ip ] ||
        die "OpenClash is not in expected fake-ip mode"
}

check() {
    preflight
    echo "OpenClash targeted Cloudflare Tunnel fix"
    echo "Fake-IP exclusions:"
    for pattern in '*.argotunnel.com' 'argotunnel.com' '*.cftunnel.com' 'cftunnel.com'; do
        if have_line "$pattern" "$FILTER"; then
            printf '  PRESENT: %s\n' "$pattern"
        else
            printf '  MISSING: %s\n' "$pattern"
        fi
    done
    echo "DIRECT rules:"
    for rule in "$RULE_A" "$RULE_B"; do
        if have_line "$rule" "$RULES"; then
            printf '  PRESENT: %s\n' "$rule"
        else
            printf '  MISSING: %s\n' "$rule"
        fi
    done
    echo "No files were changed by check."
}

verify_lines() {
    target_filter="$1"
    target_rules="$2"
    for pattern in '*.argotunnel.com' 'argotunnel.com' '*.cftunnel.com' 'cftunnel.com'; do
        [ "$(count_line "$pattern" "$target_filter")" = 1 ] ||
            die "Fake-IP exclusion missing or duplicated: $pattern"
    done
    [ "$(head -n 1 "$target_rules")" = "rules:" ] || die "Invalid rules header"
    for rule in "$RULE_A" "$RULE_B"; do
        [ "$(count_line "$rule" "$target_rules")" = 1 ] ||
            die "DIRECT rule missing or duplicated: $rule"
    done
}

reload_and_verify() {
    echo "Reloading OpenClash; existing proxied connections may reconnect..."
    /etc/init.d/openclash restart || return 1
    config_name="$(basename "$(uci -q get openclash.config.config_path)")"
    live="$ROOT/$config_name"
    attempt=0
    while [ "$attempt" -lt 35 ]; do
        attempt=$((attempt + 1))
        if /etc/init.d/openclash status 2>/dev/null | grep -q 'running' &&
           [ -f "$live" ] &&
           grep -Fq '*.argotunnel.com' "$live" &&
           grep -Fq '*.cftunnel.com' "$live" &&
           grep -Fq 'DOMAIN-SUFFIX,argotunnel.com,DIRECT' "$live" &&
           grep -Fq 'DOMAIN-SUFFIX,cftunnel.com,DIRECT' "$live"; then
            echo "SUCCESS: OpenClash running; all four Fake-IP filters and two DIRECT rules loaded."
            echo "MosDNS and machine DNS settings were not changed."
            return 0
        fi
        sleep 2
    done
    return 1
}

latest_backup() {
    # Lexicographic order matches the timestamped backup directory name.
    latest=""
    for entry in "$BACKUP_ROOT"/cf-tunnel-20*; do
        if [ -d "$entry" ]; then latest="$entry"; fi
    done
    [ -n "$latest" ] || die "No Cloudflare Tunnel backup found"
    echo "$latest"
}

apply() {
    preflight
    all_present=1
    for pattern in '*.argotunnel.com' 'argotunnel.com' '*.cftunnel.com' 'cftunnel.com'; do
        have_line "$pattern" "$FILTER" || all_present=0
    done
    have_line "$RULE_A" "$RULES" || all_present=0
    have_line "$RULE_B" "$RULES" || all_present=0
    if [ "$all_present" = 1 ]; then
        echo "Already configured. Nothing to change or restart."
        exit 0
    fi

    mkdir -p "$BACKUP_ROOT"
    stamp="$(date +%Y%m%d-%H%M%S)-$$"
    backup="$BACKUP_ROOT/cf-tunnel-$stamp"
    mkdir "$backup"
    cp -p "$FILTER" "$backup/fake-filter.original"
    cp -p "$RULES" "$backup/custom-rules.original"

    stage_filter="$FILTER.cfstage.$$"
    stage_rules="$RULES.cfstage.$$"
    trap 'rm -f "$stage_filter" "$stage_rules"' 0
    trap 'exit 130' 1 2 3 15

    # AWK normalizes a file that originally had no trailing newline.
    awk '{print}' "$FILTER" > "$stage_filter"
    for pattern in '*.argotunnel.com' 'argotunnel.com' '*.cftunnel.com' 'cftunnel.com'; do
        if ! have_line "$pattern" "$FILTER"; then
            printf '%s\n' "$pattern" >> "$stage_filter"
        fi
    done
    add_a=0
    add_b=0
    have_line "$RULE_A" "$RULES" || add_a=1
    have_line "$RULE_B" "$RULES" || add_b=1
    awk -v a="$add_a" -v b="$add_b" -v ra="$RULE_A" -v rb="$RULE_B" '
        NR==1 {print; if(a==1) print ra; if(b==1) print rb; next}
        {print}
    ' "$RULES" > "$stage_rules"

    verify_lines "$stage_filter" "$stage_rules"
    chmod 644 "$stage_filter" "$stage_rules"
    mv "$stage_filter" "$FILTER"
    mv "$stage_rules" "$RULES"
    verify_lines "$FILTER" "$RULES"
    sha256sum "$FILTER" "$RULES" > "$backup/post.sha256"
    printf 'BACKUP: %s\n' "$backup"

    if reload_and_verify; then
        echo "Apply completed. Re-check Tunnel connections and DNS caches."
    else
        echo "Live configuration verification failed; restoring both original files..." >&2
        cp -p "$backup/fake-filter.original" "$FILTER"
        cp -p "$backup/custom-rules.original" "$RULES"
        /etc/init.d/openclash restart || true
        die "Rolled back to previous files. Check OpenClash status manually."
    fi
}

rollback() {
    preflight
    backup="$(latest_backup)"
    [ -f "$backup/fake-filter.original" ] || die "Original filter backup missing"
    [ -f "$backup/custom-rules.original" ] || die "Original rules backup missing"
    [ -f "$backup/post.sha256" ] || die "Post-apply checksum file missing"
    if ! sha256sum -c "$backup/post.sha256" >/dev/null 2>&1; then
        die "Configuration changed after apply; refusing to overwrite later changes"
    fi
    cp -p "$backup/fake-filter.original" "$FILTER"
    cp -p "$backup/custom-rules.original" "$RULES"
    echo "Restored configuration from $backup"
    /etc/init.d/openclash restart || die "Original files restored but restart failed"
    /etc/init.d/openclash status
    echo "ROLLBACK COMPLETE"
}

case "$ACTION" in
    check|--check) check ;;
    apply|--apply) apply ;;
    rollback|--rollback) rollback ;;
    *) die "Usage: sh $0 check|apply|rollback" ;;
esac
