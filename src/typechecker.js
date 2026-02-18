// Type-check pass: walks the AST after parsing and throws TypeCheckError on
// type mismatches.  Only checks what can be determined from literals and
// explicit annotations (step 23 scope).
//
// Deferred to later steps:
//   - Union / nullable types (step 25)
//   - Object and tuple structural checking (step 25+)
//   - Function return-type checking (step 24)
//   - Type inference from binary expressions / call expressions (step 24+)

class TypeCheckError extends Error {
  constructor(message) {
    super(message);
    this.name = "TypeCheckError";
  }
}

// Lexical scope: maps variable names to their type nodes (or null if unknown).
class Env {
  constructor(parent = null) {
    this.bindings = new Map();
    this.parent = parent;
  }

  define(name, typeNode) {
    this.bindings.set(name, typeNode);
  }

  lookup(name) {
    if (this.bindings.has(name)) return this.bindings.get(name);
    return this.parent ? this.parent.lookup(name) : null;
  }
}

// Human-readable label for a type node (used in error messages).
function typeLabel(t) {
  if (!t) return "unknown";
  switch (t.type) {
    case "NamedType": return t.name;
    case "GenericType": return `${t.name}<${t.params.map(typeLabel).join(", ")}>`;
    case "NullableType": return `${typeLabel(t.inner)}?`;
    case "UnionType": return t.types.map(typeLabel).join(" | ");
    case "ObjectType": {
      const fs = t.fields.map((f) => `${f.key}: ${typeLabel(f.valueType)}`).join(", ");
      return `{${fs}}`;
    }
    case "TupleType": return `[${t.elements.map(typeLabel).join(", ")}]`;
    default: return "unknown";
  }
}

// The four primitive named types we can check confidently in step 23.
const PRIM_NAMES = new Set(["Number", "String", "Boolean", "None"]);

function isPrimNamed(t) {
  return t != null && t.type === "NamedType" && PRIM_NAMES.has(t.name);
}

// Check that `actual` is compatible with `expected`.
// Throws TypeCheckError for clear primitive mismatches and Array<T> element
// mismatches.  Returns silently for anything it cannot determine.
function checkCompat(actual, expected) {
  if (!actual || !expected) return;

  // Defer complex expected types to later steps.
  if (expected.type === "NullableType" || expected.type === "UnionType") return;
  if (expected.type === "ObjectType" || expected.type === "TupleType") return;

  // Defer complex actual types.
  if (actual.type === "NullableType" || actual.type === "UnionType") return;

  // Primitive-to-primitive: exact name match required.
  if (isPrimNamed(actual) && isPrimNamed(expected)) {
    if (actual.name !== expected.name) {
      throw new TypeCheckError(
        `type mismatch: expected ${typeLabel(expected)}, got ${typeLabel(actual)}`
      );
    }
    return;
  }

  // Array<T>-to-Array<T>: check element types recursively.
  if (
    actual.type === "GenericType" &&
    expected.type === "GenericType" &&
    actual.name === expected.name
  ) {
    for (let i = 0; i < Math.min(actual.params.length, expected.params.length); i++) {
      checkCompat(actual.params[i], expected.params[i]);
    }
    return;
  }

  // Anything else (NamedType vs GenericType, etc.) — skip for now.
}

// Infer the static type of a literal or identifier expression.
// Returns a type node, or null if the type cannot be determined.
function inferType(node, env) {
  switch (node.type) {
    case "NumberLiteral":  return { type: "NamedType", name: "Number" };
    case "StringLiteral":  return { type: "NamedType", name: "String" };
    case "BooleanLiteral": return { type: "NamedType", name: "Boolean" };
    case "NoneLiteral":    return { type: "NamedType", name: "None" };
    case "Identifier":     return env.lookup(node.name);
    case "ArrayLiteral": {
      if (node.elements.length === 0) return null; // empty — element type unknown
      const first = node.elements[0];
      if (first.type === "SpreadElement") return null;
      const elemType = inferType(first, env);
      if (!elemType) return null;
      return { type: "GenericType", name: "Array", params: [elemType] };
    }
    default: return null;
  }
}

