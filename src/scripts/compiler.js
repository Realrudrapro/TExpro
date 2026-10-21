(function (global) {
    "use strict";

    function escapeText(value) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function escapeAttribute(value) {
        return escapeText(value).replace(/"/g, "&quot;");
    }

    function renderNodes(nodes, depth = 0) {
        const pad = "  ".repeat(depth);

        return nodes.map(node => {
            if (node.type === "doctype") return `${pad}<!DOCTYPE html>`;

            const attributes = { ...node.attributes };

            if (node.component) {
                const component = global.HSComponents.get(node.component);
                const classes = [component.className, attributes.class]
                    .filter(Boolean)
                    .join(" ");
                attributes.class = classes;
            }

            const attributeText = Object.entries(attributes).map(([name, value]) => {
                if (value === null) return ` ${name}`;
                return ` ${name}="${escapeAttribute(value)}"`;
            }).join("");

            const open = `${pad}<${node.tag}${attributeText}>`;

            if (global.HSParser.VOID_TAGS.has(node.tag)) return open;

            const inner = [];
            if (node.content !== "") {
                inner.push(`${"  ".repeat(depth + 1)}${escapeText(node.content)}`);
            }
            if (node.children.length) {
                inner.push(renderNodes(node.children, depth + 1));
            }

            if (!inner.length) return `${open}</${node.tag}>`;
            return `${open}\n${inner.join("\n")}\n${pad}</${node.tag}>`;
        }).join("\n");
    }

    function compile(source) {
        const parsed = global.HSParser.parse(source);
        const htmlBody = renderNodes(parsed.nodes);
        const css = `${global.HSComponents.getCSS()}\n${parsed.css}`.trim();
        const js = parsed.js.trim();

        const html = [
            "<!DOCTYPE html>",
            '<html lang="' + escapeAttribute(parsed.settings.lang || "en") + '">',
            "<head>",
            '  <meta charset="UTF-8">',
            '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '  <meta name="description" content="' + escapeAttribute(parsed.settings.description || "") + '">',
            "  <title>" + escapeText(parsed.settings.title || "HTML Shorthand App") + "</title>",
            '  <link rel="stylesheet" href="style.css">',
            "</head>",
            "<body>",
            htmlBody,
            '  <script src="script.js" defer></' + "script>",
            "</body>",
            "</html>"
        ].join("\n");

        return {
            "index.html": html,
            "style.css": css + "\n",
            "script.js": js ? js + "\n" : ""
        };
    }

    global.HSCompiler = { compile };
})(window);
