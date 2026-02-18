import { TokenType, lex } from "./lexer.js";
// Type AST node shapes (all produced by parseTypeAnnotation):
//   NamedType    { name }
//   GenericType  { name, params: TypeNode[] }
//   ObjectType   { fields: { key, valueType }[] }
//   TupleType    { elements: TypeNode[] }
//   UnionType    { types: TypeNode[] }
//   NullableType { inner: TypeNode }   (sugar for T | None)

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
      case TokenType.TYPE:
        return parseTypeAlias();
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
      case TokenType.THROW:
        return parseThrowStatement();
      case TokenType.TRY:
        return parseTryStatement();
      case TokenType.DO:
        return parseDoWhileStatement();
      case TokenType.SWITCH:
        return parseSwitchStatement();
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

  const COMPOUND_ASSIGN_OPS = new Map([
    [TokenType.PLUS_ASSIGN, "+="],
    [TokenType.MINUS_ASSIGN, "-="],
    [TokenType.STAR_ASSIGN, "*="],
    [TokenType.SLASH_ASSIGN, "/="],
    [TokenType.PERCENT_ASSIGN, "%="],
    [TokenType.STARSTAR_ASSIGN, "**="],
  ]);

  function parseAssignment() {
    const left = parseTernary();

    if (peek().type === TokenType.ASSIGN) {
      const tok = peek();
      requireSpaceAround(tok, "=");
      advance();
      requireSpaceAfter("=", peek());
      const right = parseExpression();
      return { type: "AssignmentExpression", left, right };
    }

    const compoundOp = COMPOUND_ASSIGN_OPS.get(peek().type);
    if (compoundOp !== undefined) {
      const tok = peek();
      requireSpaceAround(tok, compoundOp);
      advance();
      requireSpaceAfter(compoundOp, peek());
      const right = parseExpression();
      return { type: "CompoundAssignment", operator: compoundOp, left, right };
    }

    return left;
  }

  function parseTernary() {
    const test = parseBinaryOrLogical();

    if (peek().type === TokenType.QUESTION) {
      const qTok = peek();
      if (!qTok.spaceBefore) throw new ParseError("'?' must be preceded by a space", qTok);
      advance();
      if (!peek().spaceBefore) throw new ParseError("'?' must be followed by a space", peek());
      const consequent = parseExpression();
      const colonTok = peek();
      if (!colonTok.spaceBefore) throw new ParseError("':' must be preceded by a space", colonTok);
      expect(TokenType.COLON, "expected ':' in ternary expression");
      if (!peek().spaceBefore) throw new ParseError("':' must be followed by a space", peek());
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

  function requireSpaceAround(tok, label) {
    if (!tok.spaceBefore)
      throw new ParseError(`'${label}' must be preceded by a space`, tok);
  }

  function requireSpaceAfter(label, tok) {
    if (!tok.spaceBefore)
      throw new ParseError(`'${label}' must be followed by a space`, tok);
  }

  function parseBinaryOrLogical() {
    let left = parseUnary();

    const opTok = peek();
    const op = BINARY_OPS.get(opTok.type);
    if (op === undefined) return left;

    requireSpaceAround(opTok, op);
    // First binary operator — start a chain
    advance();
    requireSpaceAfter(op, peek());
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
      const nextTok = peek();
      const next = BINARY_OPS.get(nextTok.type);
      if (next === undefined) break;
      requireSpaceAround(nextTok, next);
      if (next !== op) {
        throw new ParseError(
          `Cannot mix ${op} and ${next} without parentheses`,
          nextTok
        );
      }
      advance();
      requireSpaceAfter(next, peek());
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
          args.push(parseArgument());
          while (peek().type === TokenType.COMMA) {
            advance();
            args.push(parseArgument());
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
      let arrowReturnType = null;
      if (peek().type === TokenType.COLON) {
        advance();
        arrowReturnType = parseTypeAnnotation();
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
      return { type: "ArrowFunction", params, returnType: arrowReturnType, body };
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
        const feReturnType = peek().type === TokenType.COLON ? (advance(), parseTypeAnnotation()) : null;
        const feBody = parseBlock();
        return { type: "FunctionExpression", params: feParams, returnType: feReturnType, body: feBody };
      }
      case TokenType.FSTRING: {
        advance();
        const parts = tok.value;
        const quasis = [];
        const expressions = [];
        let currentText = "";
        for (const part of parts) {
          if (part.type === "text") {
            currentText += part.value;
          } else {
            quasis.push(currentText);
            currentText = "";
            const exprTokens = lex(part.value + ";");
            const exprProgram = parse(exprTokens);
            expressions.push(exprProgram.body[0].expression);
          }
        }
        quasis.push(currentText);
        return { type: "TemplateLiteral", quasis, expressions };
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
      elements.push(parseArrayElement());
      while (peek().type === TokenType.COMMA) {
        advance();
        elements.push(parseArrayElement());
      }
    }
    expect(TokenType.RBRACKET, "expected ']'");
    return { type: "ArrayLiteral", elements };
  }

  function parseArrayElement() {
    if (peek().type === TokenType.SPREAD) {
      advance();
      return { type: "SpreadElement", argument: parseExpression() };
    }
    return parseExpression();
  }

  function parseArgument() {
    if (peek().type === TokenType.SPREAD) {
      advance();
      return { type: "SpreadElement", argument: parseExpression() };
    }
    return parseExpression();
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
    if (peek().type === TokenType.SPREAD) {
      advance();
      return { type: "SpreadElement", argument: parseExpression() };
    }
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

  function parseTypeAlias() {
    advance(); // type
    const name = expect(TokenType.IDENTIFIER, "expected type name").value;
    // Optional generic parameters: type Pair<K, V> = ...
    let params = [];
    if (peek().type === TokenType.LT) {
      advance(); // <
      params.push(expect(TokenType.IDENTIFIER, "expected type parameter name").value);
      while (peek().type === TokenType.COMMA) {
        advance();
        params.push(expect(TokenType.IDENTIFIER, "expected type parameter name").value);
      }
      expect(TokenType.GT, "expected '>'");
    }
    expect(TokenType.ASSIGN, "expected '='");
    const typeExpr = parseTypeAnnotation();
    expect(TokenType.SEMICOLON);
    return { type: "TypeAlias", name, params, typeExpr };
  }

  function parseVarDeclaration() {
    const kind = advance(); // let or val

    // Destructuring: let {x, y} = ... or let [a, b] = ...
    if (peek().type === TokenType.LBRACE) {
      const pattern = parseObjectPattern();
      const typeAnnotation = peek().type === TokenType.COLON ? (advance(), parseTypeAnnotation()) : null;
      expect(TokenType.ASSIGN, "expected '=' in declaration");
      const init = parseExpression();
      expect(TokenType.SEMICOLON);
      return { type: "DestructureDeclaration", kind: kind.value, pattern, typeAnnotation, init };
    }

    if (peek().type === TokenType.LBRACKET) {
      const pattern = parseArrayPattern();
      const typeAnnotation = peek().type === TokenType.COLON ? (advance(), parseTypeAnnotation()) : null;
      expect(TokenType.ASSIGN, "expected '=' in declaration");
      const init = parseExpression();
      expect(TokenType.SEMICOLON);
      return { type: "DestructureDeclaration", kind: kind.value, pattern, typeAnnotation, init };
    }

    const name = expect(TokenType.IDENTIFIER, "expected variable name");
    const typeAnnotation = peek().type === TokenType.COLON ? (advance(), parseTypeAnnotation()) : null;
    expect(TokenType.ASSIGN, "expected '=' in declaration");
    const init = parseExpression();
    expect(TokenType.SEMICOLON);
    return {
      type: "VarDeclaration",
      kind: kind.value,
      name: name.value,
      typeAnnotation,
      init,
    };
  }

  function parseObjectPattern() {
    advance(); // {
    const properties = [];
    if (peek().type !== TokenType.RBRACE) {
      properties.push(parsePatternProperty());
      while (peek().type === TokenType.COMMA) {
        advance();
        properties.push(parsePatternProperty());
      }
    }
    expect(TokenType.RBRACE, "expected '}'");
    return { type: "ObjectPattern", properties };
  }

  function parsePatternProperty() {
    if (peek().type === TokenType.SPREAD) {
      advance();
      const name = expect(TokenType.IDENTIFIER, "expected identifier after '...'");
      return { type: "RestElement", name: name.value };
    }
    const key = expect(TokenType.IDENTIFIER, "expected property name");
    if (peek().type === TokenType.COLON) {
      advance();
      // Could be a rename (identifier) or nested pattern ({...} or [...])
      if (peek().type === TokenType.LBRACE) {
        const pattern = parseObjectPattern();
        return { type: "PatternProperty", key: key.value, value: pattern };
      }
      if (peek().type === TokenType.LBRACKET) {
        const pattern = parseArrayPattern();
        return { type: "PatternProperty", key: key.value, value: pattern };
      }
      const alias = expect(TokenType.IDENTIFIER, "expected alias name");
      return { type: "PatternProperty", key: key.value, alias: alias.value };
    }
    return { type: "PatternProperty", key: key.value };
  }

  function parseArrayPattern() {
    advance(); // [
    const elements = [];
    if (peek().type !== TokenType.RBRACKET) {
      elements.push(parsePatternElement());
      while (peek().type === TokenType.COMMA) {
        advance();
        elements.push(parsePatternElement());
      }
    }
    expect(TokenType.RBRACKET, "expected ']'");
    return { type: "ArrayPattern", elements };
  }

  function parsePatternElement() {
    if (peek().type === TokenType.SPREAD) {
      advance();
      const name = expect(TokenType.IDENTIFIER, "expected identifier after '...'");
      return { type: "RestElement", name: name.value };
    }
    if (peek().type === TokenType.LBRACE) {
      return parseObjectPattern();
    }
    if (peek().type === TokenType.LBRACKET) {
      return parseArrayPattern();
    }
    const name = expect(TokenType.IDENTIFIER, "expected variable name");
    return { type: "PatternIdentifier", name: name.value };
  }

  // --- type annotation parsing ---

  function parseTypeAnnotation() {
    const first = parseNullableType();
    if (peek().type !== TokenType.PIPE) return first;
    const types = [first];
    while (peek().type === TokenType.PIPE) {
      advance(); // |
      types.push(parseNullableType());
    }
    return { type: "UnionType", types };
  }

  function parseNullableType() {
    const t = parseBaseType();
    if (peek().type === TokenType.QUESTION) {
      advance();
      return { type: "NullableType", inner: t };
    }
    return t;
  }

  function parseBaseType() {
    const tok = peek();
    if (tok.type === TokenType.LBRACE) return parseObjectType();
    if (tok.type === TokenType.LBRACKET) return parseTupleType();
    if (tok.type === TokenType.NONE) {
      advance();
      return { type: "NamedType", name: "None" };
    }
    if (tok.type === TokenType.IDENTIFIER) {
      const name = advance().value;
      if (peek().type === TokenType.LT) {
        advance(); // <
        const params = [parseTypeAnnotation()];
        while (peek().type === TokenType.COMMA) {
          advance();
          params.push(parseTypeAnnotation());
        }
        expect(TokenType.GT, "expected '>' in generic type");
        return { type: "GenericType", name, params };
      }
      return { type: "NamedType", name };
    }
    throw new ParseError(`Expected type, got ${tok.type}(${JSON.stringify(tok.value)})`, tok);
  }

  function parseObjectType() {
    advance(); // {
    const fields = [];
    while (peek().type !== TokenType.RBRACE) {
      const key = expect(TokenType.IDENTIFIER, "expected field name in object type");
      expect(TokenType.COLON, "expected ':' after field name in object type");
      const valueType = parseTypeAnnotation();
      fields.push({ key: key.value, valueType });
      if (peek().type === TokenType.COMMA) advance();
    }
    expect(TokenType.RBRACE, "expected '}' to close object type");
    return { type: "ObjectType", fields };
  }

  function parseTupleType() {
    advance(); // [
    const elements = [];
    if (peek().type !== TokenType.RBRACKET) {
      elements.push(parseTypeAnnotation());
      while (peek().type === TokenType.COMMA) {
        advance();
        elements.push(parseTypeAnnotation());
      }
    }
    expect(TokenType.RBRACKET, "expected ']' to close tuple type");
    return { type: "TupleType", elements };
  }

  function parseFunctionDeclaration() {
    advance(); // function
    const name = expect(TokenType.IDENTIFIER, "expected function name");
    expect(TokenType.LPAREN, "expected '('");
    const params = parseParamList();
    expect(TokenType.RPAREN, "expected ')'");
    const returnType = peek().type === TokenType.COLON ? (advance(), parseTypeAnnotation()) : null;
    const body = parseBlock();
    return { type: "FunctionDeclaration", name: name.value, params, returnType, body };
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
    if (peek().type === TokenType.SPREAD) {
      advance();
      const name = expect(TokenType.IDENTIFIER, "expected parameter name after '...'");
      const typeAnnotation = peek().type === TokenType.COLON ? (advance(), parseTypeAnnotation()) : null;
      return { name: name.value, rest: true, typeAnnotation };
    }
    const name = expect(TokenType.IDENTIFIER, "expected parameter name");
    const typeAnnotation = peek().type === TokenType.COLON ? (advance(), parseTypeAnnotation()) : null;
    return { name: name.value, typeAnnotation };
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

  function parseThrowStatement() {
    advance(); // throw
    const argument = parseExpression();
    expect(TokenType.SEMICOLON);
    return { type: "ThrowStatement", argument };
  }

  function parseTryStatement() {
    advance(); // try
    const block = parseBlock();
    let handler = null;
    let finalizer = null;

    if (peek().type === TokenType.CATCH) {
      advance(); // catch
      expect(TokenType.LPAREN, "expected '(' after catch");
      const param = expect(TokenType.IDENTIFIER, "expected catch parameter name");
      const catchType = peek().type === TokenType.COLON ? (advance(), parseTypeAnnotation()) : null;
      expect(TokenType.RPAREN, "expected ')'");
      const body = parseBlock();
      handler = { param: param.value, typeAnnotation: catchType, body };
    }

    if (peek().type === TokenType.FINALLY) {
      advance(); // finally
      finalizer = parseBlock();
    }

    if (!handler && !finalizer) {
      throw new ParseError("try must have catch or finally", peek());
    }

    return { type: "TryStatement", block, handler, finalizer };
  }

  function parseWhileStatement() {
    advance(); // while
    expect(TokenType.LPAREN, "expected '('");
    const test = parseExpression();
    expect(TokenType.RPAREN, "expected ')'");
    const body = parseBlock();
    return { type: "WhileStatement", test, body };
  }

  function parseDoWhileStatement() {
    advance(); // do
    const body = parseBlock();
    expect(TokenType.WHILE, "expected 'while' after do block");
    expect(TokenType.LPAREN, "expected '('");
    const test = parseExpression();
    expect(TokenType.RPAREN, "expected ')'");
    expect(TokenType.SEMICOLON);
    return { type: "DoWhileStatement", body, test };
  }

  function parseSwitchStatement() {
    advance(); // switch
    expect(TokenType.LPAREN, "expected '('");
    const discriminant = parseExpression();
    expect(TokenType.RPAREN, "expected ')'");
    expect(TokenType.LBRACE, "expected '{'");

    const cases = [];
    while (peek().type !== TokenType.RBRACE) {
      if (peek().type === TokenType.CASE) {
        advance(); // case
        const test = parseExpression();
        expect(TokenType.COLON, "expected ':' after case value");
        const body = [];
        while (
          peek().type !== TokenType.CASE &&
          peek().type !== TokenType.RBRACE &&
          !(peek().type === TokenType.IDENTIFIER && peek().value === "default")
        ) {
          body.push(parseStatement());
        }
        cases.push({ type: "SwitchCase", test, body });
      } else if (peek().type === TokenType.IDENTIFIER && peek().value === "default") {
        advance(); // default
        expect(TokenType.COLON, "expected ':' after default");
        const body = [];
        while (
          peek().type !== TokenType.CASE &&
          peek().type !== TokenType.RBRACE &&
          !(peek().type === TokenType.IDENTIFIER && peek().value === "default")
        ) {
          body.push(parseStatement());
        }
        cases.push({ type: "SwitchDefault", body });
      } else {
        throw new ParseError("Expected 'case' or 'default' in switch body", peek());
      }
    }

    expect(TokenType.RBRACE, "expected '}'");
    return { type: "SwitchStatement", discriminant, cases };
  }

  function parseForStatement() {
    advance(); // for
    expect(TokenType.LPAREN, "expected '('");
    // for...of or C-style for — detect by looking ahead
    // For now, support for...of: for (let x of expr)
    if (peek().type === TokenType.LET || peek().type === TokenType.VAL) {
      const kind = advance();

      // Destructuring patterns: for (let [a, b] of ...) or for (let {x, y} of ...)
      if (peek().type === TokenType.LBRACKET) {
        const pattern = parseArrayPattern();
        expect(TokenType.OF, "expected 'of' in for...of");
        const iterable = parseExpression();
        expect(TokenType.RPAREN, "expected ')'");
        const body = parseBlock();
        return { type: "ForOfStatement", kind: kind.value, pattern, iterable, body };
      }
      if (peek().type === TokenType.LBRACE) {
        const pattern = parseObjectPattern();
        expect(TokenType.OF, "expected 'of' in for...of");
        const iterable = parseExpression();
        expect(TokenType.RPAREN, "expected ')'");
        const body = parseBlock();
        return { type: "ForOfStatement", kind: kind.value, pattern, iterable, body };
      }

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

      // C-style for: for (let i = 0; i < 10; i += 1) { ... }
      if (peek().type === TokenType.COLON) { advance(); parseTypeAnnotation(); }
      expect(TokenType.ASSIGN, "expected '=' in for loop init");
      const init = parseExpression();
      expect(TokenType.SEMICOLON, "expected ';' after for loop init");
      const test = parseExpression();
      expect(TokenType.SEMICOLON, "expected ';' after for loop condition");
      const update = parseExpression();
      expect(TokenType.RPAREN, "expected ')'");
      const body = parseBlock();
      return {
        type: "ForStatement",
        init: {
          type: "VarDeclaration",
          kind: kind.value,
          name: name.value,
          init,
        },
        test,
        update,
        body,
      };
    }
    throw new ParseError("for loop requires a declaration (let/val)", peek());
  }

  return parseProgram();
}

export { parse, ParseError };
