import { GPJ_ADD_SRC, GPJ_ARITH_SRC, GPJ_EQ_SRC, GPJ_TYPEOF_SRC, GPJ_STRUCT_SRC, GPJ_STRING_SRC, GPJ_ARRAY_SRC, GPJ_JSON_SRC } from "./gpj_runtime.js";

class CodegenError extends Error {
  constructor(message, node) {
    super(message);
    this.node = node;
  }
}

const PRIMITIVE_LITERALS = new Set([
  "NumberLiteral",
  "StringLiteral",
  "BooleanLiteral",
  "NoneLiteral",
]);

function isPrimitiveLiteral(node) {
  return PRIMITIVE_LITERALS.has(node.type);
}

function escapeTemplateText(str) {
  let out = "";
  for (const ch of str) {
    if (ch === "\\") out += "\\\\";
    else if (ch === "`") out += "\\`";
    else if (ch === "$") out += "\\$";
    else out += ch;
  }
  return out;
}

let usedHelpers;
let typeAliases; // Map<name, typeExpr> — populated from top-level TypeAlias nodes

// Return the GPJ type name string for a simple type node, or null if complex.
function gpjTypeName(typeNode) {
  if (!typeNode) return null;
  if (typeNode.type === "NamedType") return typeNode.name;
  if (typeNode.type === "GenericType") return typeNode.name; // "Array", etc.
  return null;
}

// Resolve a type annotation to an array of structural shapes for runtime catch
// guards.  Each shape is { fieldName: "GpjTypeName", ... }.  Returns null when
// the type is unresolvable — the caller treats that as a permissive catch-all.
function resolveTypeShape(typeNode) {
  if (!typeNode) return null;
  if (typeNode.type === "ObjectType") {
    const shape = {};
    for (const f of typeNode.fields) {
      const t = gpjTypeName(f.valueType);
      if (t === null) return null; // complex field type — treat as permissive
      shape[f.key] = t;
    }
    return [shape];
  }
  if (typeNode.type === "NamedType") {
    const resolved = typeAliases.get(typeNode.name);
    if (!resolved) return null; // unknown named type — permissive
    return resolveTypeShape(resolved);
  }
  if (typeNode.type === "UnionType") {
    const all = [];
    for (const t of typeNode.types) {
      const shapes = resolveTypeShape(t);
      if (!shapes) return null; // any unresolvable member — whole union is permissive
      all.push(...shapes);
    }
    return all;
  }
  return null;
}

