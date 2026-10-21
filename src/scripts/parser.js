(function (global) {
    "use strict";

    const HTML_TAGS = new Set((
        "a abbr address area article aside audio b base bdi bdo blockquote body br button " +
        "canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt " +
        "em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr " +
        "html i iframe img input ins kbd label legend li link main map mark menu meta meter nav " +
        "noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp " +
        "script search section select slot small source span strong style sub summary sup table tbody " +
        "td template textarea tfoot th thead time title tr track u ul var video wbr"
    ).split(/\s+/));

    const VOID_TAGS = new Set((
        "area base br col embed hr img input link meta param source track wbr"
    ).split(/\s+/));

    const SETTINGS = new Set(["title", "description", "lang"]);
    const BLOCK_NAMES = new Set(["css", "js"]);

    function fail(message, lineNumber) {
        throw new Error(`Line ${lineNumber}: ${message}`);
    }

    function findContentSeparator(line) {
        let quote = null;
        let inBrackets = false;

        for (let i = 0; i < line.length; i++) {
            const character = line[i];

            if (quote) {
                if (character === quote) quote = null;
                continue;
            }

            if (inBrackets && (character === "\"" || character === "'")) {
                quote = character;
                continue;
            }

            if (character === "[") inBrackets = true;
            else if (character === "]") inBrackets = false;
            else if (character === "=" && !inBrackets) return i;
        }

        return -1;
    }

    function parseDefinition(line, lineNumber) {
        const equal = findContentSeparator(line);
        const definition = (equal === -1 ? line : line.slice(0, equal)).trim();
        const content = equal === -1 ? "" : line.slice(equal + 1);

        if (!definition) fail("Expected a tag or setting before '='.", lineNumber);

        if (definition === "!DOCTYPE html") {
            if (equal !== -1) fail("DOCTYPE cannot have content.", lineNumber);
            return { type: "doctype" };
        }

        const tagMatch = definition.match(/^([a-z][a-z0-9-]*)(.*)$/i);
        if (!tagMatch) fail(`Invalid shorthand "${line}".`, lineNumber);

        const originalTag = tagMatch[1];
        const tag = originalTag.toLowerCase();
        const remainder = tagMatch[2];

        const component = global.HSComponents.get(tag);
        if (!HTML_TAGS.has(tag) && !component) {
            fail(`Unknown HTML tag or component "${originalTag}".`, lineNumber);
        }

        const node = {
            type: "element",
            tag: component ? component.tag : tag,
            component: component ? tag : null,
            attributes: {},
            content,
            children: [],
            line: lineNumber
        };

        let position = 0;
        while (position < remainder.length) {
            const rest = remainder.slice(position);
            const classMatch = rest.match(/^\.([a-zA-Z_][\w-]*)/);
            const idMatch = rest.match(/^#([a-zA-Z_][\w-]*)/);
            const attrMatch = rest.match(/^\[([^\]]+)\]/);

            if (classMatch) {
                const existing = node.attributes.class || "";
                node.attributes.class = `${existing} ${classMatch[1]}`.trim();
                position += classMatch[0].length;
                continue;
            }

            if (idMatch) {
                if (Object.hasOwn(node.attributes, "id")) {
                    fail("An element can only declare one ID.", lineNumber);
                }
                node.attributes.id = idMatch[1];
                position += idMatch[0].length;
                continue;
            }

            if (attrMatch) {
                const parsed = attrMatch[1].match(
                    /^([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?$/
                );
                if (!parsed) fail(`Invalid attribute syntax "[${attrMatch[1]}]".`, lineNumber);

                const name = parsed[1].toLowerCase();
                if (Object.hasOwn(node.attributes, name)) {
                    fail(`Duplicate attribute "${name}".`, lineNumber);
                }

                const value = parsed[2] ?? parsed[3] ?? parsed[4];
                node.attributes[name] = value === undefined ? null : value;
                position += attrMatch[0].length;
                continue;
            }

            fail(`Unexpected syntax "${rest}". Use .class, #id, or [attribute="value"].`, lineNumber);
        }

        if (VOID_TAGS.has(node.tag) && content.trim()) {
            fail(`The "${node.tag}" element cannot contain text.`, lineNumber);
        }

        return node;
    }

    function parse(source) {
        const lines = source.replace(/\r\n?/g, "\n").split("\n");
        const result = {
            settings: { title: "HTML Shorthand App", description: "", lang: "en" },
            nodes: [],
            css: "",
            js: ""
        };

        const stack = [{ indent: -1, children: result.nodes }];
        let doctypeSeen = false;
        let i = 0;

        while (i < lines.length) {
            const original = lines[i];
            const trimmed = original.trim();
            const lineNumber = i + 1;

            if (!trimmed || trimmed.startsWith("//")) {
                i++;
                continue;
            }

            const indent = original.match(/^[ \t]*/)[0].replace(/\t/g, "    ").length;

            if (indent === 0 && /^(css|js):$/.test(trimmed)) {
                const blockName = trimmed.slice(0, -1);
                const blockLines = [];
                i++;

                while (i < lines.length) {
                    const blockLine = lines[i];
                    if (blockLine.trim() && !/^[ \t]/.test(blockLine)) break;
                    blockLines.push(blockLine);
                    i++;
                }

                while (blockLines.length && !blockLines[0].trim()) blockLines.shift();
                while (blockLines.length && !blockLines[blockLines.length - 1].trim()) blockLines.pop();

                const nonEmptyIndents = blockLines
                    .filter(line => line.trim())
                    .map(line => line.match(/^[ \t]*/)[0].replace(/\t/g, "    ").length);
                const minIndent = nonEmptyIndents.length ? Math.min(...nonEmptyIndents) : 0;
                const block = blockLines.map(line => {
                    if (!line.trim()) return "";
                    const leading = line.match(/^[ \t]*/)[0];
                    const leadingSpaces = leading.replace(/\t/g, "    ").length;
                    return line.slice(Math.min(minIndent, leadingSpaces));
                }).join("\n");

                result[blockName] += (result[blockName] ? "\n" : "") + block;
                continue;
            }

            const equal = trimmed.indexOf("=");
            const key = equal === -1 ? "" : trimmed.slice(0, equal).trim();

            if (indent === 0 && SETTINGS.has(key)) {
                result.settings[key] = trimmed.slice(equal + 1).trim();
                i++;
                continue;
            }

            const node = parseDefinition(trimmed, lineNumber);

            if (node.type === "doctype") {
                if (doctypeSeen) fail("DOCTYPE can only appear once.", lineNumber);
                doctypeSeen = true;
                result.nodes.unshift(node);
                i++;
                continue;
            }

            while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
                stack.pop();
            }

            if (indent > stack[stack.length - 1].indent && stack.length > 1 &&
                indent <= stack[stack.length - 1].indent) {
                fail("Invalid indentation.", lineNumber);
            }

            const parent = stack[stack.length - 1];
            if (parent.node && VOID_TAGS.has(parent.node.tag)) {
                fail(`Cannot nest elements inside void element "${parent.node.tag}".`, lineNumber);
            }

            parent.children.push(node);

            if (!VOID_TAGS.has(node.tag)) {
                stack.push({ indent, children: node.children, node });
            }

            i++;
        }

        return result;
    }

    global.HSParser = { parse, HTML_TAGS, VOID_TAGS };
})(window);
