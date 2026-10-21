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

    function setStatus(message, type) {
        status.textContent = message;
        status.className = "status" + (type ? ` ${type}` : "");
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

    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function compileSource() {
        try {
            files = window.HSCompiler.compile(source.value);
            renderCurrentFile();

            const previewDocument = [
                files["index.html"].replace(
                    '<link rel="stylesheet" href="style.css">',
                    "<style>" + files["style.css"].replace(/<\/style/gi, "<\\/style") + "</style>"
                ).replace(
                    '<script src="script.js" defer></script>',
                    ""
                ).replace(
                    "</body>",
                    "<script>" + files["script.js"].replace(/<\/script/gi, "<\\/script") + "</script></body>"
                )
            ].join("");

            preview.srcdoc = previewDocument;
            downloadAll.disabled = false;
            setStatus("Compiled successfully. Your output is ready to download.", "success");
        } catch (error) {
            files = null;
            renderCurrentFile();
            preview.srcdoc = "<!doctype html><body style='font:16px system-ui;padding:24px;color:#a00'><h2>Compilation failed</h2><pre style='white-space:pre-wrap'>" +
                String(error.message).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") +
                "</pre></body>";
            downloadAll.disabled = true;
            setStatus(error.message, "error");
        }
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
        downloadFile(filenames[activeFile], files[filenames[activeFile]]);
    });

    downloadAll.addEventListener("click", () => {
        if (!files) return;
        Object.entries(files).forEach(([filename, content], index) => {
            setTimeout(() => downloadFile(filename, content), index * 250);
        });
    });

    source.value = EXAMPLE;
    compileSource();
})();
