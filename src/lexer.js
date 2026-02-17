"use strict";

const TokenType = {
  // Literals
  NUMBER: "NUMBER",
  STRING: "STRING",
  BOOLEAN: "BOOLEAN",
  NONE: "NONE",

  // Identifiers & keywords
  IDENTIFIER: "IDENTIFIER",
  LET: "LET",
  VAL: "VAL",
  FUNCTION: "FUNCTION",
  RETURN: "RETURN",
  IF: "IF",
  ELSE: "ELSE",
  FOR: "FOR",
  WHILE: "WHILE",
  DO: "DO",
  SWITCH: "SWITCH",
  CASE: "CASE",
  BREAK: "BREAK",
  CONTINUE: "CONTINUE",
  TRY: "TRY",
  CATCH: "CATCH",
  FINALLY: "FINALLY",
  THROW: "THROW",
  TYPEOF: "TYPEOF",
  THIS: "THIS",
  IMPORT: "IMPORT",
  EXPORT: "EXPORT",
  FROM: "FROM",
  AS: "AS",
  OF: "OF",
  TYPE: "TYPE",

  // Punctuation
  SEMICOLON: "SEMICOLON",
  COMMA: "COMMA",
  DOT: "DOT",
  COLON: "COLON",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  LBRACE: "LBRACE",
  RBRACE: "RBRACE",
  LBRACKET: "LBRACKET",
  RBRACKET: "RBRACKET",
  ARROW: "ARROW",
  SPREAD: "SPREAD",
  QUESTION: "QUESTION",
  NULLISH: "NULLISH",

  // Operators
  PLUS: "PLUS",
  MINUS: "MINUS",
  STAR: "STAR",
  SLASH: "SLASH",
  PERCENT: "PERCENT",
  STARSTAR: "STARSTAR",
  EQ: "EQ",
  NEQ: "NEQ",
  LT: "LT",
  GT: "GT",
  LTE: "LTE",
  GTE: "GTE",
  AND: "AND",
  OR: "OR",
  NOT: "NOT",
  ASSIGN: "ASSIGN",
  PLUS_ASSIGN: "PLUS_ASSIGN",
  MINUS_ASSIGN: "MINUS_ASSIGN",
  STAR_ASSIGN: "STAR_ASSIGN",
  SLASH_ASSIGN: "SLASH_ASSIGN",
  PERCENT_ASSIGN: "PERCENT_ASSIGN",
  STARSTAR_ASSIGN: "STARSTAR_ASSIGN",

  // Special
  EOF: "EOF",
};

const KEYWORDS = new Map([
  ["let", TokenType.LET],
  ["val", TokenType.VAL],
  ["function", TokenType.FUNCTION],
  ["return", TokenType.RETURN],
  ["if", TokenType.IF],
  ["else", TokenType.ELSE],
  ["for", TokenType.FOR],
  ["while", TokenType.WHILE],
  ["do", TokenType.DO],
  ["switch", TokenType.SWITCH],
  ["case", TokenType.CASE],
  ["break", TokenType.BREAK],
  ["continue", TokenType.CONTINUE],
  ["try", TokenType.TRY],
  ["catch", TokenType.CATCH],
  ["finally", TokenType.FINALLY],
  ["throw", TokenType.THROW],
  ["typeof", TokenType.TYPEOF],
  ["this", TokenType.THIS],
  ["import", TokenType.IMPORT],
  ["export", TokenType.EXPORT],
  ["from", TokenType.FROM],
  ["as", TokenType.AS],
  ["of", TokenType.OF],
  ["type", TokenType.TYPE],
  ["true", TokenType.BOOLEAN],
  ["false", TokenType.BOOLEAN],
  ["None", TokenType.NONE],
]);

class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }

  toString() {
    return `${this.type}(${JSON.stringify(this.value)}) @ ${this.line}:${this.col}`;
  }
}

class LexerError extends Error {
  constructor(message, line, col) {
    super(`${message} at ${line}:${col}`);
    this.line = line;
    this.col = col;
  }
}

