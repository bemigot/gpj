"use strict";

// GPJ runtime helpers — injected into transpiled output as needed.

const GPJ_ADD_SRC = `function __gpj_add(a, b) {
  if (typeof a === "number" && typeof b === "number") return a + b;
  if (typeof a === "string" && typeof b === "string") return a + b;
  throw new TypeError("Cannot use + on " + typeof a + " and " + typeof b);
}`;

const GPJ_ARITH_SRC = `function __gpj_arith(op, a, b) {
  if (typeof a !== "number" || typeof b !== "number") {
    throw new TypeError("Cannot use " + op + " on " + typeof a + " and " + typeof b);
  }
  switch (op) {
    case "-": return a - b;
    case "*": return a * b;
    case "/": return a / b;
    case "%": return a % b;
    case "**": return a ** b;
  }
}`;

module.exports = { GPJ_ADD_SRC, GPJ_ARITH_SRC };
