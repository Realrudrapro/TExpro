
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

    const definition = (
        separator === -1
            ? line
            : line.slice(0, separator)
    ).trim();

    const content = separator === -1
        ? ""
        : line.slice(separator + 1);

    if (definition === "!DOCTYPE html") {
        if (separator !== -1) {
            throw new Error("DOCTYPE cannot have content.");
        }

        return { doctype: true };
    }

    const match = definition.match(/^([a-z][a-z0-9-]*)(.*)$/i);

    if (!match) {
        throw new Error(`Invalid syntax: "${line}"`);
    }

    const tag = match[1].toLowerCase();
    const remainder = match[2];

    if (!validTags.has(tag)) {
        throw new Error(`Unknown HTML tag: "${tag}"`);
    }

    const node = {
        tag,
        attributes: {},
        content,
        children: []
    };

    let position = 0;

    while (position < remainder.length) {
        const rest = remainder.slice(position);

        const classMatch = rest.match(/^\.([a-zA-Z_][\w-]*)/);
        const idMatch = rest.match(/^#([a-zA-Z_][\w-]*)/);
        const attrMatch = rest.match(/^\[([^\]]+)\]/);

        if (classMatch) {
            const existing = node.attributes.class || "";
            node.attributes.class =
                `${existing} ${classMatch[1]}`.trim();

            position += classMatch[0].length;
            continue;
        }

        if (idMatch) {
            if (node.attributes.id !== undefined) {
                throw new Error(`Duplicate ID declaration: "${line}"`);
            }

            node.attributes.id = idMatch[1];
            position += idMatch[0].length;
            continue;
        }

        if (attrMatch) {
            const attribute = attrMatch[1].match(
                /^([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s]+)))?$/
            );

            if (!attribute) {
                throw new Error(`Invalid attribute syntax: "${line}"`);
            }

            const name = attribute[1].toLowerCase();

            if (Object.hasOwn(node.attributes, name)) {
                throw new Error(`Duplicate attribute: "${name}"`);
            }

            const value =
                attribute[2] ??
                attribute[3] ??
                attribute[4];

            node.attributes[name] =
                value === undefined ? null : value;

            position += attrMatch[0].length;
            continue;
        }

        throw new Error(`Unexpected syntax: "${rest}"`);
    }

    if (voidTags.has(tag) && content.trim()) {
        throw new Error(`The "${tag}" tag cannot contain text.`);
    }

    return node;
}

function parseShorthand(text) {
    const root = [];
    const stack = [{ indent: -1, children: root }];

    for (const originalLine of text.split(/\r?\n/)) {
        if (!originalLine.trim()) continue;

        const indent = originalLine.match(/^[ \t]*/)[0]
            .replace(/\t/g, "    ").length;

        const node = parseLine(originalLine.trim());

        if (node.doctype) {
            if (root.some(item => item.doctype)) {
                throw new Error("DOCTYPE can only appear once.");
            }

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
            .map(([name, value]) =>
                value === null
                    ? ` ${name}`
                    : ` ${name}="${escapeHTML(value)}"`
            )
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

        return inside.length
            ? `${opening}\n${inside.join("\n")}\n${indent}</${node.tag}>`
            : `${opening}</${node.tag}>`;
    }).join("\n");
}

function renderPreview(nodes, parent) {
    for (const node of nodes) {
        if (node.doctype) continue;

        const element = document.createElement(node.tag);

        for (const [name, value] of Object.entries(node.attributes)) {
            element.setAttribute(name, value ?? "");
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
        output.textContent = `Error: ${error.message}`;
        output.dataset.html = "";
        preview.replaceChildren();
    }
}

generate.addEventListener("click", generateHTML);

copy.addEventListener("click", async () => {
    const html = output.dataset.html || "";

    if (!html) {
        copy.textContent = "Nothing valid to copy";
        return;
    }

    try {
        await navigator.clipboard.writeText(html);
        copy.textContent = "Copied!";

        setTimeout(() => {
            copy.textContent = "Copy HTML";
        }, 1500);
    } catch {
        copy.textContent = "Copy failed";
    }
});

generateHTML();