function lex(source) {
  const tokens = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function peek() {
    return pos < source.length ? source[pos] : null;
  }

  function advance() {
    const ch = source[pos++];
    if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  }

  function lookahead(n) {
    return pos + n < source.length ? source[pos + n] : null;
  }

  function emit(type, value) {
    tokens.push(new Token(type, value, line, col));
  }

  while (pos < source.length) {
    const ch = peek();

    // Whitespace
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      advance();
      continue;
    }

    // Comment
    if (ch === "#") {
      while (pos < source.length && peek() !== "\n") {
        advance();
      }
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const startLine = line;
      const startCol = col;
      const quote = advance();
      let value = "";
      while (pos < source.length) {
        const c = peek();
        if (c === quote) {
          advance();
          break;
        }
        if (c === "\\") {
          advance();
          const esc = advance();
          switch (esc) {
            case "n": value += "\n"; break;
            case "t": value += "\t"; break;
            case "r": value += "\r"; break;
            case "\\": value += "\\"; break;
            case "'": value += "'"; break;
            case '"': value += '"'; break;
            default:
              throw new LexerError(`Unknown escape sequence \\${esc}`, line, col);
          }
        } else if (c === "\n") {
          throw new LexerError("Unterminated string literal", startLine, startCol);
        } else {
          value += advance();
        }
      }
      tokens.push(new Token(TokenType.STRING, value, startLine, startCol));
      continue;
    }

    // Number literals
    if (ch >= "0" && ch <= "9") {
      const startCol = col;
      let num = "";
      while (pos < source.length && peek() >= "0" && peek() <= "9") {
        num += advance();
      }
      if (peek() === "." && lookahead(1) >= "0" && lookahead(1) <= "9") {
        num += advance(); // the dot
        while (pos < source.length && peek() >= "0" && peek() <= "9") {
          num += advance();
        }
      }
      tokens.push(new Token(TokenType.NUMBER, num, line, startCol));
      continue;
    }

    // Identifiers and keywords
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
      const startCol = col;
      let id = "";
      while (
        pos < source.length &&
        ((peek() >= "a" && peek() <= "z") ||
          (peek() >= "A" && peek() <= "Z") ||
          (peek() >= "0" && peek() <= "9") ||
          peek() === "_")
      ) {
        id += advance();
      }
      const kwType = KEYWORDS.get(id);
      if (kwType) {
        tokens.push(new Token(kwType, id, line, startCol));
      } else {
        tokens.push(new Token(TokenType.IDENTIFIER, id, line, startCol));
      }
      continue;
    }

    // Punctuation and operators
    const startCol = col;
    switch (ch) {
      case ";": advance(); emit(TokenType.SEMICOLON, ";"); break;
      case ",": advance(); emit(TokenType.COMMA, ","); break;
      case ".":
        if (lookahead(1) === "." && lookahead(2) === ".") {
          advance(); advance(); advance();
          emit(TokenType.SPREAD, "...");
        } else {
          advance();
          emit(TokenType.DOT, ".");
        }
        break;
      case ":": advance(); emit(TokenType.COLON, ":"); break;
      case "(": advance(); emit(TokenType.LPAREN, "("); break;
      case ")": advance(); emit(TokenType.RPAREN, ")"); break;
      case "{": advance(); emit(TokenType.LBRACE, "{"); break;
      case "}": advance(); emit(TokenType.RBRACE, "}"); break;
      case "[": advance(); emit(TokenType.LBRACKET, "["); break;
      case "]": advance(); emit(TokenType.RBRACKET, "]"); break;
      case "?":
        advance();
        if (peek() === "?") {
          advance();
          emit(TokenType.NULLISH, "??");
        } else {
          emit(TokenType.QUESTION, "?");
        }
        break;
      case "+":
        advance();
        if (peek() === "=") { advance(); emit(TokenType.PLUS_ASSIGN, "+="); }
        else { emit(TokenType.PLUS, "+"); }
        break;
      case "-":
        advance();
        if (peek() === "=") { advance(); emit(TokenType.MINUS_ASSIGN, "-="); }
        else { emit(TokenType.MINUS, "-"); }
        break;
      case "*":
        advance();
        if (peek() === "*") {
          advance();
          if (peek() === "=") { advance(); emit(TokenType.STARSTAR_ASSIGN, "**="); }
          else { emit(TokenType.STARSTAR, "**"); }
        } else if (peek() === "=") {
          advance();
          emit(TokenType.STAR_ASSIGN, "*=");
        } else {
          emit(TokenType.STAR, "*");
        }
        break;
      case "/":
        advance();
        if (peek() === "=") { advance(); emit(TokenType.SLASH_ASSIGN, "/="); }
        else { emit(TokenType.SLASH, "/"); }
        break;
      case "%":
        advance();
        if (peek() === "=") { advance(); emit(TokenType.PERCENT_ASSIGN, "%="); }
        else { emit(TokenType.PERCENT, "%"); }
        break;
      case "=":
        advance();
        if (peek() === "=") {
          advance();
          emit(TokenType.EQ, "==");
        } else if (peek() === ">") {
          advance();
          emit(TokenType.ARROW, "=>");
        } else {
          emit(TokenType.ASSIGN, "=");
        }
        break;
      case "!":
        advance();
        if (peek() === "=") {
          advance();
          emit(TokenType.NEQ, "!=");
        } else {
          emit(TokenType.NOT, "!");
        }
        break;
      case "<":
        advance();
        if (peek() === "=") {
          advance();
          emit(TokenType.LTE, "<=");
        } else {
          emit(TokenType.LT, "<");
        }
        break;
      case ">":
        advance();
        if (peek() === "=") {
          advance();
          emit(TokenType.GTE, ">=");
        } else {
          emit(TokenType.GT, ">");
        }
        break;
      case "&":
        advance();
        if (peek() === "&") {
          advance();
          emit(TokenType.AND, "&&");
        } else {
          throw new LexerError("Unexpected '&' — bitwise operators are not supported", line, startCol);
        }
        break;
      case "|":
        advance();
        if (peek() === "|") {
          advance();
          emit(TokenType.OR, "||");
        } else {
          // Single | is used in type unions — but that's handled by the parser.
          // For now, emit as a pipe token or handle in parser.
          // Actually, type unions use | between types, so we need this.
          // Let's just treat it as an error for now and handle type unions later.
          throw new LexerError("Unexpected '|' — use '||' for logical OR", line, startCol);
        }
        break;
      default:
        throw new LexerError(`Unexpected character '${ch}'`, line, startCol);
    }
  }

  tokens.push(new Token(TokenType.EOF, null, line, col));
  return tokens;
}

module.exports = { lex, Token, TokenType, LexerError };
