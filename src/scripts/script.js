
(function () {
    "use strict";

    const EXAMPLE = `title=My Website
description=A website built with HTML Shorthand
lang=en

nav#topbar
  strong=My Website
  a[href="#home"]=Home
  a[href="#about"]=About
  a[href="#contact"]=Contact

hero#home
  h1#heading=Welcome!
  p=This website was built with HTML Shorthand.
  button#hello.primary=Click me

section#about
  h2=About
  card
    p=The card component adds a simple panel with padding and a border.

footer#contact
  p=Made with HTML Shorthand.

css:
  body {
    margin: 0;
    font-family: system-ui, sans-serif;
    color: #20242a;
  }

  main, section:not(.hs-hero) {
    padding: 1.5rem;
  }

  .primary {
    background: royalblue;
    color: white;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .primary:hover {
    background: #244fbd;
  }

js:
  document.getElementById("hello").addEventListener("click", () => {
    document.getElementById("heading").textContent = "Hello from JavaScript!";
  });`;

    const source = document.querySelector("#source");
    const generated = document.querySelector("#generated");
    const status = document.querySelector("#status");
    const preview = document.querySelector("#preview");
    const compileButton = document.querySelector("#compile");
    const downloadAll = document.querySelector("#downloadAll");
    const downloadCurrent = document.querySelector("#downloadCurrent");
    const resetExample = document.querySelector("#resetExample");
    const tabs = [...document.querySelectorAll(".file-tab")];

    const filenames = {
        html: "index.html",
        css: "style.css",
        js: "script.js"
    };

    let files = null;
    let activeFile = "html";

    function setStatus(message, type = "") {
        status.textContent = message;
        status.className = "status" + (type ? " " + type : "");
    }

    function renderCurrentFile() {
        generated.textContent = files
            ? files[filenames[activeFile]]
            : "Compile your source to see the output.";

        downloadCurrent.disabled = !files;

        tabs.forEach(tab => {
            const active = tab.dataset.file === activeFile;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function buildPreviewDocument(output) {
        let html = output["index.html"];
        const css = output["style.css"];
        const js = output["script.js"];

        html = html.replace(
            /<link\b[^>]*\bhref=["']style\.css["'][^>]*\/?>/i,
            () => "<style>\n" +
                css.replace(/<\/style/gi, "<\\/style") +
                "\n</style>"
        );

        html = html.replace(
            /<script\b[^>]*\bsrc=["']script\.js["'][^>]*>\s*<\/script>/gi,
            ""
        );

        const inlineScript = js
            ? "<script>\n" +
                js.replace(/<\/script/gi, "<\\/script") +
                "\n<\/script>"
            : "";

        if (/<\/body\s*>/i.test(html)) {
            html = html.replace(/<\/body\s*>/i, inlineScript + "\n</body>");
        } else {
            html += inlineScript;
        }

        return html;
    }

    function compileSource() {
        try {
            if (!window.HSParser ||
                typeof window.HSParser.parse !== "function") {
                throw new Error(
                    "The parser did not load. Check src/parser.js."
                );
            }

            if (!window.HSComponents ||
                typeof window.HSComponents.get !== "function") {
                throw new Error(
                    "The components did not load. Check src/components.js."
                );
            }

            if (!window.HSCompiler ||
                typeof window.HSCompiler.compile !== "function") {
                throw new Error(
                    "The compiler did not load. Check src/compiler.js."
                );
            }

            const output = window.HSCompiler.compile(source.value);

            if (!output ||
                typeof output["index.html"] !== "string" ||
                typeof output["style.css"] !== "string" ||
                typeof output["script.js"] !== "string") {
                throw new Error(
                    "The compiler did not return all three output files."
                );
            }

            files = output;
            renderCurrentFile();

            preview.srcdoc = buildPreviewDocument(output);

            downloadAll.disabled = false;

            setStatus(
                "Compiled successfully. HTML, CSS, and JavaScript are ready.",
                "success"
            );
        } catch (error) {
            files = null;
            renderCurrentFile();

            preview.srcdoc =
                "<!DOCTYPE html><html><body style=" +
                "'font:16px system-ui;padding:24px;color:#a00'>" +
                "<h2>Compilation failed</h2><pre>" +
                escapeHTML(error.message || String(error)) +
                "</pre></body></html>";

            downloadAll.disabled = true;
            setStatus(
                "Compilation failed: " +
                (error.message || String(error)),
                "error"
            );

            console.error("HTML Shorthand compilation error:", error);
        }
    }

    function downloadFile(filename, content) {
        const blob = new Blob(
            [content],
            { type: "text/plain;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = filename;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    compileButton.addEventListener("click", compileSource);

    resetExample.addEventListener("click", () => {
        source.value = EXAMPLE;
        compileSource();
    });

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            activeFile = tab.dataset.file;
            renderCurrentFile();
        });
    });

    downloadCurrent.addEventListener("click", () => {
        if (!files) return;

        downloadFile(
            filenames[activeFile],
            files[filenames[activeFile]]
        );
    });

    downloadAll.addEventListener("click", () => {
        if (!files) return;

        Object.entries(files).forEach(([filename, content], index) => {
            setTimeout(() => {
                downloadFile(filename, content);
            }, index * 250);
        });
    });

    source.value = EXAMPLE;
    renderCurrentFile();
    compileSource();
})();
