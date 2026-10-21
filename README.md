# HTML Shorthand

A small, browser-based compiler that turns `.hz` source into standard HTML, CSS, and JavaScript. It uses plain JavaScript and does not require Node.js, a framework, or a build step.

## Run it

1. Download or clone this repository.
2. Open `index.html` in a browser.
3. Edit the example and select **Compile**.
4. Download `index.html`, `style.css`, and `script.js`.
5. Put those three generated files in your website repository and deploy them to any static host.

For GitHub Pages, the generated `index.html` should be at the published root.

## Syntax

```text
title=My Website
description=A description

nav#topbar
  strong=My Website
  a[href="/about"]=About

hero
  h1=Welcome
  p=Built with HTML Shorthand.

css:
  .special {
    color: royalblue;
  }

js:
  document.querySelector(".special").textContent = "Updated!";
```

### Elements

- `h1=Hello` creates an `h1` containing text.
- `div.container` adds a class.
- `h1#heading` adds an ID.
- `a[href="/about"]=About` adds an attribute.
- Indentation nests elements.
- `css:` starts a native CSS block.
- `js:` starts a native JavaScript block.

Text after `=` is treated as text content and escaped when generating HTML. Use the `js:` block for JavaScript, and the `css:` block for CSS.

## Built-in components

- `nav` creates a semantic navigation banner with default horizontal styling.
- `card` creates a bordered content panel.
- `hero` creates a spacious hero section.
- `sidebar` creates a sidebar.
- `footer` creates a footer.

Components can use IDs, classes, attributes, and nested elements just like regular tags. For example: `nav#topbar.dark`.

## Project structure

```text
html-shorthand/
├── index.html
├── style.css
├── script.js
├── src/
│   ├── components.js
│   ├── parser.js
│   └── compiler.js
└── examples/
    └── hello-world.hz
```

## Notes and limitations

This is an early compiler, not a complete HTML validator. It validates known tags and shorthand syntax, but it does not yet validate every tag/attribute combination or all HTML nesting rules. JavaScript in a `js:` block is native code and runs as part of the generated website. Only compile source you trust, and review generated code before publishing.

Built-in component styles are included in the generated `style.css`, so the output does not depend on the compiler after generation.
