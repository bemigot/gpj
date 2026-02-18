// Type-check pass: walks the AST after parsing and throws TypeCheckError on
// type mismatches.  Only checks what can be determined from literals and
// explicit annotations (steps 23-24 scope).
//
// Deferred to later steps:
//   - Union / nullable types (step 25)
//   - Object and tuple structural checking (step 25+)
//   - Type inference from binary expressions (step 24+)

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
    case "FunctionType": return `() => ${typeLabel(t.returnType)}`;
    default: return "unknown";
  }
}

// The four primitive named types we can check confidently.
const PRIM_NAMES = new Set(["Number", "String", "Boolean", "None"]);

function isPrimNamed(t) {
  return t != null && t.type === "NamedType" && PRIM_NAMES.has(t.name);
}

// Returns true when actual is assignable to expected; false for a clear
// mismatch.  Returns true (permissive) for anything that cannot be resolved yet.
function isCompat(actual, expected) {
  if (!actual || !expected) return true;

  // Union expected: compatible if actual matches any member.
  if (expected.type === "UnionType") {
    return expected.types.some((t) => isCompat(actual, t));
  }

  // Nullable T? is sugar for T | None.
  if (expected.type === "NullableType") {
    return (
      isCompat(actual, expected.inner) ||
      isCompat(actual, { type: "NamedType", name: "None" })
    );
  }

  // Defer complex expected types to later steps.
  if (expected.type === "ObjectType" || expected.type === "TupleType") return true;
  if (expected.type === "FunctionType") return true;

  // Defer complex actual types.
  if (actual.type === "NullableType" || actual.type === "UnionType") return true;
  if (actual.type === "FunctionType") return true;

  // Primitive-to-primitive: exact name match required.
  if (isPrimNamed(actual) && isPrimNamed(expected)) {
    return actual.name === expected.name;
  }

  // Array<T>-to-Array<T>: check element types recursively.
  if (
    actual.type === "GenericType" &&
    expected.type === "GenericType" &&
    actual.name === expected.name
  ) {
    for (let i = 0; i < Math.min(actual.params.length, expected.params.length); i++) {
      if (!isCompat(actual.params[i], expected.params[i])) return false;
    }
    return true;
  }

  // Anything else (NamedType vs GenericType, etc.) — skip for now.
  return true;
}

// Check that `actual` is compatible with `expected`.
// Throws TypeCheckError for clear mismatches; returns silently otherwise.
function checkCompat(actual, expected) {
  if (!actual || !expected) return;
  if (!isCompat(actual, expected)) {
    throw new TypeCheckError(
      `type mismatch: expected ${typeLabel(expected)}, got ${typeLabel(actual)}`
    );
  }
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
    case "CallExpression": {
      if (node.callee.type === "Identifier") {
        const fnType = env.lookup(node.callee.name);
        if (fnType && fnType.type === "FunctionType") return fnType.returnType;
      }
      return null;
    }
    default: return null;
  }
}

// Check an expression against an expected declared type, recursing into
// array literals element by element.
function checkExprAgainst(node, expected, env) {
  if (!expected) return;

  // Defer complex expected types (unions/nullables handled by checkCompat).
  if (expected.type === "ObjectType" || expected.type === "TupleType") return;
  if (expected.type === "FunctionType") return;

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
    case "CallExpression": {
      const actual = inferType(node, env);
      if (actual) checkCompat(actual, expected);
      break;
    }
    default:
      break; // complex expression — cannot determine type yet
  }
}

// Scan a block's statements for return statements (without recursing into
// nested function definitions) and infer the common return type.
// Returns null if types conflict or cannot be determined.
// Returns None-typed node if there are no return statements (implicit None).
function collectReturnType(block, env) {
  const NONE = { type: "NamedType", name: "None" };
  let result = undefined; // undefined = no return seen yet

  function merge(t) {
    if (result === undefined) {
      result = t;
    } else if (result !== null && t !== null && typeLabel(t) === typeLabel(result)) {
      // same type — keep
    } else {
      result = null; // conflicting or one is unknown
    }
  }

  function scan(stmts) {
    for (const stmt of stmts) {
      if (stmt.type === "ReturnStatement") {
        const t = stmt.argument ? inferType(stmt.argument, env) : NONE;
        merge(t);
      } else if (stmt.type === "IfStatement") {
        scan(stmt.consequent.body);
        if (stmt.alternate) {
          if (stmt.alternate.type === "Block") scan(stmt.alternate.body);
          else scan([stmt.alternate]);
        }
      } else if (
        stmt.type === "WhileStatement" ||
        stmt.type === "DoWhileStatement" ||
        stmt.type === "ForStatement" ||
        stmt.type === "ForOfStatement"
      ) {
        scan(stmt.body.body);
      } else if (stmt.type === "SwitchStatement") {
        for (const c of stmt.cases) scan(c.body);
      }
      // Skip FunctionDeclaration / ArrowFunction / FunctionExpression:
      // nested functions have their own return context.
    }
  }

  scan(block.body);
  return result === undefined ? NONE : result;
}

