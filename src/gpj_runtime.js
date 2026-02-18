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

const GPJ_EQ_SRC = `function __gpj_eq(a, b, seen) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (!seen) seen = [];
  for (var i = 0; i < seen.length; i++) {
    if (seen[i][0] === a && seen[i][1] === b) return true;
  }
  seen.push([a, b]);
  var isArrA = Array.isArray(a), isArrB = Array.isArray(b);
  if (isArrA !== isArrB) return false;
  if (isArrA) {
    if (a.length !== b.length) return false;
    for (var j = 0; j < a.length; j++) {
      if (!__gpj_eq(a[j], b[j], seen)) return false;
    }
    return true;
  }
  var keysA = Object.keys(a), keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (var k = 0; k < keysA.length; k++) {
    var key = keysA[k];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!__gpj_eq(a[key], b[key], seen)) return false;
  }
  return true;
}`;

export { GPJ_ADD_SRC, GPJ_ARITH_SRC, GPJ_EQ_SRC };
