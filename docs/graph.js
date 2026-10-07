(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("nerdamer"));
  } else {
    root.MathGraph = factory(root.nerdamer);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (nerdamer) {
  "use strict";

  const COLORS = ["#17634e", "#c46b36", "#4169a1", "#9a4f78", "#73762c", "#5d69aa"];

  function splitExpressions(text) {
    return String(text || "").split(/[\n;]+/).map(line => line.trim())
      .filter(Boolean).map(line => line.replace(/^(?:y|[A-Za-z_]\w*\s*\(\s*x\s*\))\s*=\s*/i, "").trim())
      .filter(Boolean).slice(0, COLORS.length);
  }

  function compileFormula(expression) {
    if (typeof nerdamer !== "function") throw new Error("The graphing math engine did not load.");
    const clean = String(expression).trim();
    if (!clean || !/^[A-Za-z0-9_\s()+\-*/^.,]*$/.test(clean)) {
      throw new Error("Use a function of x with standard math notation, such as x^2 or sin(x).");
    }
    return nerdamer(clean).buildFunction(["x"]);
  }

  function renameVariable(expression, variable) {
    if (!variable || variable === "x") return expression;
    return String(expression).replace(new RegExp(`(^|[^A-Za-z_])(${variable})(?![A-Za-z0-9_])`, "g"), "$1x");
  }

  function getQuestionLines(question, solver) {
    if (!solver || typeof solver.parseRequest !== "function") return [];
    let parsed;
    try { parsed = solver.parseRequest(question); } catch { return []; }
    const variable = parsed.variable || "x";
    const rename = expression => renameVariable(expression, variable);

    if (parsed.operation === "system") {
      const lines = [];
      for (const equation of parsed.equations) {
        try {
          const solutions = nerdamer.solve(equation, "y").text().replace(/^\{([\s\S]*)\}$/, "$1");
          const pieces = solutions.split(",").map(item => item.trim()).filter(Boolean);
          for (const piece of pieces) lines.push(nerdamer(piece).expand().text());
        } catch { /* A system that cannot be written as y=f(x) can still be graphed manually. */ }
      }
      return lines.slice(0, COLORS.length);
    }

    if (parsed.operation === "solve") {
      const sides = parsed.expression.split("=");
      if (sides.length === 2 && sides[0].trim() === variable) return [rename(sides[1])];
      return [rename(sides[0].trim()), rename((sides[1] || "0").trim())];
    }

    const expression = parsed.expression;
    if (!expression) return [];
    const first = rename(expression);
    if (parsed.operation === "differentiate") return [first, rename(solver.solveRequest(question).answer)];
    if (parsed.operation === "integrate") {
      const antiderivative = solver.solveRequest(question).answer.replace(/\s*\+\s*C$/, "");
      return [first, rename(antiderivative)];
    }
    return [first];
  }

  function niceStep(span, targetCount) {
    const raw = span / Math.max(1, targetCount);
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const fraction = raw / power;
    const unit = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
    return unit * power;
  }

  function draw(canvas, formulas, view) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return [];
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    const xMin = view.xMin, xMax = view.xMax, yMin = view.yMin, yMax = view.yMax;
    const xRange = xMax - xMin, yRange = yMax - yMin;
    const px = x => (x - xMin) / xRange * width;
    const py = y => height - (y - yMin) / yRange * height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fffefa";
    ctx.fillRect(0, 0, width, height);
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e8ebe5";
    ctx.fillStyle = "#68766f";

    const xStep = niceStep(xRange, width / 76);
    const yStep = niceStep(yRange, height / 48);
    ctx.beginPath();
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      const screenX = px(x);
      ctx.moveTo(screenX, 0); ctx.lineTo(screenX, height);
    }
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      const screenY = py(y);
      ctx.moveTo(0, screenY); ctx.lineTo(width, screenY);
    }
    ctx.stroke();

    ctx.strokeStyle = "#52665b";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (xMin <= 0 && xMax >= 0) { ctx.moveTo(px(0), 0); ctx.lineTo(px(0), height); }
    if (yMin <= 0 && yMax >= 0) { ctx.moveTo(0, py(0)); ctx.lineTo(width, py(0)); }
    ctx.stroke();

    ctx.fillStyle = "#68766f";
    ctx.textAlign = "center";
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      if (Math.abs(x) < xStep / 100) continue;
      const labelY = yMin <= 0 && yMax >= 0 ? Math.min(height - 4, Math.max(13, py(0) + 15)) : height - 5;
      ctx.fillText(Number(x.toPrecision(4)).toString(), px(x), labelY);
    }
    ctx.textAlign = "left";
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      if (Math.abs(y) < yStep / 100) continue;
      const labelX = xMin <= 0 && xMax >= 0 ? Math.min(width - 28, Math.max(4, px(0) + 5)) : 4;
      ctx.fillText(Number(y.toPrecision(4)).toString(), labelX, py(y) - 3);
    }

    const errors = [];
    formulas.forEach((formula, index) => {
      let fn;
      try { fn = compileFormula(formula); }
      catch (error) { errors.push(`${formula}: ${error.message}`); return; }
      ctx.strokeStyle = COLORS[index % COLORS.length];
      ctx.lineWidth = 2.3;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let drawing = false;
      let previousY = null;
      const samples = Math.max(240, Math.ceil(width * 1.4));
      for (let i = 0; i <= samples; i++) {
        const x = xMin + xRange * i / samples;
        let y;
        try { y = Number(fn(x)); } catch { y = NaN; }
        if (!Number.isFinite(y) || Math.abs(y) > Math.max(Math.abs(yMin), Math.abs(yMax)) * 20) {
          drawing = false; previousY = null; continue;
        }
        if (previousY !== null && Math.abs(y - previousY) > yRange * 1.5) drawing = false;
        if (!drawing) { ctx.moveTo(px(x), py(y)); drawing = true; }
        else ctx.lineTo(px(x), py(y));
        previousY = y;
      }
      ctx.stroke();
    });
    return errors;
  }

  function attach() {
    const $ = id => document.getElementById(id);
    const canvas = $("graphCanvas");
    if (!canvas || !window.MathSolver) return;
    const input = $("graphInput");
    const status = $("graphStatus");
    const legend = $("graphLegend");
    const initial = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
    let view = { ...initial };

    function render() {
      const formulas = splitExpressions(input.value);
      const errors = draw(canvas, formulas, view);
      legend.replaceChildren(...formulas.map((formula, index) => {
        const item = document.createElement("span");
        item.className = "graph-legend-item";
        const swatch = document.createElement("i");
        swatch.style.backgroundColor = COLORS[index % COLORS.length];
        const label = document.createElement("span");
        label.textContent = formula;
        item.append(swatch, label);
        return item;
      }));
      status.textContent = errors.length ? errors.join(" ") : formulas.length
        ? `Plotting ${formulas.length} ${formulas.length === 1 ? "function" : "functions"} of x.`
        : "Add a function of x, one per line, then select Plot.";
    }

    $("drawGraphButton").addEventListener("click", render);
    $("graphFromQuestionButton").addEventListener("click", () => {
      const formulas = getQuestionLines($("problemInput").value, window.MathSolver);
      if (!formulas.length) {
        status.textContent = "I couldn't turn that question into a function of x. You can still enter a related function above.";
        return;
      }
      input.value = formulas.join("\n");
      view = { ...initial };
      render();
    });
    $("graphClearButton").addEventListener("click", () => { input.value = ""; render(); });
    $("graphZoomIn").addEventListener("click", () => {
      const cx = (view.xMin + view.xMax) / 2, cy = (view.yMin + view.yMax) / 2;
      const hx = (view.xMax - view.xMin) * .35, hy = (view.yMax - view.yMin) * .35;
      view = { xMin: cx - hx, xMax: cx + hx, yMin: cy - hy, yMax: cy + hy }; render();
    });
    $("graphZoomOut").addEventListener("click", () => {
      const cx = (view.xMin + view.xMax) / 2, cy = (view.yMin + view.yMax) / 2;
      const hx = (view.xMax - view.xMin) * .72, hy = (view.yMax - view.yMin) * .72;
      view = { xMin: cx - hx, xMax: cx + hx, yMin: cy - hy, yMax: cy + hy }; render();
    });
    $("graphReset").addEventListener("click", () => { view = { ...initial }; render(); });
    $("graphInput").addEventListener("keydown", event => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") render();
    });
    $("graphPanel").addEventListener("toggle", () => { if ($("graphPanel").open) requestAnimationFrame(render); });
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(render).observe(canvas);
    else window.addEventListener("resize", render);
  }

  return { COLORS, splitExpressions, compileFormula, getQuestionLines, draw, attach };
});
