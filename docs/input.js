(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MathInput = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function htmlToMathText(html) {
    let source = String(html || "")
      .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, "^($1)")
      .replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, "_$1")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|tr|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]*>/g, "");
    const entities = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", minus: "−", times: "×", divide: "÷" };
    source = source.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
      if (name[0] === "#") {
        const point = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        try { return String.fromCodePoint(point); } catch { return whole; }
      }
      return entities[name.toLowerCase()] || whole;
    });
    return source.replace(/[\t\f\v ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function textFileContent(file) {
    return file.text().then(text => /\.html?$/i.test(file.name || "") || /html/i.test(file.type || "")
      ? htmlToMathText(text) : String(text).replace(/\r\n?/g, "\n").trim());
  }

  function clipboardImage(clipboardData) {
    if (!clipboardData) return null;
    for (const item of Array.from(clipboardData.items || [])) {
      if (item.type && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) return file;
      }
    }
    return null;
  }

  function attach() {
    if (typeof document === "undefined") return;
    const $ = id => document.getElementById(id);
    const image = $("problemImage");
    if (!image) return;
    let previewUrl = null;
    let selectedImage = null;
    let worker = null;
    let workerLanguages = "";

    function setStatus(message) { $("ocrStatus").textContent = message; }
    function addText(text) {
      if (!text) { setStatus("I couldn't find readable text. Try a clearer image or type the math into the box."); return; }
      $("problemInput").value = text;
      $("problemInput").dispatchEvent(new Event("input", { bubbles: true }));
      $("problemInput").focus();
      setStatus("Text extracted. Check superscripts, minus signs, and symbols, then edit it before solving.");
    }

    function showImage(file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      selectedImage = file;
      previewUrl = URL.createObjectURL(file);
      image.src = previewUrl;
      image.hidden = false;
      $("removeImageButton").hidden = false;
      $("readImageButton").disabled = false;
      setStatus(`Image ready: ${file.name || "pasted image"}. Select Read image to extract printed text.`);
    }

    async function importFile(file) {
      if (!file) return;
      if (file.type && file.type.startsWith("image/")) {
        showImage(file);
        await recognizeImage();
        return;
      }
      if (/\.(txt|md|html?)$/i.test(file.name || "") || /^(text\/plain|text\/markdown|text\/html)$/i.test(file.type || "")) {
        try { addText(await textFileContent(file)); }
        catch { setStatus("I couldn't read that text file. Try copying and pasting its contents instead."); }
        return;
      }
      setStatus("Use a screenshot/image, a TXT/MD/HTML file, or copy the problem text here. For other documents, copy and paste the text.");
    }

    async function recognizeImage() {
      if (!selectedImage) return;
      if (!globalThis.Tesseract || typeof globalThis.Tesseract.createWorker !== "function") {
        setStatus("Image reading needs an internet connection to load the free OCR engine and selected language model. Your image is processed in this browser.");
        return;
      }
      const languageInput = $("ocrLanguages").value.trim() || "eng";
      const languages = languageInput.split(/[+,\s]+/).filter(Boolean).join("+");
      try {
        if (worker && workerLanguages !== languages) {
          await worker.terminate(); worker = null;
        }
        if (!worker) {
          workerLanguages = languages;
          worker = await globalThis.Tesseract.createWorker(languages, 1, {
            workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js",
            corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6.1.2",
            langPath: "https://tessdata.projectnaptha.com/4.0.0",
            logger: message => {
              if (message && message.status) {
                const percent = typeof message.progress === "number" ? ` ${Math.round(message.progress * 100)}%` : "";
                setStatus(`Reading image: ${message.status}${percent}`);
              }
            }
          });
        }
        const result = await worker.recognize(selectedImage);
        addText(result && result.data ? result.data.text : "");
      } catch (error) {
        setStatus("I couldn't read that image. Check the language code and internet connection, or type/copy the problem text instead.");
      }
    }

    function insertAtCursor(text) {
      const field = $("problemInput");
      const start = Number.isInteger(field.selectionStart) ? field.selectionStart : field.value.length;
      const end = Number.isInteger(field.selectionEnd) ? field.selectionEnd : start;
      field.setRangeText(text, start, end, "end");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }

    $("problemFile").addEventListener("change", event => {
      importFile(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
    $("readImageButton").addEventListener("click", recognizeImage);
    $("removeImageButton").addEventListener("click", () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null; selectedImage = null; image.removeAttribute("src"); image.hidden = true;
      $("removeImageButton").hidden = true; $("readImageButton").disabled = true;
      setStatus("Image removed.");
    });

    const dropZone = $("imageDropZone");
    dropZone.addEventListener("dragover", event => { event.preventDefault(); dropZone.classList.add("dragging"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
    dropZone.addEventListener("drop", event => {
      event.preventDefault(); dropZone.classList.remove("dragging");
      importFile(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]);
    });
    dropZone.addEventListener("keydown", event => {
      if (event.target === dropZone && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault(); $("problemFile").click();
      }
    });
    document.addEventListener("paste", event => {
      const pastedImage = clipboardImage(event.clipboardData);
      if (pastedImage) { event.preventDefault(); importFile(pastedImage); return; }
      const html = event.clipboardData && event.clipboardData.getData("text/html");
      if (html && /<(?:sup|sub|p|div|br)\b/i.test(html)) {
        const text = htmlToMathText(html);
        if (text) { event.preventDefault(); insertAtCursor(text); }
      }
    });
    $("ocrLanguages").addEventListener("change", () => {
      if (worker && workerLanguages !== $("ocrLanguages").value.trim()) {
        worker.terminate(); worker = null; workerLanguages = "";
      }
    });
  }

  return { htmlToMathText, textFileContent, clipboardImage, attach };
});
