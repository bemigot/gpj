"use strict";

const { GPJ_ADD_SRC, GPJ_ARITH_SRC } = require("./gpj_runtime");

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

let usedHelpers;

function generate(node) {
  switch (node.type) {
    case "Program": {
      usedHelpers = new Set();
      const body = node.body.map(generate).join("\n");
      const preamble = [];
      if (usedHelpers.has("add")) preamble.push(GPJ_ADD_SRC);
      if (usedHelpers.has("arith")) preamble.push(GPJ_ARITH_SRC);
      return preamble.length ? preamble.join("\n") + "\n" + body : body;
    }

    case "ExpressionStatement":
      return generate(node.expression) + ";";

    case "CallExpression": {
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

    case "NumberLiteral":
      return node.value;

    case "StringLiteral":
      return JSON.stringify(node.value);

    case "BooleanLiteral":
      return node.value ? "true" : "false";

    case "NoneLiteral":
      return "null";

    case "ArrayLiteral":
      return `[${node.elements.map(generate).join(", ")}]`;

    case "ObjectLiteral": {
      const props = node.properties.map((p) => {
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
      const params = node.params.map((p) => p.name).join(", ");
      const body = generateBlock(node.body);
      return `function ${node.name}(${params}) ${body}`;
    }

    case "ArrowFunction": {
      const params = node.params.map((p) => p.name).join(", ");
      if (node.body.type === "ExpressionBody") {
        return `((${params}) => ${generate(node.body.expression)})`;
      }
      return `((${params}) => ${generateBlock(node.body)})`;
    }

    case "FunctionExpression": {
      const params = node.params.map((p) => p.name).join(", ");
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

    case "ForOfStatement": {
      const jsKind = node.kind === "val" ? "const" : "let";
      return `for (${jsKind} ${node.variable} of ${generate(node.iterable)}) ${generateBlock(node.body)}`;
    }

    case "BreakStatement":
      return "break;";

    case "ContinueStatement":
      return "continue;";

    case "AssignmentExpression":
      return `${generate(node.left)} = ${generate(node.right)}`;

    case "TernaryExpression":
      return `(${generate(node.test)} ? ${generate(node.consequent)} : ${generate(node.alternate)})`;

    case "UnaryExpression":
      return `${node.operator}${generate(node.argument)}`;

    case "TypeofExpression":
      return `typeof ${generate(node.argument)}`;

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
          return `(${left} === ${right})`;
        case "!=":
          return `(${left} !== ${right})`;
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

module.exports = { generate, CodegenError };
