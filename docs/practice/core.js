const MathLabCore = (function (root) {
  "use strict";

  const TOPICS = ["rate", "piecewise", "extrema"];
  const randInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
  const pick = (rng, items) => items[Math.floor(rng() * items.length)];
  const nice = (n) => (Object.is(n, -0) ? 0 : n);
  const linear = (m, b) => ({ m, b });
  const valueAt = (line, x) => line.m * x + line.b;
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const fraction = (numerator, denominator) => {
    const sign = Math.sign(numerator) * Math.sign(denominator) || 1;
    const d = Math.abs(denominator);
    const n = Math.abs(numerator);
    const common = gcd(n, d) || 1;
    return { n: (n / common) * sign, d: d / common };
  };

  function rateProblem(rng) {
    let x1 = randInt(rng, -5, 1);
    let x2 = x1 + randInt(rng, 1, Math.min(5, 5 - x1));
    if (x1 === x2) x2 = x1 + 1;
    const y1 = randInt(rng, -8, 8);
    let y2 = randInt(rng, -8, 8);
    if (y1 === y2) y2 = y2 === 8 ? y2 - 1 : y2 + 1;
    const source = rng() < 0.48 ? "table" : "graph";
    const f = fraction(y2 - y1, x2 - x1);
    return {
      topic: "rate", kind: "number", source,
      data: { x1, x2, y1, y2, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }] },
      answer: f.n / f.d,
      answerDisplay: f.d === 1 ? String(f.n) : `${f.n}/${f.d}`,
      prompt: `Find the average rate of change from x = ${x1} to x = ${x2}.`,
      hint: "Average rate of change is the change in y divided by the change in x. Keep the subtraction order the same on top and bottom.",
      explanation: [
        `Read the two endpoint values: when x = ${x1}, y = ${y1}; when x = ${x2}, y = ${y2}.`,
        `Find the vertical change: Δy = ${y2} − (${y1}) = ${y2 - y1}.`,
        `Find the horizontal change: Δx = ${x2} − (${x1}) = ${x2 - x1}.`,
        `Divide: Δy ÷ Δx = ${f.n}/${f.d}${f.d === 1 ? ` = ${f.n}` : ` (or ${nice(f.n / f.d)})`}.`
      ]
    };
  }

  function piecewiseProblem(rng) {
    const c = randInt(rng, -2, 2);
    const left = linear(pick(rng, [-2, -1, 1, 2]), randInt(rng, -3, 3));
    let right = linear(pick(rng, [-2, -1, 1, 2]), randInt(rng, -3, 3));
    if (valueAt(left, c) === valueAt(right, c)) right = linear(right.m, right.b + (rng() < 0.5 ? 1 : -1));
    const boundarySide = rng() < 0.5 ? "left" : "right";
    const x = rng() < 0.35 ? c : (rng() < 0.5 ? c - randInt(rng, 1, 3) : c + randInt(rng, 1, 3));
    const selected = x < c || (x === c && boundarySide === "left") ? left : right;
    const answer = valueAt(selected, x);
    const relationLeft = boundarySide === "left" ? "≤" : "<";
    const relationRight = boundarySide === "right" ? "≥" : ">";
    return {
      topic: "piecewise", kind: "number", source: "graph",
      data: { c, left, right, boundarySide, x, relationLeft, relationRight },
      answer,
      prompt: `Evaluate f(${x}). Pay close attention if x lands on the break point.`,
      hint: x === c ? `At x = ${c}, use the piece whose endpoint is filled (the ≤ or ≥ rule).` : `First decide whether ${x} is less than or greater than the break point ${c}; then use only that rule.`,
      explanation: [
        `The break point is x = ${c}. The value ${x} is ${x < c ? "to the left of" : x > c ? "to the right of" : "exactly on"} it.`,
        x === c ? `At the boundary, the ${boundarySide} piece includes x = ${c}, as shown by its filled dot and inequality.` : `Use the ${x < c ? "left" : "right"} rule for this x-value.`,
        `Substitute x = ${x}: f(${x}) = ${selected.m}(${x}) ${selected.b < 0 ? "− " + Math.abs(selected.b) : selected.b > 0 ? "+ " + selected.b : ""} = ${answer}.`
      ]
    };
  }

  function extremaFacts(points) {
    const maxY = Math.max(...points.map(p => p.y));
    const minY = Math.min(...points.map(p => p.y));
    const absMax = points.find(p => p.y === maxY);
    const absMin = points.find(p => p.y === minY);
    const relativeMax = [];
    const relativeMin = [];
    for (let i = 1; i < points.length - 1; i++) {
      if (points[i].y > points[i - 1].y && points[i].y > points[i + 1].y) relativeMax.push(points[i]);
      if (points[i].y < points[i - 1].y && points[i].y < points[i + 1].y) relativeMin.push(points[i]);
    }
    return { absMax, absMin, relativeMax, relativeMin };
  }

  function makePoints(rng) {
    let points;
    for (let tries = 0; tries < 100; tries++) {
      const ys = Array.from({ length: 6 }, () => randInt(rng, -5, 5));
      if (new Set(ys).size !== ys.length) continue;
      points = ys.map((y, i) => ({ x: i - 3, y }));
      const facts = extremaFacts(points);
      if (facts.relativeMax.length + facts.relativeMin.length) return points;
    }
    return [-4, 1, -2, 3, -1, 2].map((y, i) => ({ x: i - 3, y }));
  }

  function extremaProblem(rng) {
    const points = makePoints(rng);
    const facts = extremaFacts(points);
    if (rng() < 0.5) {
      const target = rng() < 0.5 ? "relativeMax" : "relativeMin";
      const values = facts[target].map(p => p.x);
      const label = target === "relativeMax" ? "relative maxima" : "relative minima";
      return {
        topic: "extrema", kind: "number-set", source: "graph", data: { points, mode: "typed", target },
        answer: values,
        prompt: `Enter the x-value${values.length === 1 ? "" : "s"} of every ${label}. If there are none, enter “none.”`,
        hint: "A relative maximum is higher than the points immediately beside it; a relative minimum is lower than both neighbors. The endpoints are not relative extrema here.",
        explanation: [
          `Compare each interior point with the point immediately before and after it.`,
          ...points.slice(1, -1).map((p, i) => {
            const before = points[i].y, after = points[i + 2].y;
            const qualifies = target === "relativeMax" ? p.y > before && p.y > after : p.y < before && p.y < after;
            return `At x = ${p.x}, y = ${p.y}; its neighbors are ${before} and ${after}, so it ${qualifies ? "is" : "is not"} a ${label.replace(/s$/, "")}.`;
          }),
          values.length ? `Answer: x = ${values.join(", ")}.` : `No interior point is a ${label.replace(/s$/, "")}, so the answer is none.`
        ]
      };
    }

    const claims = [];
    const add = (id, label, claim) => claims.push({ id, label, claim });
    const relMaxXs = new Set(facts.relativeMax.map(p => p.x));
    const relMinXs = new Set(facts.relativeMin.map(p => p.x));
    facts.relativeMax.forEach(p => add(`rmax-${p.x}`, `There is a relative maximum at x = ${p.x}.`, { kind: "relative", extreme: "max", x: p.x }));
    facts.relativeMin.forEach(p => add(`rmin-${p.x}`, `There is a relative minimum at x = ${p.x}.`, { kind: "relative", extreme: "min", x: p.x }));
    const falseMax = points.find(p => !relMaxXs.has(p.x));
    const falseMin = points.find(p => !relMinXs.has(p.x));
    add(`rmax-false-${falseMax.x}`, `There is a relative maximum at x = ${falseMax.x}.`, { kind: "relative", extreme: "max", x: falseMax.x });
    add(`rmin-false-${falseMin.x}`, `There is a relative minimum at x = ${falseMin.x}.`, { kind: "relative", extreme: "min", x: falseMin.x });
    add("absmax-true", `The absolute maximum is ${facts.absMax.y} at x = ${facts.absMax.x}.`, { kind: "absolute", extreme: "max", x: facts.absMax.x, y: facts.absMax.y });
    add("absmin-true", `The absolute minimum is ${facts.absMin.y} at x = ${facts.absMin.x}.`, { kind: "absolute", extreme: "min", x: facts.absMin.x, y: facts.absMin.y });
    const otherMax = points.find(p => p.x !== facts.absMax.x);
    const otherMin = points.find(p => p.x !== facts.absMin.x);
    add("absmax-false", `The absolute maximum is ${otherMax.y} at x = ${otherMax.x}.`, { kind: "absolute", extreme: "max", x: otherMax.x, y: otherMax.y });
    add("absmin-false", `The absolute minimum is ${otherMin.y} at x = ${otherMin.x}.`, { kind: "absolute", extreme: "min", x: otherMin.x, y: otherMin.y });
    const trueClaims = claims.filter(item => {
      const c = item.claim;
      if (c.kind === "relative") return (c.extreme === "max" ? relMaxXs : relMinXs).has(c.x);
      const p = c.extreme === "max" ? facts.absMax : facts.absMin;
      return p.x === c.x && p.y === c.y;
    }).map(item => item.id);
    const explanation = [
      `The highest point on the whole graph is (${facts.absMax.x}, ${facts.absMax.y}); the lowest is (${facts.absMin.x}, ${facts.absMin.y}).`,
      `For relative extrema, compare each interior point only with its two neighbors. Relative maxima: ${facts.relativeMax.length ? facts.relativeMax.map(p => `x = ${p.x}`).join(", ") : "none"}. Relative minima: ${facts.relativeMin.length ? facts.relativeMin.map(p => `x = ${p.x}`).join(", ") : "none"}.`,
      "Select statements that match these checks; a high or low point only counts as relative if it beats both neighbors."
    ];
    return {
      topic: "extrema", kind: "multi", source: "graph", data: { points, mode: "multi", claims },
      choices: claims.map(({ id, label }) => ({ id, label })), answer: trueClaims,
      prompt: "Select every statement that is true about this graph.",
      hint: "Absolute extrema compare every point in the shown domain. Relative extrema compare an interior point with its two immediate neighbors.",
      explanation
    };
  }

  function createProblem(topic = "mixed", rng = Math.random) {
    const selected = topic === "mixed" ? pick(rng, TOPICS) : topic;
    if (selected === "rate") return rateProblem(rng);
    if (selected === "piecewise") return piecewiseProblem(rng);
    if (selected === "extrema") return extremaProblem(rng);
    throw new Error(`Unknown topic: ${topic}`);
  }

  function parseNumber(value) {
    const text = String(value ?? "").trim().replace(/[−–]/g, "-").replace(/\s/g, "");
    if (!text || text.toLowerCase() === "none") return null;
    const parts = text.split("/");
    if (parts.length > 2) return NaN;
    if (parts.length === 2) {
      const n = Number(parts[0]), d = Number(parts[1]);
      return Number.isFinite(n) && Number.isFinite(d) && d !== 0 ? n / d : NaN;
    }
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function checkAnswer(problem, response) {
    if (problem.kind === "number") {
      const value = parseNumber(response);
      return value !== null && Number.isFinite(value) && Math.abs(value - problem.answer) < 1e-6;
    }
    if (problem.kind === "number-set") {
      const raw = Array.isArray(response) ? response : String(response ?? "").split(",");
      const values = raw.map(parseNumber);
      if (values.length === 1 && values[0] === null) return problem.answer.length === 0;
      if (values.some(v => v === null || !Number.isFinite(v))) return false;
      const actual = values.map(nice).sort((a, b) => a - b);
      const expected = problem.answer.map(nice).sort((a, b) => a - b);
      return actual.length === expected.length && actual.every((v, i) => Math.abs(v - expected[i]) < 1e-6);
    }
    if (problem.kind === "multi") {
      if (!Array.isArray(response)) return false;
      const actual = [...new Set(response)].sort();
      const expected = [...problem.answer].sort();
      return actual.length === expected.length && actual.every((v, i) => v === expected[i]);
    }
    return false;
  }

  return { createProblem, checkAnswer, parseNumber, extremaFacts, valueAt, fraction, TOPICS };
})(typeof globalThis !== "undefined" ? globalThis : this);

if (typeof module !== "undefined" && module.exports) module.exports = MathLabCore;
