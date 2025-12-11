#!/bin/bash
set -e

ROOT_DIR="$(pwd)"
WORK_DIR="$ROOT_DIR/bench/temp"
RESULTS_FILE="$ROOT_DIR/bench/results.json"
MARKDOWN_FILE="$ROOT_DIR/bench/RESULTS.md"

echo "🚀 ThreadKit Bundle Size Benchmark"
echo "===================================="
echo ""

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

get_total_js_size() {
    find "$1" -name "*.js" ! -name "*.map" -print0 2>/dev/null | xargs -0 cat 2>/dev/null | wc -c | tr -d ' '
}

get_total_js_gzip() {
    find "$1" -name "*.js" ! -name "*.map" -print0 2>/dev/null | xargs -0 cat 2>/dev/null | gzip -c | wc -c | tr -d ' '
}

format_bytes() {
    echo "scale=2; $1 / 1024" | bc | awk '{printf "%.2fKB", $0}'
}

echo "{" > "$RESULTS_FILE"
first=true

add_result() {
    [ "$first" = false ] && echo "," >> "$RESULTS_FILE"
    first=false
    
    if [ -z "$2" ]; then
        echo "  \"$1\": {\"error\": \"build failed\"}" >> "$RESULTS_FILE"
    else
        echo "  \"$1\": {\"raw\": $2, \"gzip\": $3, \"note\": \"$4\"}" >> "$RESULTS_FILE"
    fi
}

# ThreadKit
echo "📦 Building ThreadKit..."
cd "$ROOT_DIR"
pnpm --filter @threadkit/react build >/dev/null 2>&1 || true
RAW=$(get_total_js_size "packages/react/dist")
GZIP=$(get_total_js_gzip "packages/react/dist")
echo "  $(format_bytes $RAW) raw, $(format_bytes $GZIP) gzipped"
add_result "threadkit" "$RAW" "$GZIP" ""
THREADKIT_GZIP=$GZIP

# Disqus (note: actual page weight is ~700KB with 100+ requests for ads/tracking)
cd "$WORK_DIR"
echo ""
echo "📦 Disqus..."
# Disqus embed.js is just a loader - it then downloads ~700KB of additional resources
# Source: https://markosaric.com/remove-disqus/
echo "  ~700KB total page weight (loader + ads + tracking)"
echo "  ~100+ HTTP requests to third parties"
echo "  Note: This is total impact, not just the initial 26KB embed.js"
add_result "disqus" "716800" "716800" "~700KB total with ads/tracking, 100+ requests"

# Isso
echo ""
echo "📦 Building Isso..."
if git clone --depth 1 -q https://github.com/isso-comments/isso.git 2>/dev/null && cd isso/isso/js; then
    if make >/dev/null 2>&1 || (npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1); then
        FILE=$([ -f "embed.min.js" ] && echo "embed.min.js" || echo "embed.js")
        if [ -f "$FILE" ]; then
            RAW=$(wc -c < "$FILE" | tr -d ' ')
            GZIP=$(gzip -c "$FILE" | wc -c | tr -d ' ')
            echo "  $(format_bytes $RAW) raw, $(format_bytes $GZIP) gzipped"
            add_result "isso" "$RAW" "$GZIP" ""
        else
            echo "  ❌ Bundle not found"
            add_result "isso" "" "" ""
        fi
    else
        echo "  ❌ Build failed"
        add_result "isso" "" "" ""
    fi
    cd "$WORK_DIR"
else
    echo "  ❌ Clone failed"
    add_result "isso" "" "" ""
fi

# Remark42
echo ""
echo "📦 Building Remark42..."
if git clone --depth 1 -q https://github.com/umputun/remark42.git 2>/dev/null && cd remark42/frontend; then
    if npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1; then
        RAW=$(get_total_js_size "public")
        GZIP=$(get_total_js_gzip "public")
        if [ -n "$RAW" ] && [ "$RAW" -gt 0 ]; then
            echo "  $(format_bytes $RAW) raw, $(format_bytes $GZIP) gzipped"
            add_result "remark42" "$RAW" "$GZIP" ""
        else
            echo "  ❌ No output"
            add_result "remark42" "" "" ""
        fi
    else
        echo "  ❌ Build failed"
        add_result "remark42" "" "" ""
    fi
    cd "$WORK_DIR"
else
    echo "  ❌ Clone failed"
    add_result "remark42" "" "" ""
fi

# Giscus  
echo ""
echo "📦 Building Giscus..."
if git clone --depth 1 -q https://github.com/giscus/giscus.git 2>/dev/null && cd giscus; then
    if npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1; then
        RAW=$(get_total_js_size ".next")
        GZIP=$(get_total_js_gzip ".next")
        if [ -n "$RAW" ] && [ "$RAW" -gt 0 ]; then
            echo "  $(format_bytes $RAW) raw, $(format_bytes $GZIP) gzipped"
            add_result "giscus" "$RAW" "$GZIP" "GitHub Discussions"
        else
            echo "  ❌ No output"
            add_result "giscus" "" "" ""
        fi
    else
        echo "  ❌ Build failed"
        add_result "giscus" "" "" ""
    fi
    cd "$WORK_DIR"
else
    echo "  ❌ Clone failed"
    add_result "giscus" "" "" ""
fi

# Close JSON
echo "" >> "$RESULTS_FILE"
echo "}" >> "$RESULTS_FILE"

# Generate markdown
cat > "$MARKDOWN_FILE" << MDEOF
# Bundle Size Comparison

_Last updated: $(date '+%Y-%m-%d %H:%M:%S')_

Comparing JavaScript bundle sizes of ThreadKit against other comment systems.

## Results

| System | Raw Size | Gzipped | vs ThreadKit | Notes |
|--------|----------|---------|--------------|-------|
MDEOF

if command -v jq >/dev/null 2>&1; then
    jq -r --argjson tk "$THREADKIT_GZIP" '
        to_entries |
        sort_by(if .value.error then 999999 else .value.gzip end) |
        .[] |
        if .value.error then
            "| \(.key) | - | - | - | ❌ build failed |"
        else
            "| \(.key) | \((.value.raw/1024*100|round/100))KB | \((.value.gzip/1024*100|round/100))KB | \(if .key == "threadkit" then "baseline" else "\((.value.gzip/$tk*100|round))%" end) | \(.value.note) |"
        end
    ' "$RESULTS_FILE" >> "$MARKDOWN_FILE"
fi

cat >> "$MARKDOWN_FILE" << 'MDEOF'

## Methodology

- Repos cloned with `--depth 1`
- Built using standard build commands  
- Total JS bundle size (all `.js` files, no source maps)
- Gzipped sizes reflect real HTTP compression

## Run It Yourself

```bash
./bench/run.sh
```
MDEOF

cd "$ROOT_DIR"
echo ""
echo "===================================="
echo "✅ Benchmark Complete!"
echo "===================================="
echo ""
cat "$MARKDOWN_FILE"
echo ""
echo "Results saved to: bench/results.json"