// Check an expression against an expected declared type, recursing into
// array literals element by element.
function checkExprAgainst(node, expected, env) {
  if (!expected) return;

  // Defer complex expected types.
  if (expected.type === "NullableType" || expected.type === "UnionType") return;
  if (expected.type === "ObjectType" || expected.type === "TupleType") return;

  switch (node.type) {
    case "NumberLiteral":
    case "StringLiteral":
    case "BooleanLiteral":
    case "NoneLiteral": {
      const actual = inferType(node, env);
      checkCompat(actual, expected);
      break;
    }
    case "ArrayLiteral": {
      if (expected.type === "GenericType" && expected.name === "Array") {
        const elemType = expected.params[0];
        for (const elem of node.elements) {
          if (elem.type !== "SpreadElement") {
            checkExprAgainst(elem, elemType, env);
          }
        }
      }
      break;
    }
    case "Identifier": {
      const actual = env.lookup(node.name);
      checkCompat(actual, expected);
      break;
    }
    default:
      break; // complex expression — cannot determine type yet
  }
}

// Process a block, giving it its own child scope.
function checkBlock(block, env) {
  const inner = new Env(env);
  for (const stmt of block.body) {
    checkStatement(stmt, inner);
  }
}

// Check an expression node for type errors (currently: assignments and
// function bodies that can appear in expression position).
function checkExpr(expr, env) {
  if (!expr) return;
  if (expr.type === "AssignmentExpression") {
    if (expr.left.type === "Identifier") {
      const declared = env.lookup(expr.left.name);
      if (declared) checkExprAgainst(expr.right, declared, env);
    }
  }
}

function checkStatement(stmt, env) {
  switch (stmt.type) {
    // Nodes that need no type checking.
    case "TypeAlias":
    case "ImportDeclaration":
    case "BreakStatement":
    case "ContinueStatement":
    case "ThrowStatement":
    case "ReturnStatement":
      break;

    case "ExportDeclaration":
      checkStatement(stmt.declaration, env);
      break;

    case "VarDeclaration": {
      const ann = stmt.typeAnnotation ?? null;
      checkExprAgainst(stmt.init, ann, env);
      const inferred = inferType(stmt.init, env);
      env.define(stmt.name, ann ?? inferred);
      break;
    }

    // Destructuring — skip type checking for now (step 25+).
    case "DestructureDeclaration":
      break;

    case "FunctionDeclaration": {
      const funcEnv = new Env(env);
      for (const p of stmt.params) {
        funcEnv.define(p.name, p.typeAnnotation ?? null);
      }
      checkBlock(stmt.body, funcEnv);
      break;
    }

    case "ExpressionStatement":
      checkExpr(stmt.expression, env);
      break;

    case "IfStatement":
      checkBlock(stmt.consequent, env);
      if (stmt.alternate) {
        if (stmt.alternate.type === "Block") {
          checkBlock(stmt.alternate, env);
        } else {
          checkStatement(stmt.alternate, env); // else-if chain
        }
      }
      break;

    case "WhileStatement":
    case "DoWhileStatement":
      checkBlock(stmt.body, env);
      break;

    case "ForStatement": {
      // The init VarDeclaration is in a scope that covers the body.
      const innerEnv = new Env(env);
      if (stmt.init && stmt.init.type === "VarDeclaration") {
        const ann = stmt.init.typeAnnotation ?? null;
        checkExprAgainst(stmt.init.init, ann, innerEnv);
        const inferred = inferType(stmt.init.init, innerEnv);
        innerEnv.define(stmt.init.name, ann ?? inferred);
      }
      checkBlock(stmt.body, innerEnv);
      break;
    }

    case "ForOfStatement": {
      const innerEnv = new Env(env);
      // Loop variable has unknown element type without iterable inference.
      if (stmt.variable) innerEnv.define(stmt.variable, null);
      checkBlock(stmt.body, innerEnv);
      break;
    }

    case "SwitchStatement": {
      for (const c of stmt.cases) {
        const caseEnv = new Env(env);
        for (const s of c.body) checkStatement(s, caseEnv);
      }
      break;
    }

    case "TryStatement": {
      checkBlock(stmt.block, env);
      if (stmt.handler) {
        const handlerEnv = new Env(env);
        handlerEnv.define(stmt.handler.param, stmt.handler.typeAnnotation ?? null);
        checkBlock(stmt.handler.body, handlerEnv);
      }
      if (stmt.finalizer) checkBlock(stmt.finalizer, env);
      break;
    }

    default:
      break;
  }
}

function typecheck(ast) {
  const env = new Env();
  for (const stmt of ast.body) {
    checkStatement(stmt, env);
  }
}

export { typecheck, TypeCheckError };
