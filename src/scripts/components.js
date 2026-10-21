(function (global) {
    "use strict";

    const definitions = {
        nav: {
            tag: "nav",
            className: "hs-nav",
            css: `
.hs-nav {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    min-height: 64px;
    padding: 0 1.25rem;
    background: #f1f3f5;
    color: #20242a;
}
.hs-nav > * { margin-top: 0; margin-bottom: 0; }
.hs-nav a { color: inherit; }
`
        },
        card: {
            tag: "section",
            className: "hs-card",
            css: `
.hs-card {
    padding: 1.25rem;
    border: 1px solid #d9dee7;
    border-radius: 12px;
    background: #fff;
    color: #20242a;
}
`
        },
        hero: {
            tag: "section",
            className: "hs-hero",
            css: `
.hs-hero {
    padding: clamp(2rem, 7vw, 5rem) 1.5rem;
    background: #f1f3f5;
    color: #20242a;
}
`
        },
        sidebar: {
            tag: "aside",
            className: "hs-sidebar",
            css: `
.hs-sidebar {
    width: min(100%, 280px);
    padding: 1rem;
    background: #f1f3f5;
    color: #20242a;
}
`
        },
        footer: {
            tag: "footer",
            className: "hs-footer",
            css: `
.hs-footer {
    width: 100%;
    padding: 1.25rem;
    background: #20242a;
    color: #fff;
}
.hs-footer a { color: inherit; }
`
        }
    };

    global.HSComponents = {
        definitions,
        get(name) {
            return definitions[name] || null;
        },
        getCSS() {
            return Object.values(definitions)
                .map(definition => definition.css)
                .join("\n");
        }
    };
})(window);
