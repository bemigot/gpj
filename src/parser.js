"use strict";

const { TokenType } = require("./lexer");

class ParseError extends Error {
  constructor(message, token) {
    const loc = token ? ` at ${token.line}:${token.col}` : "";
    super(`${message}${loc}`);
    this.token = token;
  }
}

function parse(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function advance() {
    return tokens[pos++];
  }

  function expect(type, contextMsg) {
    const tok = peek();
    if (tok.type !== type) {
      throw new ParseError(
        `Expected ${type} but got ${tok.type}(${JSON.stringify(tok.value)})${contextMsg ? " — " + contextMsg : ""}`,
        tok
      );
    }
    return advance();
  }

  function parseProgram() {
    const body = [];
    while (peek().type !== TokenType.EOF) {
      body.push(parseStatement());
    }
    return { type: "Program", body };
  }

  function parseStatement() {
    const tok = peek();

    switch (tok.type) {
      case TokenType.IMPORT:
        return parseImportDeclaration();
      case TokenType.EXPORT:
        return parseExportDeclaration();
      case TokenType.LET:
      case TokenType.VAL:
        return parseVarDeclaration();
      case TokenType.FUNCTION:
        return parseFunctionDeclaration();
      case TokenType.RETURN:
        return parseReturnStatement();
      case TokenType.IF:
        return parseIfStatement();
      case TokenType.WHILE:
        return parseWhileStatement();
      case TokenType.FOR:
        return parseForStatement();
      case TokenType.BREAK:
        advance();
        expect(TokenType.SEMICOLON);
        return { type: "BreakStatement" };
      case TokenType.CONTINUE:
        advance();
        expect(TokenType.SEMICOLON);
        return { type: "ContinueStatement" };
      default:
        return parseExpressionStatement();
    }
  }

  function parseExpressionStatement() {
    const expr = parseExpression();
    expect(TokenType.SEMICOLON);
    return { type: "ExpressionStatement", expression: expr };
  }

  function parseExpression() {
    return parseAssignment();
  }

  function parseAssignment() {
    const left = parseTernary();

    if (peek().type === TokenType.ASSIGN) {
      advance();
      const right = parseExpression();
      return { type: "AssignmentExpression", left, right };
    }

    return left;
  }

  function parseTernary() {
    const test = parseBinaryOrLogical();

    if (peek().type === TokenType.QUESTION) {
      advance();
      const consequent = parseExpression();
      expect(TokenType.COLON, "expected ':' in ternary expression");
      const alternate = parseExpression();
      return { type: "TernaryExpression", test, consequent, alternate };
    }

    return test;
  }

  // Binary operator token → operator string (no precedence — §8)
  const BINARY_OPS = new Map([
    [TokenType.OR,       "||"],
    [TokenType.AND,      "&&"],
    [TokenType.EQ,       "=="],
    [TokenType.NEQ,      "!="],
    [TokenType.LT,       "<"],
    [TokenType.GT,       ">"],
    [TokenType.LTE,      "<="],
    [TokenType.GTE,      ">="],
    [TokenType.PLUS,     "+"],
    [TokenType.MINUS,    "-"],
    [TokenType.STAR,     "*"],
    [TokenType.SLASH,    "/"],
    [TokenType.PERCENT,  "%"],
    [TokenType.STARSTAR, "**"],
    [TokenType.NULLISH,  "??"],
  ]);

  const COMPARISON_OPS = new Set(["==", "!=", "<", ">", "<=", ">="]);

  function parseBinaryOrLogical() {
    let left = parseUnary();

    const op = BINARY_OPS.get(peek().type);
    if (op === undefined) return left;

    // First binary operator — start a chain
    advance();
    let right = parseUnary();
    left = { type: "BinaryExpression", operator: op, left, right };

    // Comparison operators cannot chain at all (§8)
    if (COMPARISON_OPS.has(op)) {
      const next = BINARY_OPS.get(peek().type);
      if (next !== undefined) {
        throw new ParseError(
          `Cannot follow ${op} with ${next} — use parentheses to clarify`,
          peek()
        );
      }
      return left;
    }

    // Same-operator chaining: left-associative
    while (true) {
      const next = BINARY_OPS.get(peek().type);
      if (next === undefined) break;
      if (next !== op) {
        throw new ParseError(
          `Cannot mix ${op} and ${next} without parentheses`,
          peek()
        );
      }
      advance();
      right = parseUnary();
      left = { type: "BinaryExpression", operator: op, left, right };
    }

    return left;
  }

  function parseUnary() {
    const tok = peek();

    if (tok.type === TokenType.NOT) {
      advance();
      const argument = parseUnary();
      return { type: "UnaryExpression", operator: "!", argument };
    }

    if (tok.type === TokenType.MINUS) {
      advance();
      const argument = parseUnary();
      return { type: "UnaryExpression", operator: "-", argument };
    }

    if (tok.type === TokenType.TYPEOF) {
      advance();
      const argument = parseUnary();
      return { type: "TypeofExpression", argument };
    }

    return parseCallMember();
  }

  function parseCallMember() {
    let node = parsePrimary();

    while (true) {
      if (peek().type === TokenType.DOT) {
        advance();
        const prop = expect(TokenType.IDENTIFIER, "expected property name after '.'");
        node = { type: "MemberExpression", object: node, property: prop.value };
      } else if (peek().type === TokenType.LBRACKET) {
        advance();
        const index = parseExpression();
        expect(TokenType.RBRACKET, "expected ']'");
        node = { type: "ComputedMemberExpression", object: node, index };
      } else if (peek().type === TokenType.LPAREN) {
        advance();
        const args = [];
        if (peek().type !== TokenType.RPAREN) {
          args.push(parseExpression());
          while (peek().type === TokenType.COMMA) {
            advance();
            args.push(parseExpression());
          }
        }
        expect(TokenType.RPAREN, "expected ')'");
        node = { type: "CallExpression", callee: node, arguments: args };
      } else {
        break;
      }
    }

    return node;
  }

  function tryParseArrowFunction() {
    const saved = pos;
    try {
      advance(); // (
      const params = [];
      if (peek().type !== TokenType.RPAREN) {
        params.push(parseParam());
        while (peek().type === TokenType.COMMA) {
          advance();
          params.push(parseParam());
        }
      }
      if (peek().type !== TokenType.RPAREN) { pos = saved; return null; }
      advance(); // )
      // Optional return type annotation
      if (peek().type === TokenType.COLON) {
        advance();
        skipTypeAnnotation();
      }
      if (peek().type !== TokenType.ARROW) { pos = saved; return null; }
      advance(); // =>
      // Block body or expression body
      let body;
      if (peek().type === TokenType.LBRACE) {
        body = parseBlock();
      } else {
        body = { type: "ExpressionBody", expression: parseExpression() };
      }
      return { type: "ArrowFunction", params, body };
    } catch (e) {
      pos = saved;
      return null;
    }
  }

  function parsePrimary() {
    const tok = peek();

    switch (tok.type) {
      case TokenType.NUMBER:
        advance();
        return { type: "NumberLiteral", value: tok.value };
      case TokenType.STRING:
        advance();
        return { type: "StringLiteral", value: tok.value };
      case TokenType.BOOLEAN:
        advance();
        return { type: "BooleanLiteral", value: tok.value === "true" };
      case TokenType.NONE:
        advance();
        return { type: "NoneLiteral" };
      case TokenType.IDENTIFIER:
        advance();
        return { type: "Identifier", name: tok.value };
      case TokenType.THIS:
        advance();
        return { type: "ThisExpression" };
      case TokenType.LPAREN: {
        const arrow = tryParseArrowFunction();
        if (arrow) return arrow;
        advance();
        const expr = parseExpression();
        expect(TokenType.RPAREN, "expected ')'");
        return expr;
      }
      case TokenType.FUNCTION: {
        // Function expression (anonymous) — only if NOT at statement level
        // Statement-level is handled in parseStatement, so if we get here
        // it's an expression position.
        advance(); // function
        expect(TokenType.LPAREN, "expected '('");
        const feParams = parseParamList();
        expect(TokenType.RPAREN, "expected ')'");
        if (peek().type === TokenType.COLON) {
          advance();
          skipTypeAnnotation();
        }
        const feBody = parseBlock();
        return { type: "FunctionExpression", params: feParams, body: feBody };
      }
      case TokenType.LBRACKET:
        return parseArrayLiteral();
      case TokenType.LBRACE:
        return parseObjectLiteral();
      default:
        throw new ParseError(`Unexpected token ${tok.type}(${JSON.stringify(tok.value)})`, tok);
    }
  }

  function parseArrayLiteral() {
    advance(); // [
    const elements = [];
    if (peek().type !== TokenType.RBRACKET) {
      elements.push(parseExpression());
      while (peek().type === TokenType.COMMA) {
        advance();
        elements.push(parseExpression());
      }
    }
    expect(TokenType.RBRACKET, "expected ']'");
    return { type: "ArrayLiteral", elements };
  }

  function parseObjectLiteral() {
    advance(); // {
    const properties = [];
    if (peek().type !== TokenType.RBRACE) {
      properties.push(parseProperty());
      while (peek().type === TokenType.COMMA) {
        advance();
        properties.push(parseProperty());
      }
    }
    expect(TokenType.RBRACE, "expected '}'");
    return { type: "ObjectLiteral", properties };
  }

  function parseProperty() {
    const key = expect(TokenType.IDENTIFIER, "expected property name");
    if (peek().type === TokenType.COLON) {
      advance();
      const value = parseExpression();
      return { type: "Property", key: key.value, value };
    }
    // Shorthand: { x } means { x: x }
    return { type: "Property", key: key.value, value: { type: "Identifier", name: key.value } };
  }

  function parseImportDeclaration() {
    advance(); // import
    const specifiers = [];

    if (peek().type === TokenType.STAR) {
      // import * as local from "path";
      advance(); // *
      expect(TokenType.AS, "expected 'as' after '*'");
      const local = expect(TokenType.IDENTIFIER, "expected alias name");
      specifiers.push({ type: "ImportNamespaceSpecifier", local: local.value });
    } else {
      // import foo, bar as b from "path";
      specifiers.push(parseImportSpecifier());
      while (peek().type === TokenType.COMMA) {
        advance();
        specifiers.push(parseImportSpecifier());
      }
    }

    expect(TokenType.FROM, "expected 'from'");
    const source = expect(TokenType.STRING, "expected module path string");
    expect(TokenType.SEMICOLON);
    return { type: "ImportDeclaration", specifiers, source: source.value };
  }

  function parseImportSpecifier() {
    const imported = expect(TokenType.IDENTIFIER, "expected import name");
    let local = imported.value;
    if (peek().type === TokenType.AS) {
      advance();
      const alias = expect(TokenType.IDENTIFIER, "expected alias name");
      local = alias.value;
    }
    return { type: "ImportSpecifier", imported: imported.value, local };
  }

  function parseExportDeclaration() {
    advance(); // export
    let declaration;
    if (peek().type === TokenType.FUNCTION) {
      declaration = parseFunctionDeclaration();
    } else if (peek().type === TokenType.LET || peek().type === TokenType.VAL) {
      declaration = parseVarDeclaration();
    } else {
      throw new ParseError(
        "Expected function, let, or val after 'export'",
        peek()
      );
    }
    return { type: "ExportDeclaration", declaration };
  }

  function parseVarDeclaration() {
    const kind = advance(); // let or val
    const name = expect(TokenType.IDENTIFIER, "expected variable name");
    // Skip type annotation for now
    if (peek().type === TokenType.COLON) {
      advance();
      skipTypeAnnotation();
    }
    expect(TokenType.ASSIGN, "expected '=' in declaration");
    const init = parseExpression();
    expect(TokenType.SEMICOLON);
    return {
      type: "VarDeclaration",
      kind: kind.value,
      name: name.value,
      init,
    };
  }

  function skipTypeAnnotation() {
    // Consume type tokens until we hit something that's clearly not a type.
    // This is a rough skip — enough to get past `Number`, `String`,
    // `Array<Number>`, `{x: Number}`, `[Number, String]`, `Number?`, etc.
    //
    // Delimiters (<>, {}, []) are depth-tracked so their inner tokens
    // (including `,` and `:`) are consumed only inside matched pairs.
    // At the top level only identifiers and `?` are consumed — this
    // prevents eating `,` between function params or `{` of a block body.
    let angleDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;
    let count = 0; // top-level type tokens consumed
    while (true) {
      const t = peek();
      // Angle brackets: Array<Number>, Map<K, V>
      if (t.type === TokenType.LT) { angleDepth++; advance(); count++; continue; }
      if (t.type === TokenType.GT && angleDepth > 0) { angleDepth--; advance(); continue; }
      if (angleDepth > 0) { advance(); continue; }
      // Braces: structural types {x: Number} — only open at start or nested
      if (t.type === TokenType.LBRACE && (braceDepth > 0 || count === 0)) { braceDepth++; advance(); count++; continue; }
      if (t.type === TokenType.RBRACE && braceDepth > 0) { braceDepth--; advance(); continue; }
      if (braceDepth > 0) { advance(); continue; }
      // Brackets: tuple types [Number, String]
      if (t.type === TokenType.LBRACKET) { bracketDepth++; advance(); count++; continue; }
      if (t.type === TokenType.RBRACKET && bracketDepth > 0) { bracketDepth--; advance(); continue; }
      if (bracketDepth > 0) { advance(); continue; }
      // Top-level: identifiers (type names) and ? (nullable)
      if (t.type === TokenType.IDENTIFIER || t.type === TokenType.QUESTION) {
        advance();
        count++;
        continue;
      }
      break;
    }
  }

  function parseFunctionDeclaration() {
    advance(); // function
    const name = expect(TokenType.IDENTIFIER, "expected function name");
    expect(TokenType.LPAREN, "expected '('");
    const params = parseParamList();
    expect(TokenType.RPAREN, "expected ')'");
    // Skip return type annotation
    if (peek().type === TokenType.COLON) {
      advance();
      skipTypeAnnotation();
    }
    const body = parseBlock();
    return { type: "FunctionDeclaration", name: name.value, params, body };
  }

  function parseParamList() {
    const params = [];
    if (peek().type === TokenType.RPAREN) return params;
    params.push(parseParam());
    while (peek().type === TokenType.COMMA) {
      advance();
      params.push(parseParam());
    }
    return params;
  }

  function parseParam() {
    const name = expect(TokenType.IDENTIFIER, "expected parameter name");
    if (peek().type === TokenType.COLON) {
      advance();
      skipTypeAnnotation();
    }
    return { name: name.value };
  }

  function parseBlock() {
    expect(TokenType.LBRACE, "expected '{'");
    const body = [];
    while (peek().type !== TokenType.RBRACE) {
      body.push(parseStatement());
    }
    expect(TokenType.RBRACE, "expected '}'");
    return { type: "Block", body };
  }

  function parseReturnStatement() {
    advance(); // return
    if (peek().type === TokenType.SEMICOLON) {
      advance();
      return { type: "ReturnStatement", argument: null };
    }
    const argument = parseExpression();
    expect(TokenType.SEMICOLON);
    return { type: "ReturnStatement", argument };
  }

  function parseIfStatement() {
    advance(); // if
    expect(TokenType.LPAREN, "expected '('");
    const test = parseExpression();
    expect(TokenType.RPAREN, "expected ')'");
    const consequent = parseBlock();
    let alternate = null;
    if (peek().type === TokenType.ELSE) {
      advance();
      if (peek().type === TokenType.IF) {
        alternate = parseIfStatement();
      } else {
        alternate = parseBlock();
      }
    }
    return { type: "IfStatement", test, consequent, alternate };
  }

  function parseWhileStatement() {
    advance(); // while
    expect(TokenType.LPAREN, "expected '('");
    const test = parseExpression();
    expect(TokenType.RPAREN, "expected ')'");
    const body = parseBlock();
    return { type: "WhileStatement", test, body };
  }

  function parseForStatement() {
    advance(); // for
    expect(TokenType.LPAREN, "expected '('");
    // for...of or C-style for — detect by looking ahead
    // For now, support for...of: for (let x of expr)
    if (peek().type === TokenType.LET || peek().type === TokenType.VAL) {
      const kind = advance();
      const name = expect(TokenType.IDENTIFIER, "expected variable name");
      if (peek().type === TokenType.OF) {
        advance(); // of
        const iterable = parseExpression();
        expect(TokenType.RPAREN, "expected ')'");
        const body = parseBlock();
        return {
          type: "ForOfStatement",
          kind: kind.value,
          variable: name.value,
          iterable,
          body,
        };
      }
    }
    throw new ParseError("Only for...of loops are supported currently", peek());
  }

  return parseProgram();
}

module.exports = { parse, ParseError };