// Process any function-like node (FunctionDeclaration, FunctionExpression,
// ArrowFunction): check param/return annotations and the body, then return
// a FunctionType node representing the function's type.
function processFunctionLike(node, outerEnv) {
  const funcEnv = new Env(outerEnv);
  for (const p of node.params) {
    funcEnv.define(p.name, p.typeAnnotation ?? null);
  }
  const declaredReturn = node.returnType ?? null;

  if (node.body && node.body.type === "ExpressionBody") {
    // Arrow function with expression body — check and infer from the expression
    if (declaredReturn) {
      checkExprAgainst(node.body.expression, declaredReturn, funcEnv);
    }
    const inferred = declaredReturn ?? inferType(node.body.expression, funcEnv);
    return { type: "FunctionType", returnType: inferred };
  }

  // Block body
  checkBlock(node.body, funcEnv, declaredReturn);
  const inferred = declaredReturn ?? collectReturnType(node.body, funcEnv);
  return { type: "FunctionType", returnType: inferred };
}

// Process a block, giving it its own child scope.
// returnTypeCtx: the enclosing function's declared return type (or null).
function checkBlock(block, env, returnTypeCtx = null) {
  const inner = new Env(env);
  for (const stmt of block.body) {
    checkStatement(stmt, inner, returnTypeCtx);
  }
}

// Check an expression node for type errors (assignments in expression position).
function checkExpr(expr, env) {
  if (!expr) return;
  if (expr.type === "AssignmentExpression") {
    if (expr.left.type === "Identifier") {
      const declared = env.lookup(expr.left.name);
      if (declared) checkExprAgainst(expr.right, declared, env);
    }
  }
}

function checkStatement(stmt, env, returnTypeCtx = null) {
  switch (stmt.type) {
    // Nodes that need no type checking.
    case "TypeAlias":
    case "ImportDeclaration":
    case "BreakStatement":
    case "ContinueStatement":
    case "ThrowStatement":
      break;

    case "ReturnStatement": {
      if (returnTypeCtx === null) break;
      if (stmt.argument === null) {
        // bare return; — equivalent to return None;
        checkCompat({ type: "NamedType", name: "None" }, returnTypeCtx);
      } else {
        checkExprAgainst(stmt.argument, returnTypeCtx, env);
      }
      break;
    }

    case "ExportDeclaration":
      checkStatement(stmt.declaration, env, returnTypeCtx);
      break;

    case "VarDeclaration": {
      const ann = stmt.typeAnnotation ?? null;
      const init = stmt.init;

      // Function-like inits: process body, store FunctionType in env.
      if (init.type === "ArrowFunction" || init.type === "FunctionExpression") {
        const fnType = processFunctionLike(init, env);
        env.define(stmt.name, fnType);
        break;
      }

      checkExprAgainst(init, ann, env);
      const inferred = inferType(init, env);
      env.define(stmt.name, ann ?? inferred);
      break;
    }

    // Destructuring — skip type checking for now (step 25+).
    case "DestructureDeclaration":
      break;

    case "FunctionDeclaration": {
      const fnType = processFunctionLike(stmt, env);
      env.define(stmt.name, fnType);
      break;
    }

    case "ExpressionStatement":
      checkExpr(stmt.expression, env);
      break;

    case "IfStatement":
      checkBlock(stmt.consequent, env, returnTypeCtx);
      if (stmt.alternate) {
        if (stmt.alternate.type === "Block") {
          checkBlock(stmt.alternate, env, returnTypeCtx);
        } else {
          checkStatement(stmt.alternate, env, returnTypeCtx); // else-if chain
        }
      }
      break;

    case "WhileStatement":
    case "DoWhileStatement":
      checkBlock(stmt.body, env, returnTypeCtx);
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
      checkBlock(stmt.body, innerEnv, returnTypeCtx);
      break;
    }

    case "ForOfStatement": {
      const innerEnv = new Env(env);
      // Loop variable has unknown element type without iterable inference.
      if (stmt.variable) innerEnv.define(stmt.variable, null);
      checkBlock(stmt.body, innerEnv, returnTypeCtx);
      break;
    }

    case "SwitchStatement": {
      for (const c of stmt.cases) {
        const caseEnv = new Env(env);
        for (const s of c.body) checkStatement(s, caseEnv, returnTypeCtx);
      }
      break;
    }

    case "TryStatement": {
      checkBlock(stmt.block, env, returnTypeCtx);
      if (stmt.handler) {
        const handlerEnv = new Env(env);
        handlerEnv.define(stmt.handler.param, stmt.handler.typeAnnotation ?? null);
        checkBlock(stmt.handler.body, handlerEnv, returnTypeCtx);
      }
      if (stmt.finalizer) checkBlock(stmt.finalizer, env, returnTypeCtx);
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
