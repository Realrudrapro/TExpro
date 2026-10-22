
(function (global) {
    "use strict";

    const VALID_TAGS = new Set((
        "a abbr address article aside audio b blockquote body br button " +
        "canvas caption cite code col colgroup data datalist dd del details " +
        "dfn dialog div dl dt em fieldset figcaption figure footer form h1 h2 " +
        "h3 h4 h5 h6 head header hgroup hr i iframe img input ins kbd label " +
        "legend li main map mark menu meter nav noscript object ol optgroup " +
        "option output p picture pre progress q rp rt ruby s samp script " +
        "search section select slot small source span strong style sub " +
        "summary sup table tbody td template textarea tfoot th thead time " +
        "title tr track u ul var video wbr"
    ).split(/\s+/));

    const VOID_TAGS = new Set((
        "area base br col embed hr img input link meta param source track wbr"
    ).split(/\s+/));

    const COMPONENT_TAGS = {
        nav: "nav",
        card: "section",
        hero: "section",
        sidebar: "aside",
        footer: "footer"
    };

    function parse(source) {
        if (typeof source !== "string") {
            throw new Error("Source must be a string.");
        }

        const lines = source.replace(/\r\n?/g, "\n").split("\n");
        const nodes = [];
        const stack = [{ indent: -1, children: nodes }];

        const cssLines = [];
        const jsLines = [];

        const settings = {
            title: "HTML Shorthand App",
            description: "",
            lang: "en"
        };

        let blockMode = null;
        let blockIndent = 0;

        function addNode(node, indent) {
            while (
                stack.length > 1 &&
                indent <= stack[stack.length - 1].indent
            ) {
                stack.pop();
            }

            stack[stack.length - 1].children.push(node);

            if (!VOID_TAGS.has(node.tag)) {
                stack.push({
                    indent,
                    children: node.children
                });
            }
        }

        for (let index = 0; index < lines.length; index++) {
            const original = lines[index];

            if (!original.trim()) {
                if (blockMode) {
                    (blockMode === "css" ? cssLines : jsLines).push("");
                }
                continue;
            }

            const indent = original.match(/^\s*/)[0]
                .replace(/\t/g, "    ").length;

            const line = original.trim();

            if (blockMode) {
                if (indent > blockIndent) {
                    const content = original.slice(
                        Math.min(original.length, blockIndent + 2)
                    );

                    (blockMode === "css" ? cssLines : jsLines)
                        .push(content);

                    continue;
                }

                blockMode = null;
            }

            if (line.startsWith("#")) {
                continue;
            }

            const metadata = line.match(
                /^(title|description|lang)=(.*)$/
            );

            if (metadata) {
                settings[metadata[1]] = metadata[2];
                continue;
            }

            if (line === "css:" || line === "js:") {
                blockMode = line.slice(0, -1);
                blockIndent = indent;
                continue;
            }

            const match = line.match(
                /^([a-zA-Z][\w-]*)(?:#([\w-]+))?((?:\.[\w-]+)*)(?:\[(.*?)\])?(?:=(.*))?$/
            );

            if (!match) {
                throw new Error(
                    "Invalid syntax on line " +
                    (index + 1) + ": " + line
                );
            }

            const [
                ,
                rawTag,
                id,
                classText,
                attributesText,
                content
            ] = match;

            const name = rawTag.toLowerCase();
            const isComponent = Object.prototype.hasOwnProperty.call(
                COMPONENT_TAGS,
                name
            );

            if (!VALID_TAGS.has(name) && !isComponent) {
                throw new Error(
                    "Unknown HTML tag or component on line " +
                    (index + 1) + ": " + name
                );
            }

            const tag = isComponent
                ? COMPONENT_TAGS[name]
                : name;

            const attributes = {};

            if (id) {
                attributes.id = id;
            }

            if (classText) {
                attributes.class = classText
                    .split(".")
                    .filter(Boolean)
                    .join(" ");
            }

            if (attributesText) {
                const attributePattern =
                    /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g;

                let attributeMatch;

                while (
                    (attributeMatch = attributePattern.exec(attributesText))
                ) {
                    const attributeName = attributeMatch[1];

                    const attributeValue =
                        attributeMatch[2] ??
                        attributeMatch[3] ??
                        attributeMatch[4] ??
                        null;

                    if (/^on/i.test(attributeName)) {
                        throw new Error(
                            "Inline event handlers are not supported. " +
                            "Use the js: block instead."
                        );
                    }

                    attributes[attributeName] = attributeValue;
                }
            }

            const node = {
                type: "element",
                tag,
                attributes,
                content: content === undefined ? "" : content,
                children: [],
                component: isComponent ? name : null
            };

            addNode(node, indent);
        }

        return {
            nodes,
            css: cssLines.join("\n"),
            js: jsLines.join("\n"),
            settings
        };
    }

    global.HSParser = {
        parse,
        VALID_TAGS,
        VOID_TAGS,
        COMPONENTS: new Set(Object.keys(COMPONENT_TAGS))
    };
})(window);