function generate(node) {
  switch (node.type) {
    case "Program": {
      usedHelpers = new Set();
      typeAliases = new Map();
      // First pass: collect top-level type aliases for typed-catch shape resolution.
      for (const stmt of node.body) {
        if (stmt.type === "TypeAlias") {
          typeAliases.set(stmt.name, stmt.typeExpr);
        } else if (stmt.type === "ExportDeclaration" && stmt.declaration.type === "TypeAlias") {
          typeAliases.set(stmt.declaration.name, stmt.declaration.typeExpr);
        }
      }
      const body = node.body.map(generate).filter((s) => s !== "").join("\n");
      // GPJ_EQ_SRC and GPJ_ARRAY_SRC are always included: array.indexOf
      // uses __gpj_eq, so eq must precede array in the preamble.
      // GPJ_JSON_SRC is always included for JSON.decycle/recycle.
      const preamble = [GPJ_STRING_SRC, GPJ_EQ_SRC, GPJ_ARRAY_SRC, GPJ_JSON_SRC];
      if (usedHelpers.has("add")) preamble.push(GPJ_ADD_SRC);
      if (usedHelpers.has("arith")) preamble.push(GPJ_ARITH_SRC);
      if (usedHelpers.has("typeof")) preamble.push(GPJ_TYPEOF_SRC);
      if (usedHelpers.has("struct")) preamble.push(GPJ_STRUCT_SRC);
      return preamble.join("\n") + "\n" + body;
    }

    case "ImportDeclaration": {
      const specs = node.specifiers;
      // Relative paths need .js extension for Node ESM resolution
      let sourcePath = node.source;
      if ((sourcePath.startsWith("./") || sourcePath.startsWith("../")) &&
          !sourcePath.endsWith(".js") && !sourcePath.endsWith(".mjs")) {
        sourcePath += ".js";
      }
      if (specs.length === 1 && specs[0].type === "ImportNamespaceSpecifier") {
        return `import * as ${specs[0].local} from ${JSON.stringify(sourcePath)};`;
      }
      const names = specs.map((s) => {
        if (s.imported === s.local) return s.imported;
        return `${s.imported} as ${s.local}`;
      });
      return `import { ${names.join(", ")} } from ${JSON.stringify(sourcePath)};`;
    }

    case "ExportDeclaration":
      return `export ${generate(node.declaration)}`;

    case "TypeAlias":
      return "";

    case "DestructureDeclaration": {
      const jsKind = node.kind === "val" ? "const" : "let";
      const pattern = generatePattern(node.pattern);
      const init = generate(node.init);
      return `${jsKind} ${pattern} = ${init};`;
    }

    case "ExpressionStatement":
      return generate(node.expression) + ";";

    case "CallExpression": {
      // Map.of(...) → new Map([...]) and Set.of(...) → new Set([...])
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.property === "of" &&
        node.callee.object.type === "Identifier" &&
        (node.callee.object.name === "Map" || node.callee.object.name === "Set")
      ) {
        const ctor = node.callee.object.name;
        const args = node.arguments.map(generate).join(", ");
        return `new ${ctor}([${args}])`;
      }
      const callee = generate(node.callee);
      const args = node.arguments.map(generate).join(", ");
      return `${callee}(${args})`;
    }

    case "MemberExpression":
      return `${generate(node.object)}.${node.property}`;

    case "ComputedMemberExpression":
      return `${generate(node.object)}[${generate(node.index)}]`;

    case "Identifier":
      return node.name;

    case "ThisExpression":
      return "this";

    case "NumberLiteral":
      return node.value;

    case "StringLiteral":
      return JSON.stringify(node.value);

    case "TemplateLiteral": {
      let out = "`";
      for (let i = 0; i < node.quasis.length; i++) {
        out += escapeTemplateText(node.quasis[i]);
        if (i < node.expressions.length) {
          out += `\${String(${generate(node.expressions[i])})}`;
        }
      }
      out += "`";
      return out;
    }

    case "BooleanLiteral":
      return node.value ? "true" : "false";

    case "NoneLiteral":
      return "null";

    case "SpreadElement":
      return `...${generate(node.argument)}`;

    case "ArrayLiteral":
      return `[${node.elements.map(generate).join(", ")}]`;

    case "ObjectLiteral": {
      const props = node.properties.map((p) => {
        if (p.type === "SpreadElement") return generate(p);
        const key = p.key;
        const val = generate(p.value);
        return `${key}: ${val}`;
      });
      return `{ ${props.join(", ")} }`;
    }

    case "VarDeclaration": {
      const jsKind = node.kind === "val" ? "const" : "let";
      const init = generate(node.init);
      if (node.kind === "val" && !isPrimitiveLiteral(node.init)) {
        return `${jsKind} ${node.name} = Object.freeze(${init});`;
      }
      return `${jsKind} ${node.name} = ${init};`;
    }

    case "FunctionDeclaration": {
      const params = node.params.map((p) => p.rest ? `...${p.name}` : p.name).join(", ");
      const body = generateBlock(node.body);
      return `function ${node.name}(${params}) ${body}`;
    }

    case "ArrowFunction": {
      const params = node.params.map((p) => p.rest ? `...${p.name}` : p.name).join(", ");
      if (node.body.type === "ExpressionBody") {
        return `((${params}) => ${generate(node.body.expression)})`;
      }
      return `((${params}) => ${generateBlock(node.body)})`;
    }

    case "FunctionExpression": {
      const params = node.params.map((p) => p.rest ? `...${p.name}` : p.name).join(", ");
      const body = generateBlock(node.body);
      return `(function(${params}) ${body})`;
    }

    case "ReturnStatement":
      if (node.argument) {
        return `return ${generate(node.argument)};`;
      }
      return "return;";

    case "IfStatement": {
      let code = `if (${generate(node.test)}) ${generateBlock(node.consequent)}`;
      if (node.alternate) {
        if (node.alternate.type === "IfStatement") {
          code += ` else ${generate(node.alternate)}`;
        } else {
          code += ` else ${generateBlock(node.alternate)}`;
        }
      }
      return code;
    }

    case "WhileStatement":
      return `while (${generate(node.test)}) ${generateBlock(node.body)}`;

    case "DoWhileStatement":
      return `do ${generateBlock(node.body)} while (${generate(node.test)});`;

    case "SwitchStatement": {
      const cases = node.cases.map((c) => {
        if (c.type === "SwitchDefault") {
          const body = c.body.map(generate).map((l) => "    " + l).join("\n");
          return `  default:\n${body}`;
        }
        const test = generate(c.test);
        const body = c.body.map(generate).map((l) => "    " + l).join("\n");
        return `  case ${test}:\n${body}`;
      });
      return `switch (${generate(node.discriminant)}) {\n${cases.join("\n")}\n}`;
    }

    case "ForStatement": {
      const init = generate(node.init).replace(/;$/, "");
      const test = generate(node.test);
      const update = generate(node.update);
      return `for (${init}; ${test}; ${update}) ${generateBlock(node.body)}`;
    }

    case "ForOfStatement": {
      const jsKind = node.kind === "val" ? "const" : "let";
      const binding = node.pattern ? generatePattern(node.pattern) : node.variable;
      return `for (${jsKind} ${binding} of ${generate(node.iterable)}) ${generateBlock(node.body)}`;
    }

    case "ThrowStatement":
      return `throw ${generate(node.argument)};`;

    case "TryStatement": {
      let code = `try ${generateBlock(node.block)}`;
      const handlers = node.handlers;
      if (handlers.length > 0) {
        const allSimple = handlers.length === 1 && handlers[0].typeAnnotation === null;
        if (allSimple) {
          // Common case: single bare catch — emit directly, no overhead.
          const h = handlers[0];
          code += ` catch (${h.param}) ${generateBlock(h.body)}`;
        } else {
          // Typed or multiple catch: emit if/else chain inside one JS catch.
          usedHelpers.add("typeof");
          usedHelpers.add("struct");
          let hasCatchAll = false;
          const parts = [];
          for (const h of handlers) {
            const bodyLines = [
              `let ${h.param} = __gpj_err;`,
              ...h.body.body.map(generate),
            ];
            const bodyBlock = `{\n${bodyLines.map((l) => "  " + l).join("\n")}\n}`;
            if (h.typeAnnotation === null) {
              // Bare catch-all — always matches; stop processing further handlers.
              hasCatchAll = true;
              parts.push({ cond: null, body: bodyBlock });
              break;
            }
            const shapes = resolveTypeShape(h.typeAnnotation);
            if (shapes === null) {
              // Unresolvable type annotation — treat permissively (catch-all).
              hasCatchAll = true;
              parts.push({ cond: null, body: bodyBlock });
              break;
            }
            const cond = shapes
              .map((s) => `__gpj_isStruct(__gpj_err, ${JSON.stringify(s)})`)
              .join(" || ");
            parts.push({ cond, body: bodyBlock });
          }
          if (!hasCatchAll) {
            parts.push({ cond: null, body: "{ throw __gpj_err; }" });
          }
          let chain = "";
          for (let i = 0; i < parts.length; i++) {
            const { cond, body } = parts[i];
            if (i > 0) chain += " else ";
            chain += cond !== null ? `if (${cond}) ${body}` : body;
          }
          code += ` catch (__gpj_err) {\n${chain}\n}`;
        }
      }
      if (node.finalizer) {
        code += ` finally ${generateBlock(node.finalizer)}`;
      }
      return code;
    }

    case "BreakStatement":
      return "break;";

    case "ContinueStatement":
      return "continue;";

    case "AssignmentExpression":
      return `${generate(node.left)} = ${generate(node.right)}`;

    case "CompoundAssignment": {
      const left = generate(node.left);
      const right = generate(node.right);
      switch (node.operator) {
        case "+=":
          usedHelpers.add("add");
          return `${left} = __gpj_add(${left}, ${right})`;
        case "-=": case "*=": case "/=": case "%=": case "**=": {
          usedHelpers.add("arith");
          const binOp = node.operator.slice(0, -1); // strip trailing =
          return `${left} = __gpj_arith(${JSON.stringify(binOp)}, ${left}, ${right})`;
        }
        default:
          throw new CodegenError(`Unknown compound operator: ${node.operator}`, node);
      }
    }

    case "TernaryExpression":
      return `(${generate(node.test)} ? ${generate(node.consequent)} : ${generate(node.alternate)})`;

    case "UnaryExpression":
      return `${node.operator}${generate(node.argument)}`;

    case "TypeofExpression":
      usedHelpers.add("typeof");
      return `__gpj_typeof(${generate(node.argument)})`;

    case "BinaryExpression": {
      const left = generate(node.left);
      const right = generate(node.right);
      switch (node.operator) {
        case "+":
          usedHelpers.add("add");
          return `__gpj_add(${left}, ${right})`;
        case "-": case "*": case "/": case "%": case "**":
          usedHelpers.add("arith");
          return `__gpj_arith(${JSON.stringify(node.operator)}, ${left}, ${right})`;
        case "==":
          usedHelpers.add("eq");
          return `__gpj_eq(${left}, ${right})`;
        case "!=":
          usedHelpers.add("eq");
          return `!__gpj_eq(${left}, ${right})`;
        case "??":
          return `(${left} ?? ${right})`;
        default:
          return `(${left} ${node.operator} ${right})`;
      }
    }

    default:
      throw new CodegenError(`Unknown AST node type: ${node.type}`, node);
  }
}

function generateBlock(block) {
  const lines = block.body.map(generate);
  if (lines.length === 0) return "{}";
  return `{\n${lines.map((l) => "  " + l).join("\n")}\n}`;
}

function generatePattern(node) {
  switch (node.type) {
    case "ObjectPattern": {
      const props = node.properties.map((p) => {
        if (p.type === "RestElement") return `...${p.name}`;
        if (p.value) return `${p.key}: ${generatePattern(p.value)}`;
        if (p.alias) return `${p.key}: ${p.alias}`;
        return p.key;
      });
      return `{ ${props.join(", ")} }`;
    }
    case "ArrayPattern": {
      const elems = node.elements.map((e) => {
        if (e.type === "RestElement") return `...${e.name}`;
        return generatePattern(e);
      });
      return `[${elems.join(", ")}]`;
    }
    case "PatternIdentifier":
      return node.name;
    default:
      throw new CodegenError(`Unknown pattern type: ${node.type}`, node);
  }
}

export { generate, CodegenError };
