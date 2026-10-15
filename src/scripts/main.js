
const input = document.querySelector("#input");
const output = document.querySelector("#output");
const preview = document.querySelector("#preview");
const generate = document.querySelector("#generate");
const copy = document.querySelector("#copy");

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
        return null;
    }

    const tag = tagMatch[1].toLowerCase();
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
            return null;
        }

        consumed = remainder.slice(0, tokenPattern.lastIndex);

        if (match[1]) {
            const existing = node.attributes.class || "";
            node.attributes.class =
                `${existing} ${match[1]}`.trim();
        } else if (match[2]) {
            node.attributes.id = match[2];
        } else {
            const attributeMatch = match[3].match(
                /^\s*([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(.+)))?\s*$/
            );

            if (!attributeMatch) {
                return null;
            }

            const name = attributeMatch[1].toLowerCase();
            const value =
                attributeMatch[2] ??
                attributeMatch[3] ??
                attributeMatch[4];

            if (value === undefined) {
                node.attributes[name] = null;
            } else {
                node.attributes[name] = value;
            }
        }
    }

    if (consumed.length !== remainder.length) {
        return null;
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

        if (!node) {
            throw new Error(`Invalid shorthand: ${line}`);
        }

        if (node.doctype) {
            root.unshift(node);
            continue;
        }

        while (stack.length > 1 &&
               indent <= stack[stack.length - 1].indent) {
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

        const inside = [...(text ? [text] : []), ...children];

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

        output.textContent = renderHTML(nodes);
        preview.replaceChildren();
        renderPreview(nodes, preview);
        output.dataset.html = output.textContent;
    } catch (error) {
        output.textContent = error.message;
        preview.replaceChildren();
        output.dataset.html = "";
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
        output.focus();
        copy.textContent = "Select and copy the HTML";
    }
});

generateHTML();
