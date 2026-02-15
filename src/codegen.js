"use strict";

class CodegenError extends Error {
  constructor(message, node) {
    super(message);
    this.node = node;
  }
}

function generate(node) {
  switch (node.type) {
    case "Program":
      return node.body.map(generate).join("\n");

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
      const freeze = node.kind === "val" ? `\n${node.name} = Object.freeze(${node.name});` : "";
      // For val, we need to freeze non-primitives. But for step 0, simple const suffices.
      // We'll add freeze logic when we implement val semantics properly.
      return `${jsKind} ${node.name} = ${init};`;
    }

    case "FunctionDeclaration": {
      const params = node.params.map((p) => p.name).join(", ");
      const body = generateBlock(node.body);
      return `function ${node.name}(${params}) ${body}`;
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
