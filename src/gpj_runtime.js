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

const GPJ_TYPEOF_SRC = `function __gpj_typeof(v) {
  if (v === null) return "None";
  if (Array.isArray(v)) return "Array";
  const t = typeof v;
  return t[0].toUpperCase() + t.slice(1);
}`;

// Structural type guard for typed catch: checks that v is a non-null, non-Array
// object with every key in shape having the matching GPJ type.
const GPJ_STRUCT_SRC = `function __gpj_isStruct(v, shape) {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  var keys = Object.keys(shape);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (!Object.prototype.hasOwnProperty.call(v, k)) return false;
    if (__gpj_typeof(v[k]) !== shape[k]) return false;
  }
  return true;
}`;

// String built-in patches: at/indexOf return None instead of undefined/-1;
// split requires a separator; String.compare is a static ordering method.
const GPJ_STRING_SRC = `{
  const _sat = String.prototype.at;
  String.prototype.at = function(n) {
    const r = _sat.call(this, n);
    return r === undefined ? null : r;
  };
  const _sindexOf = String.prototype.indexOf;
  String.prototype.indexOf = function(search) {
    const r = _sindexOf.call(this, search);
    return r === -1 ? null : r;
  };
  const _ssplit = String.prototype.split;
  String.prototype.split = function(sep) {
    if (arguments.length === 0) throw new TypeError("String.split requires a separator argument");
    return _ssplit.call(this, sep);
  };
  String.compare = function(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  };
}`;

// Array built-in patches: pop/shift/find return None instead of undefined;
// findIndex/indexOf return None instead of -1; indexOf uses deep equality;
// sort requires an explicit comparator argument.
const GPJ_ARRAY_SRC = `{
  const _apop = Array.prototype.pop;
  Array.prototype.pop = function() {
    const r = _apop.call(this);
    return r === undefined ? null : r;
  };
  const _ashift = Array.prototype.shift;
  Array.prototype.shift = function() {
    const r = _ashift.call(this);
    return r === undefined ? null : r;
  };
  const _afind = Array.prototype.find;
  Array.prototype.find = function(fn) {
    const r = _afind.call(this, fn);
    return r === undefined ? null : r;
  };
  const _afindIndex = Array.prototype.findIndex;
  Array.prototype.findIndex = function(fn) {
    const r = _afindIndex.call(this, fn);
    return r === -1 ? null : r;
  };
  Array.prototype.indexOf = function(value) {
    for (let i = 0; i < this.length; i++) {
      if (__gpj_eq(this[i], value)) return i;
    }
    return null;
  };
  const _asort = Array.prototype.sort;
  Array.prototype.sort = function(cmp) {
    if (arguments.length === 0) throw new TypeError("Array.sort requires a comparator argument");
    return _asort.call(this, cmp);
  };
}`;

// JSON.decycle converts circular structures to trees by replacing back-references
// with { $ref: "path" } markers.  JSON.recycle is the inverse.
const GPJ_JSON_SRC = `{
  JSON.decycle = function(obj) {
    const seen = [];
    const paths = [];
    function derez(val, path) {
      if (val !== null && typeof val === "object") {
        for (let i = 0; i < seen.length; i++) {
          if (seen[i] === val) return { $ref: paths[i] };
        }
        seen.push(val);
        paths.push(path);
        if (Array.isArray(val)) {
          return val.map((v, i) => derez(v, path + "[" + i + "]"));
        }
        const nu = {};
        for (const key of Object.keys(val)) {
          nu[key] = derez(val[key], path + "[" + JSON.stringify(key) + "]");
        }
        return nu;
      }
      return val;
    }
    return derez(obj, "$");
  };
  JSON.recycle = function(obj) {
    function resolve(root, path) {
      if (path === "$") return root;
      let p = path.slice(1);
      let val = root;
      while (p.length > 0) {
        const close = p.indexOf("]");
        const seg = p.slice(1, close);
        p = p.slice(close + 1);
        val = val[/^"/.test(seg) ? JSON.parse(seg) : +seg];
      }
      return val;
    }
    function rerez(val) {
      if (val !== null && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0; i < val.length; i++) {
            const v = val[i];
            if (v !== null && typeof v === "object" && typeof v.$ref === "string") {
              val[i] = resolve(obj, v.$ref);
            } else {
              rerez(v);
            }
          }
        } else {
          for (const key of Object.keys(val)) {
            const v = val[key];
            if (v !== null && typeof v === "object" && typeof v.$ref === "string") {
              val[key] = resolve(obj, v.$ref);
            } else {
              rerez(v);
            }
          }
        }
      }
    }
    rerez(obj);
    return obj;
  };
}`;

export { GPJ_ADD_SRC, GPJ_ARITH_SRC, GPJ_EQ_SRC, GPJ_TYPEOF_SRC, GPJ_STRUCT_SRC, GPJ_STRING_SRC, GPJ_ARRAY_SRC, GPJ_JSON_SRC };
