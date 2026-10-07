(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("nerdamer"));
  } else {
    root.MathSolver = factory(root.nerdamer);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (nerdamer) {
  "use strict";

  if (typeof nerdamer !== "function") throw new Error("The symbolic math engine did not load.");

  const TYPE_NAMES = {
    solve: "Equation solving",
    system: "Systems of equations",
    simplify: "Simplifying an expression",
    factor: "Factoring",
    expand: "Expanding",
    evaluate: "Evaluating at a value",
    differentiate: "Differentiation",
    integrate: "Integration",
    definiteIntegral: "Definite integration",
    limit: "Limits"
  };
  const FUNCTION_NAMES = new Set([
    "sin", "cos", "tan", "sec", "csc", "cot", "asin", "acos", "atan", "arcsin", "arccos", "arctan",
    "sinh", "cosh", "tanh", "asinh", "acosh", "atanh", "exp", "ln", "log", "log10", "sqrt", "cbrt",
    "abs", "floor", "ceil", "round", "sign", "min", "max", "factorial", "gamma", "erf", "sinc", "limit",
    "diff", "integrate", "defint", "pi", "infinity", "e", "i"
  ]);
  const SUPERSCRIPT_CHARS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁱⁿ";
  const SUBSCRIPT_CHARS = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜ";
  const SET_SYMBOL_CHARS = "ℕℤℚℝℂ";
  const SUPER_TO_ASCII = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")", "ⁱ": "i", "ⁿ": "n" };
  const SUB_TO_ASCII = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")", "ₐ": "a", "ₑ": "e", "ₒ": "o", "ₓ": "x", "ₕ": "h", "ₖ": "k", "ₗ": "l", "ₘ": "m", "ₙ": "n", "ₚ": "p", "ₛ": "s", "ₜ": "t" };
  const GREEK_NAMES = {
    "Α": "alpha", "α": "alpha", "Β": "beta", "β": "beta", "Γ": "gamma", "γ": "gamma", "Δ": "delta", "δ": "delta",
    "Ε": "epsilon", "ε": "epsilon", "ϵ": "epsilon", "Ζ": "zeta", "ζ": "zeta", "Η": "eta", "η": "eta", "Θ": "theta", "θ": "theta", "ϑ": "theta",
    "Ι": "iota", "ι": "iota", "Κ": "kappa", "κ": "kappa", "Λ": "lambda", "λ": "lambda", "Μ": "mu", "μ": "mu", "Ν": "nu", "ν": "nu",
    "Ξ": "xi", "ξ": "xi", "Ο": "omicron", "ο": "omicron", "Π": "pi", "π": "pi", "Ρ": "rho", "ρ": "rho", "ϱ": "rho",
    "Σ": "sigma", "σ": "sigma", "ς": "sigma", "Τ": "tau", "τ": "tau", "Υ": "upsilon", "υ": "upsilon", "Φ": "phi", "φ": "phi", "ϕ": "phi",
    "Χ": "chi", "χ": "chi", "Ψ": "psi", "ψ": "psi", "Ω": "omega", "ω": "omega"
  };
  const LATEX_WORDS = {
    cdot: "·", cdotp: "·", times: "×", ast: "*", div: "÷", frac: "\\frac", dfrac: "\\dfrac", tfrac: "\\tfrac",
    le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", ne: "≠", approx: "≈", equiv: "≡", to: "->", rightarrow: "->", leftarrow: "<-",
    pm: "±", mp: "∓", infty: "∞", partial: "∂", int: "∫", sum: "∑", prod: "∏", pi: "π", infinity: "∞", lim: "lim",
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ϵ", theta: "θ", vartheta: "ϑ", lambda: "λ", mu: "μ", sigma: "σ", phi: "φ", varphi: "ϕ", omega: "ω", rho: "ρ", tau: "τ", xi: "ξ", psi: "ψ", Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Sigma: "Σ", Phi: "Φ", Omega: "Ω",
    vert: "|", lvert: "|", rvert: "|", degree: "°", prime: "′",
    sin: "sin", cos: "cos", tan: "tan", sec: "sec", csc: "csc", cot: "cot", asin: "asin", acos: "acos", atan: "atan", arcsin: "arcsin", arccos: "arccos", arctan: "arctan",
    sinh: "sinh", cosh: "cosh", tanh: "tanh", ln: "ln", log: "log", exp: "exp", max: "max", min: "min", factorial: "factorial"
  };

  function protectScriptGlyphs(text) {
    const protectedChars = [];
    const normalized = String(text).replace(new RegExp(`[${SUPERSCRIPT_CHARS}${SUBSCRIPT_CHARS}${SET_SYMBOL_CHARS}]`, "gu"), char => {
      const marker = String.fromCharCode(0xE000 + protectedChars.length);
      protectedChars.push(char);
      return marker;
    }).normalize("NFKC");
    return normalized.replace(/[\uE000-\uF8FF]/g, char => protectedChars[char.charCodeAt(0) - 0xE000] || char);
  }

  function readLatexGroup(source, start, open = "{", close = "}") {
    while (/\s/.test(source[start] || "")) start++;
    if (source[start] !== open) return null;
    let depth = 0;
    for (let index = start; index < source.length; index++) {
      if (source[index] === open) depth++;
      else if (source[index] === close && --depth === 0) return { value: source.slice(start + 1, index), end: index + 1 };
    }
    return null;
  }

  function normalizeLatexScripts(source) {
    let result = "";
    for (let index = 0; index < source.length;) {
      const marker = source[index];
      if ((marker === "^" || marker === "_") && source[index + 1] === "{") {
        const group = readLatexGroup(source, index + 1);
        if (group) {
          const value = normalizeLatexScripts(group.value);
          result += marker === "^" ? `^(${value})` : `_${value}`;
          index = group.end;
          continue;
        }
      }
      result += source[index++];
    }
    return result;
  }

  function normalizeLatexSymbols(source) {
    let result = "";
    for (let index = 0; index < source.length;) {
      if (source[index] !== "\\") { result += source[index++]; continue; }
      const commandMatch = source.slice(index + 1).match(/^([A-Za-z]+|.)/);
      if (!commandMatch) { result += "\\"; index++; continue; }
      const command = commandMatch[1];
      const commandEnd = index + command.length + 1;
      if (["frac", "dfrac", "tfrac"].includes(command)) {
        const numerator = readLatexGroup(source, commandEnd);
        const denominator = numerator && readLatexGroup(source, numerator.end);
        if (numerator && denominator) {
          result += `(${normalizeLatexSymbols(numerator.value)})/(${normalizeLatexSymbols(denominator.value)})`;
          index = denominator.end; continue;
        }
      }
      if (command === "sqrt") {
        let cursor = commandEnd;
        while (/\s/.test(source[cursor] || "")) cursor++;
        let degree = null;
        if (source[cursor] === "[") {
          const close = source.indexOf("]", cursor + 1);
          if (close >= 0) { degree = source.slice(cursor + 1, close); cursor = close + 1; }
        }
        const radicand = readLatexGroup(source, cursor);
        if (radicand) {
          const value = normalizeLatexSymbols(radicand.value);
          result += degree ? `((${value})^(1/(${normalizeLatexSymbols(degree)})))` : `sqrt(${value})`;
          index = radicand.end; continue;
        }
      }
      if (command === "mathbb") {
        const group = readLatexGroup(source, commandEnd);
        if (group) {
          const setSymbol = { N: "ℕ", Z: "ℤ", Q: "ℚ", R: "ℝ", C: "ℂ" }[group.value.trim()];
          result += setSymbol || normalizeLatexSymbols(group.value);
          index = group.end; continue;
        }
      }
      if (["mathrm", "mathbf", "mathit", "mathsf", "mathtt", "mathcal", "mathfrak", "boldsymbol", "operatorname", "vec"].includes(command)) {
        const group = readLatexGroup(source, commandEnd);
        if (group) { result += normalizeLatexSymbols(group.value); index = group.end; continue; }
      }
      if (["left", "right", "big", "Big", "bigl", "bigr", "Bigl", "Bigr", "displaystyle", "textstyle"].includes(command)) {
        index = commandEnd; continue;
      }
      if (Object.prototype.hasOwnProperty.call(LATEX_WORDS, command)) {
        result += LATEX_WORDS[command]; index = commandEnd; continue;
      }
      if (command === "%") { result += "%"; index = commandEnd; continue; }
      result += `\\${command}`;
      index = commandEnd;
    }
    return result;
  }

  const COMMAND_PREFIXES = [
    [/^(?:resuelve|resolver)\s+/i, "solve "], [/^(?:deriva|derivar|derivada de)\s+/i, "differentiate "],
    [/^(?:integra|integrar|integral de)\s+/i, "integrate "], [/^(?:factoriza|factorizar)\s+/i, "factor "],
    [/^(?:simplifica|simplificar)\s+/i, "simplify "], [/^(?:expande|expandir)\s+/i, "expand "],
    [/^(?:eval[uú]a|evaluar)\s+/i, "evaluate "], [/^(?:l[ií]mite)\s+/i, "limit "],
    [/^(?:r[eé]sous|r[eé]soudre)\s+/i, "solve "], [/^(?:d[eé]river|d[eé]riv[eé]e de)\s+/i, "differentiate "],
    [/^(?:int[eé]grer|int[eé]grale de)\s+/i, "integrate "], [/^(?:factoriser)\s+/i, "factor "],
    [/^(?:simplifier)\s+/i, "simplify "], [/^(?:d[eé]velopper)\s+/i, "expand "],
    [/^(?:[eé]valuer)\s+/i, "evaluate "], [/^(?:grenzwert)\s+/i, "limit "],
    [/^(?:l[oö]se|l[oö]sen)\s+/i, "solve "], [/^(?:ableiten)\s+/i, "differentiate "],
    [/^(?:integriere|integrieren)\s+/i, "integrate "], [/^(?:faktorisiere|faktorisieren)\s+/i, "factor "],
    [/^(?:vereinfache|vereinfachen)\s+/i, "simplify "], [/^(?:entwickle|entwickeln)\s+/i, "expand "],
    [/^(?:berechne|berechnen)\s+/i, "evaluate "],
    [/^解(?:出)?方程\s*/, "solve "], [/^求导\s*/, "differentiate "], [/^微分\s*/, "differentiate "],
    [/^求积分\s*/, "integrate "], [/^积分\s*/, "integrate "], [/^因式分解\s*/, "factor "],
    [/^化简\s*/, "simplify "], [/^展开\s*/, "expand "], [/^计算\s*/, "evaluate "],
    [/^求极限\s*/, "limit "], [/^方程组[：:]?\s*/, "system: "]
  ];

  function normalizeCommandLanguage(input) {
    let text = normalizeLatexSymbols(protectScriptGlyphs(input)).trim();
    let match = text.match(/^∂\s*\/\s*∂\s*([A-Za-z_]\w*)\s*(.+)$/);
    if (match) return `differentiate ${match[2]} with respect to ${match[1]}`;
    if (/^∫/.test(text)) text = text.replace(/^∫\s*/, "integrate ");
    match = text.match(/^(?:lim|limit)\s*_\s*\{\s*([A-Za-z_]\w*)\s*(?:->|→)\s*([^}\s]+)\s*\}\s*(.+)$/i);
    if (match) return `limit ${match[3]} as ${match[1]} -> ${match[2]}`;
    match = text.match(/^integrate\s*_\s*\{?([^\s{}]+)\}?\s*\^\s*\{?([^\s{}]+)\}?\s+(.+?)\s+d([A-Za-z_]\w*)$/i);
    if (match) return `integrate ${match[3]} from ${match[1]} to ${match[2]} d${match[4]}`;
    const prime = text.match(/^(.+?)\s*['′]\s*$/u);
    if (prime) return `differentiate ${prime[1]}`;
    for (const [pattern, replacement] of COMMAND_PREFIXES) {
      if (pattern.test(text)) return text.replace(pattern, replacement);
    }
    return text;
  }

  function cleanMath(text) {
    return normalizeLatexScripts(normalizeLatexSymbols(protectScriptGlyphs(text)))
      .replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, "")
      .replace(/[−–—﹣]/g, "-").replace(/[×·⋅∙]/g, "*").replace(/[÷⁄∕]/g, "/")
      .replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/≠/g, "!=")
      .replace(/→/g, "->").replace(/[π]/g, "pi").replace(/[∞]/g, "infinity")
      .replace(/ℯ/g, "e").replace(/ⅈ/g, "i")
      .replace(/\bln(?=\s*\()/gi, "log")
      .replace(/[Α-Ωα-ωϵϑϱϕ]/g, char => GREEK_NAMES[char] || char)
      .replace(/([A-Za-z_]\w*|\d+(?:\.\d+)?|\))([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁱⁿ]+)/g, (_all, base, exponent) => {
        const value = [...exponent].map(char => SUPER_TO_ASCII[char] || char).join("");
        return `${base}^${value}`;
      })
      .replace(/([A-Za-z_]\w*)([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₕₖₗₘₙₚₛₜ]+)/g, (_all, base, subscript) => `${base}_${[...subscript].map(char => SUB_TO_ASCII[char] || char).join("")}`)
      .replace(/(\d+(?:\.\d+)?)\s*°/g, "($1*pi/180)")
      .replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)")
      .replace(/\|([^|]+)\|/g, "abs($1)")
      .replace(/∛\s*\(([^()]*)\)/g, "(($1)^(1/3))")
      .replace(/∛\s*([+-]?[A-Za-z0-9.]+)/g, "(($1)^(1/3))")
      .replace(/∜\s*\(([^()]*)\)/g, "(($1)^(1/4))")
      .replace(/∜\s*([+-]?[A-Za-z0-9.]+)/g, "(($1)^(1/4))")
      .replace(/√\s*\(([^()]*)\)/g, "sqrt($1)")
      .replace(/√\s*([+-]?[A-Za-z0-9.]+)/g, "sqrt($1)")
      .replace(/\[\s*([^\[\],]+?)\s*\]/g, "($1)")
      .replace(/\s+/g, " ").trim();
  }

  function validateExpression(text) {
    if (!text) throw new Error("Type an expression or equation first.");
    if (text.length > 300) throw new Error("Keep each problem under 300 characters so I can parse it reliably.");
    if (/[∑∏]/u.test(text)) throw new Error("I recognize summation/product notation, but not the bounds yet. Write out a short finite sum or product term by term.");
    if (/[±∓]/u.test(text)) throw new Error("I recognize ±/∓ as two possible signs, but I don't split one problem into two cases yet. Try the + case and − case separately.");
    if (/[≈≡]/u.test(text)) throw new Error("I recognize that comparison symbol, but this solver needs exact equations. Try = or enter a decimal approximation.");
    if (/[∠]/u.test(text)) throw new Error("I recognize ∠ as an angle marker, but geometry proofs need angle relationships. Type the given angle equations or describe the diagram in words.");
    if (/[∇∝]/u.test(text)) throw new Error("I recognize that calculus/vector symbol, but this operation isn't supported yet. Rewrite the question using an explicit equation or named function.");
    if (/[ℕℤℚℝℂ∈∉⊂⊆∪∩]/u.test(text)) throw new Error("I recognize this number-set or set-relation notation, but set statements aren't solved yet. Rewrite it as an equation or describe the set condition in words.");
    const unknownCommand = text.match(/\\([A-Za-z]+)/);
    if (unknownCommand) throw new Error(`I recognize the LaTeX command \\${unknownCommand[1]}, but don't parse that command yet. Try an equivalent standard symbol or named function.`);
    if (!/^[A-Za-z0-9_\s()[\]+\-*/^.,=!<>%|]*$/.test(text)) {
      const symbol = [...text].find(char => !/[A-Za-z0-9_\s()[\]+\-*/^.,=!<>%|]/.test(char));
      const hint = symbol === "⊗" || symbol === "⨯" ? " If you mean ordinary multiplication, use *." : " Try a standard operator, a named function, Greek letter, superscript/subscript, or LaTeX such as \\frac{a}{b}.";
      throw new Error(`I don't recognize the symbol “${symbol || "?"}” yet.${hint}`);
    }
    if (/!=/.test(text)) throw new Error("I recognize ≠ as ‘not equal,’ but not-equal conditions are not solved yet.");
    if (/[<>]/.test(text)) throw new Error("I recognize <, >, ≤, and ≥, but inequality solving is not supported yet.");
  }

  function getVariables(text) {
    try {
      const variables = String(text).split("=").flatMap(part => nerdamer(cleanMath(part)).variables());
      return [...new Set(variables)].filter(name => !FUNCTION_NAMES.has(name.toLowerCase()));
    } catch { return []; }
  }

  function inferVariable(text, explicit) {
    if (explicit) return explicit;
    return getVariables(text)[0] || "x";
  }

  function parseRequest(input) {
    const raw = cleanMath(normalizeCommandLanguage(input)).replace(/[?.]+$/, "").trim();
    if (!raw) throw new Error("Enter a math question to get started.");
    if (raw.length > 300) throw new Error("Keep each problem under 300 characters so I can parse it reliably.");

    let match;
    let explicitVariable = null;

    match = raw.match(/^d\s*\/\s*d([A-Za-z_]\w*)\s+(?:of\s+)?(.+)$/i);
    if (match) return { operation: "differentiate", expression: match[2], variable: match[1] };

    match = raw.match(/^(?:partial\s+derivative|differentiate|derive|derivative(?:\s+of)?|find\s+the\s+derivative\s+of)\s+(.+)$/i);
    if (match) {
      let expression = match[1];
      const wrt = expression.match(/\s+(?:with\s+respect\s+to|wrt|in\s+terms\s+of)\s+([A-Za-z_]\w*)$/i);
      if (wrt) { explicitVariable = wrt[1]; expression = expression.slice(0, wrt.index).trim(); }
      return { operation: "differentiate", expression, variable: inferVariable(expression, explicitVariable) };
    }

    match = raw.match(/^(?:find\s+)?(?:the\s+)?(?:limit|lim)\s+(.+?)\s+as\s+([A-Za-z_]\w*)\s*(?:->|approaches|to)\s*([A-Za-z0-9_.+\-]+)$/i);
    if (match) return { operation: "limit", expression: match[1], variable: match[2], point: match[3] };

    match = raw.match(/^(?:integrate|find\s+the\s+integral\s+of|integral\s+of)\s+(.+)$/i);
    if (match) {
      let body = match[1].trim();
      let differentialVariable = null;
      const differentialAtEnd = body.match(/\s*d([A-Za-z_]\w*)$/i);
      if (differentialAtEnd) { differentialVariable = differentialAtEnd[1]; body = body.slice(0, differentialAtEnd.index).trim(); }
      const definite = body.match(/^(.+?)\s+from\s+([^\s]+)\s+to\s+([^\s]+)$/i);
      if (definite) {
        const variable = inferVariable(definite[1], differentialVariable);
        return { operation: "definiteIntegral", expression: definite[1], variable, lower: definite[2], upper: definite[3] };
      }
      const differential = body.match(/\s*d([A-Za-z_]\w*)$/i);
      if (differential) { explicitVariable = differential[1]; body = body.slice(0, differential.index).trim(); }
      return { operation: "integrate", expression: body, variable: inferVariable(body, explicitVariable || differentialVariable) };
    }

    match = raw.match(/^(?:evaluate|eval)\s+(.+?)\s+at\s+(.+)$/i);
    if (match) {
      const values = {};
      for (const assignment of match[2].split(",")) {
        const pair = assignment.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+?)\s*$/);
        if (!pair) throw new Error("For evaluation, use values like: evaluate x^2 + y at x=2, y=3.");
        values[pair[1]] = pair[2];
      }
      return { operation: "evaluate", expression: match[1], values };
    }

    match = raw.match(/^(?:solve\s+)?(?:the\s+)?system(?:\s+of\s+equations)?\s*:?\s+(.+)$/i);
    if (match) {
      const equations = match[1].split(/\s*(?:;|\band\b)\s*/i).map(item => item.trim()).filter(Boolean);
      if (equations.length < 2) throw new Error("Enter two or more equations, separated by “and” or a semicolon.");
      return { operation: "system", equations };
    }

    match = raw.match(/^(?:solve(?:\s+for\s+([A-Za-z_]\w*))?\s*:?)\s+(.+)$/i);
    if (match) {
      explicitVariable = match[1] || null;
      const body = match[2];
      return { operation: "solve", expression: body, variable: inferVariable(body, explicitVariable) };
    }

    for (const operation of ["factor", "expand", "simplify"]) {
      match = raw.match(new RegExp(`^(?:${operation}|${operation === "expand" ? "multiply out" : operation})\\s+(.+)$`, "i"));
      if (match) return { operation, expression: match[1] };
    }

    if (raw.includes("=")) return { operation: "solve", expression: raw, variable: inferVariable(raw) };
    if (/\b(?:differentiat|derivative|integrat|integral|limit|solve)\b/i.test(raw)) {
      throw new Error("I recognized the math topic, but not its format. Try a template such as “differentiate x^2 sin(x)” or “limit sin(x)/x as x -> 0.”");
    }
    return { operation: "simplify", expression: raw };
  }

  function validateParsed(parsed) {
    const items = [parsed.expression, parsed.lower, parsed.upper, parsed.point, ...(parsed.equations || []), ...Object.values(parsed.values || {})].filter(Boolean);
    for (const item of items) validateExpression(cleanMath(item));
    if (parsed.operation === "solve") {
      const equals = (parsed.expression.match(/=/g) || []).length;
      if (equals > 1) throw new Error("Use one equation at a time, with a single equals sign.");
    }
  }

  function evaluateNumber(expression, variable, value) {
    try {
      const result = nerdamer(expression).evaluate({ [variable]: value }).text();
      if (/^[+-]?\d+(?:\.\d+)?$/.test(result)) return Number(result);
      if (/^[+-]?\d+\/\d+$/.test(result)) {
        const [numerator, denominator] = result.split("/").map(Number);
        return denominator ? numerator / denominator : NaN;
      }
    } catch { /* A symbolic value is not a numeric coefficient. */ }
    return NaN;
  }

  function algebraTerm(coefficient, variable) {
    if (coefficient === 1) return variable;
    if (coefficient === -1) return `−${variable}`;
    return `${coefficient}${variable}`;
  }

  function linearEquationSteps(variable, coefficient, constant, root) {
    const first = `${algebraTerm(coefficient, variable)} ${constant < 0 ? "− " + Math.abs(constant) : "+ " + constant} = 0`;
    const steps = [
      { title: "Collect the variable terms", detail: `Subtract the right side from both sides. The equation becomes ${first}.` }
    ];
    if (constant !== 0) {
      const undo = constant < 0 ? `Add ${Math.abs(constant)}` : `Subtract ${constant}`;
      const direction = constant < 0 ? "to" : "from";
      steps.push({ title: "Undo the constant", detail: `${undo} ${direction} both sides to isolate the term with ${variable}.` });
      steps.push({ title: "Divide by the coefficient", detail: `${variable} = ${root}.` });
    } else {
      steps.push({ title: "Divide by the coefficient", detail: `Divide both sides by ${coefficient}; ${variable} = ${root}.` });
    }
    return steps;
  }

  function solveEquation(parsed) {
    const parts = parsed.expression.split("=");
    const left = cleanMath(parts[0]);
    const right = parts.length === 2 ? cleanMath(parts[1]) : "0";
    validateExpression(left); validateExpression(right);
    if (/\b(?:sin|cos|tan|sec|csc|cot|log|ln|exp)\s*\(/i.test(`${left} ${right}`)) {
      throw new Error("I can work with trig and exponential expressions, but periodic equations need a specified interval and aren’t solved here yet.");
    }
    const variable = parsed.variable || inferVariable(`${left} ${right}`);
    const difference = nerdamer(`(${left})-(${right})`).expand();
    const reduced = difference.text();
    const solution = nerdamer.solve(reduced, variable);
    const roots = solution.text();
    if (/\b(?:solve|integrate)\(/i.test(roots)) throw new Error("I can identify the equation, but this equation type is beyond the current symbolic solver.");

    const firstDerivative = nerdamer.diff(reduced, variable).text();
    const secondDerivative = nerdamer.diff(firstDerivative, variable).text();
    const coefficient = evaluateNumber(reduced, variable, 1) - evaluateNumber(reduced, variable, 0);
    const constant = evaluateNumber(reduced, variable, 0);
    let steps;
    if (secondDerivative === "0" && Number.isFinite(coefficient) && Number.isFinite(constant) && coefficient !== 0) {
      const exactRoot = nerdamer(`-(${constant})/(${coefficient})`).text();
      steps = linearEquationSteps(variable, coefficient, constant, exactRoot);
    } else {
      const factored = nerdamer.factor(reduced).text();
      steps = [{ title: "Write it as zero", detail: `Move everything to one side: ${reduced} = 0.` }];
      if (factored !== reduced) {
        steps.push({ title: "Factor the expression", detail: `${reduced} = ${factored}.` });
        steps.push({ title: "Set each factor to zero", detail: `Use the zero-product rule. The roots are ${roots}.` });
      } else {
        steps.push({ title: "Solve for the selected variable", detail: `Treat ${variable} as the unknown and use an equation-solving method for this expression.` });
        steps.push({ title: "Check the result", detail: `The symbolic solver gives ${variable} ∈ ${roots}. Substitute each value back into the original equation to verify it.` });
      }
    }
    return {
      operation: "solve", type: TYPE_NAMES.solve, variable, expression: parsed.expression,
      answer: `${variable} ∈ ${roots}`, steps
    };
  }

  function solveSystem(parsed) {
    const equations = parsed.equations.map(cleanMath);
    const variables = [...new Set(equations.flatMap(getVariables))];
    if (variables.length < 2) throw new Error("I found a system, but it needs at least two different variables.");
    const solution = nerdamer.solveSystem(equations, variables);
    const answer = solution.text();
    return {
      operation: "system", type: TYPE_NAMES.system, answer,
      steps: [
        { title: "Identify the unknowns", detail: `This system has ${variables.length} variables: ${variables.join(", ")}.` },
        { title: "Keep the equations together", detail: equations.join("; ") + ". Solve them as one system, not as separate equations." },
        { title: "Use elimination or substitution", detail: "Combine equations to remove one variable, then substitute back to find the others." },
        { title: "Check the solution", detail: `The symbolic solver returns ${answer}. Substitute the values into each original equation to check them.` }
      ]
    };
  }

  function derivativeSteps(expression, variable, derivative) {
    const normalized = nerdamer(expression).text();
    const steps = [{ title: `Choose the variable ${variable}`, detail: `Differentiate with respect to ${variable}; any other variable is treated as a constant.` }];
    if (normalized.includes("+" ) || /-\d/.test(normalized)) {
      steps.push({ title: "Use the sum rule", detail: "Differentiate each term separately, keeping its sign and coefficient." });
    }
    if (normalized.includes("*")) {
      steps.push({ title: "Use the product rule", detail: "For a product u·v, use (u·v)' = u'v + uv'." });
    }
    if (/(sin|cos|tan|ln|log|exp|sqrt)\s*\(/i.test(normalized)) {
      steps.push({ title: "Check for the chain rule", detail: "For a function inside another function, differentiate the outside and multiply by the inside derivative." });
    }
    if (/\^/.test(normalized)) {
      steps.push({ title: "Apply the power rule", detail: `For a power, d(${variable}^n)/d${variable} = n${variable}^(n−1).` });
    }
    steps.push({ title: "Combine the derivatives", detail: `The derivative simplifies to ${derivative}.` });
    return steps;
  }

  function calculusResult(parsed) {
    const variable = parsed.variable || inferVariable(parsed.expression);
    validateExpression(parsed.expression);
    const original = cleanMath(parsed.expression);

    if (parsed.operation === "differentiate") {
      const derivative = nerdamer.diff(original, variable).text();
      if (derivative.includes("diff(")) throw new Error("I recognized a derivative, but couldn't finish that symbolic differentiation.");
      return { operation: parsed.operation, type: TYPE_NAMES[parsed.operation], variable, answer: derivative, steps: derivativeSteps(original, variable, derivative) };
    }

    if (parsed.operation === "integrate") {
      const antiderivative = nerdamer.integrate(original, variable).text();
      if (/integrate\(/i.test(antiderivative)) throw new Error("I can identify the integral, but this antiderivative is not supported by the current symbolic engine.");
      const derivative = nerdamer.diff(antiderivative, variable).text();
      const check = nerdamer(`(${derivative})-(${original})`).text();
      const steps = [
        { title: `Integrate with respect to ${variable}`, detail: `Look for an antiderivative F so that F′(${variable}) matches the integrand.` },
        { title: "Apply an antiderivative rule", detail: `The computed antiderivative is F(${variable}) = ${antiderivative}.` },
        { title: "Check by differentiating", detail: check === "0" ? `F′(${variable}) = ${derivative}, which matches the original integrand.` : `Differentiating the result gives ${derivative}.` }
      ];
      return { operation: parsed.operation, type: TYPE_NAMES[parsed.operation], variable, answer: `${antiderivative} + C`, steps };
    }

    if (parsed.operation === "definiteIntegral") {
      const antiderivative = nerdamer.integrate(original, variable).text();
      if (/integrate\(/i.test(antiderivative)) throw new Error("I can identify the definite integral, but couldn't find its antiderivative symbolically.");
      const upperValue = nerdamer(antiderivative).evaluate({ [variable]: cleanMath(parsed.upper) }).text();
      const lowerValue = nerdamer(antiderivative).evaluate({ [variable]: cleanMath(parsed.lower) }).text();
      const value = nerdamer(`(${upperValue})-(${lowerValue})`).text();
      return {
        operation: parsed.operation, type: TYPE_NAMES[parsed.operation], variable, answer: value,
        steps: [
          { title: "Find an antiderivative", detail: `An antiderivative is F(${variable}) = ${antiderivative}.` },
          { title: "Use the Fundamental Theorem of Calculus", detail: `Evaluate F(${parsed.upper}) − F(${parsed.lower}).` },
          { title: "Subtract the endpoint values", detail: `The definite integral is ${value}.` }
        ]
      };
    }

    if (parsed.operation === "limit") {
      const point = cleanMath(parsed.point);
      const direct = evaluateNumber(original, variable, point);
      const value = nerdamer.limit(original, variable, point).text();
      if (/\blimit\s*\(/i.test(value) || /^(?:undefined|nan)$/i.test(value)) {
        throw new Error("I recognized a limit, but the symbolic engine could not resolve this form. Try simplifying the expression or using a standard limit notation.");
      }
      const steps = Number.isFinite(direct)
        ? [{ title: "Identify the approach value", detail: `As ${variable} approaches ${point}, first try substituting ${variable} = ${point}.` }, { title: "Evaluate the limit", detail: `The substitution gives ${value}, so the limit is ${value}.` }]
        : [{ title: "Check direct substitution", detail: `Substituting ${variable} = ${point} does not give a finite value, so use limit laws or an algebraic limit method.` }, { title: "Evaluate the limit", detail: `The symbolic limit simplifies to ${value}.` }];
      return { operation: parsed.operation, type: TYPE_NAMES[parsed.operation], variable, answer: value, steps };
    }
    throw new Error("That calculus operation is not supported yet.");
  }

  function solveRequest(input) {
    try {
      const parsed = parseRequest(input);
      validateParsed(parsed);
      if (parsed.operation === "system") return solveSystem(parsed);
      if (parsed.operation === "solve") return solveEquation(parsed);
      if (["differentiate", "integrate", "definiteIntegral", "limit"].includes(parsed.operation)) return calculusResult(parsed);

      const expression = cleanMath(parsed.expression);
      let answer;
      let detail;
      if (parsed.operation === "factor") {
        answer = nerdamer.factor(expression).text();
        detail = "Look for common factors or familiar polynomial patterns, then rewrite as a product.";
      } else if (parsed.operation === "expand") {
        answer = nerdamer(`expand(${expression})`).text();
        detail = "Distribute factors across parentheses and combine like terms.";
      } else if (parsed.operation === "evaluate") {
        const values = Object.fromEntries(Object.entries(parsed.values).map(([key, value]) => [key, cleanMath(value)]));
        const evaluated = nerdamer(expression).evaluate(values).text();
        if (getVariables(evaluated).length) throw new Error("Some variables are still unassigned. Add a value for each variable, like x=2, y=3.");
        return {
          operation: parsed.operation, type: TYPE_NAMES[parsed.operation], answer: evaluated,
          steps: [
            { title: "Substitute the given values", detail: `Replace ${Object.entries(values).map(([key, value]) => `${key} with ${value}`).join(" and ")} in the expression.` },
            { title: "Simplify", detail: `After substitution, the expression evaluates to ${evaluated}.` }
          ]
        };
      } else {
        answer = nerdamer.simplify(expression).text();
        detail = "Combine like terms and simplify numerical factors while keeping equivalent values.";
      }
      return {
        operation: parsed.operation, type: TYPE_NAMES[parsed.operation], answer,
        steps: [
          { title: "Identify the requested operation", detail: `${TYPE_NAMES[parsed.operation]}: ${expression}.` },
          { title: "Apply the matching rule", detail },
          { title: "Write the result", detail: `The result is ${answer}.` }
        ]
      };
    } catch (error) {
      const message = error && error.message ? error.message : "";
      const friendly = /is not a function|unexpected|parser|cannot read|invalid expression|syntax error/i.test(message)
        ? "I couldn't read that notation yet. Check the parentheses and operators, or try one of the examples below."
        : message || "I couldn't parse that yet. Try one of the examples below.";
      return { error: friendly };
    }
  }

  return { parseRequest, solveRequest, cleanMath, getVariables, normalizeCommandLanguage, TYPE_NAMES };
});
