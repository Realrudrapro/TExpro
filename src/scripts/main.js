
const input = document.querySelector("#input");
const output = document.querySelector("#output");
const preview = document.querySelector("#preview");
const generate = document.querySelector("#generate");
const copy = document.querySelector("#copy");

const validTags = new Set([
    "a", "abbr", "address", "area", "article", "aside",
    "audio", "b", "base", "bdi", "bdo", "blockquote",
    "body", "br", "button", "canvas", "caption", "cite",
    "code", "col", "colgroup", "data", "datalist", "dd",
    "del", "details", "dfn", "dialog", "div", "dl", "dt",
    "em", "embed", "fieldset", "figcaption", "figure",
    "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
    "head", "header", "hgroup", "hr", "html", "i", "iframe",
    "img", "input", "ins", "kbd", "label", "legend", "li",
    "link", "main", "map", "mark", "menu", "meta", "meter",
    "nav", "noscript", "object", "ol", "optgroup", "option",
    "output", "p", "param", "picture", "pre", "progress",
    "q", "rp", "rt", "ruby", "s", "samp", "script", "search",
    "section", "select", "slot", "small", "source", "span",
    "strong", "style", "sub", "summary", "sup", "table",
    "tbody", "td", "template", "textarea", "tfoot", "th",
    "thead", "time", "title", "tr", "track", "u", "ul",
    "var", "video", "wbr"
]);

const voidTags = new Set([
    "area", "base", "br", "col", "embed", "hr",
    "img", "input", "link", "meta", "param",
    "source", "track", "wbr"
]);

function escapeHTML(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function parseLine(line) {
    const separator = line.indexOf("=");

    let definition;
    let content;

    if (separator === -1) {
        definition = line.trim();
        content = "";
    } else {
        definition = line.slice(0, separator).trim();
        content = line.slice(separator + 1);
    }

    if (definition === "!DOCTYPE html") {
        return { doctype: true };
    }

    const tagMatch = definition.match(/^([a-z][a-z0-9-]*)/i);

    if (!tagMatch) {
        throw new Error(`Invalid HTML shorthand: ${line}`);
    }

    const tag = tagMatch[1].toLowerCase();

    if (!validTags.has(tag)) {
        throw new Error(`Unknown HTML tag: ${tag}`);
    }

    const remainder = definition.slice(tagMatch[0].length);

    const node = {
        tag,
        attributes: {},
        content,
        children: []
    };

    const tokenPattern =
        /\.([a-zA-Z_][\w-]*)|#([a-zA-Z_][\w-]*)|\[\s*([^\]]+)\s*\]/g;

    let match;
    let consumed = "";

    while ((match = tokenPattern.exec(remainder)) !== null) {
        const gap = remainder.slice(consumed.length, match.index);

        if (gap.trim() !== "") {
            throw new Error(`Invalid syntax: ${line}`);
        }

        consumed = remainder.slice(0, tokenPattern.lastIndex);

        if (match[1]) {
            const existing = node.attributes.class || "";
            node.attributes.class =
                `${existing} ${match[1]}`.trim();
        } else if (match[2]) {
            if (node.attributes.id !== undefined) {
                throw new Error(`Duplicate ID declaration: ${line}`);
            }

            node.attributes.id = match[2];
        } else {
            const attributeMatch = match[3].match(
                /^\s*([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(.+)))?\s*$/
            );

            if (!attributeMatch) {
                throw new Error(`Invalid attribute: ${line}`);
            }

            const name = attributeMatch[1].toLowerCase();

            if (Object.hasOwn(node.attributes, name)) {
                throw new Error(`Duplicate attribute "${name}": ${line}`);
            }

            const value =
                attributeMatch[2] ??
                attributeMatch[3] ??
                attributeMatch[4];

            node.attributes[name] =
                value === undefined ? null : value;
        }
    }

    if (consumed.length !== remainder.length) {
        throw new Error(`Invalid syntax: ${line}`);
    }

    return node;
}

function parseShorthand(text) {
    const root = [];
    const stack = [{ indent: -1, children: root }];

    for (const originalLine of text.split(/\r?\n/)) {
        if (!originalLine.trim()) {
            continue;
        }

        const indent = originalLine.match(/^[ \t]*/)[0]
            .replace(/\t/g, "    ").length;

        const line = originalLine.trim();
        const node = parseLine(line);

        if (node.doctype) {
            root.unshift(node);
            continue;
        }

        while (
            stack.length > 1 &&
            indent <= stack[stack.length - 1].indent
        ) {
            stack.pop();
        }

        stack[stack.length - 1].children.push(node);

        if (!voidTags.has(node.tag)) {
            stack.push({
                indent,
                children: node.children
            });
        }
    }

    return root;
}

function renderHTML(nodes, depth = 0) {
    const indent = "  ".repeat(depth);

    return nodes.map(node => {
        if (node.doctype) {
            return `${indent}<!DOCTYPE html>`;
        }

        const attributes = Object.entries(node.attributes)
            .map(([name, value]) => {
                if (value === null) {
                    return ` ${name}`;
                }

                return ` ${name}="${escapeHTML(value)}"`;
            })
            .join("");

        const opening = `${indent}<${node.tag}${attributes}>`;

        if (voidTags.has(node.tag)) {
            return opening;
        }

        const children = renderHTML(node.children, depth + 1);

        const text = node.content
            ? `${"  ".repeat(depth + 1)}${escapeHTML(node.content)}`
            : "";

        const inside = [
            ...(text ? [text] : []),
            ...children
        ];

        if (inside.length === 0) {
            return `${opening}</${node.tag}>`;
        }

        return `${opening}\n${inside.join("\n")}\n${indent}</${node.tag}>`;
    }).join("\n");
}

function renderPreview(nodes, parent) {
    for (const node of nodes) {
        if (node.doctype) {
            continue;
        }

        const element = document.createElement(node.tag);

        for (const [name, value] of Object.entries(node.attributes)) {
            if (value === null) {
                element.setAttribute(name, "");
            } else {
                element.setAttribute(name, value);
            }
        }

        if (node.content) {
            element.textContent = node.content;
        }

        parent.appendChild(element);
        renderPreview(node.children, element);
    }
}

function generateHTML() {
    try {
        const nodes = parseShorthand(input.value);
        const html = renderHTML(nodes);

        output.textContent = html;
        output.dataset.html = html;

        preview.replaceChildren();
        renderPreview(nodes, preview);
    } catch (error) {
        output.textContent = error.message;
        output.dataset.html = "";
        preview.replaceChildren();
    }
}

generate.addEventListener("click", generateHTML);

copy.addEventListener("click", async () => {
    const html = output.dataset.html || "";

    try {
        await navigator.clipboard.writeText(html);
        copy.textContent = "Copied!";

        setTimeout(() => {
            copy.textContent = "Copy HTML";
        }, 1500);
    } catch {
        copy.textContent = "Copy unavailable — select the output manually.";
    }
});

generateHTML();
