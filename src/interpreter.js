/**
 * AP CSP Exam Reference Sheet notation interpreter.
 *
 * This module intentionally interprets a small AST. It never translates source
 * to JavaScript and never uses eval/Function. The Unicode operators are the
 * official spellings; ASCII_ALIASES documents the accepted typing conveniences.
 */

export const DEFAULT_STEP_LIMIT = 100_000;
export const DEFAULT_CHUNK_SIZE = 500;

export const ASCII_ALIASES = Object.freeze({
  '<-': '←',
  '!=': '≠',
  '>=': '≥',
  '<=': '≤',
});

const KEYWORDS = new Map([
  ['DISPLAY', 'DISPLAY'],
  ['INPUT', 'INPUT'],
  ['RANDOM', 'RANDOM'],
  ['MOD', 'MOD'],
  ['NOT', 'NOT'],
  ['AND', 'AND'],
  ['OR', 'OR'],
  ['IF', 'IF'],
  ['ELSE', 'ELSE'],
  ['REPEAT', 'REPEAT'],
  ['TIMES', 'TIMES'],
  ['UNTIL', 'UNTIL'],
  ['FOR', 'FOR'],
  ['EACH', 'EACH'],
  ['IN', 'IN'],
  ['INSERT', 'INSERT'],
  ['APPEND', 'APPEND'],
  ['REMOVE', 'REMOVE'],
  ['LENGTH', 'LENGTH'],
  ['PROCEDURE', 'PROCEDURE'],
  ['RETURN', 'RETURN'],
  ['MOVE_FORWARD', 'MOVE_FORWARD'],
  ['ROTATE_LEFT', 'ROTATE_LEFT'],
  ['ROTATE_RIGHT', 'ROTATE_RIGHT'],
  ['CAN_MOVE', 'CAN_MOVE'],
  ['TRUE', 'TRUE'],
  ['FALSE', 'FALSE'],
]);

const DIRECTION_WORDS = new Set(['forward', 'backward', 'left', 'right']);
const CALLABLE_KEYWORDS = new Set([
  'DISPLAY',
  'INPUT',
  'RANDOM',
  'INSERT',
  'APPEND',
  'REMOVE',
  'LENGTH',
  'MOVE_FORWARD',
  'ROTATE_LEFT',
  'ROTATE_RIGHT',
  'CAN_MOVE',
]);

const BUILTIN_NAMES = new Set(CALLABLE_KEYWORDS);
const VOID = Symbol('AP_CSP_VOID');
const NO_RESUME_VALUE = Symbol('AP_CSP_NO_RESUME_VALUE');

function point(offset, line, column) {
  return { offset, line, column };
}

function span(start, end) {
  return {
    start: { ...start },
    end: { ...end },
  };
}

function copyLoc(loc) {
  if (!loc) return null;
  return span(loc.start, loc.end);
}

function mergeLoc(first, last) {
  const a = first?.loc ?? first;
  const b = last?.loc ?? last;
  if (!a || !b) return null;
  return span(a.start, b.end);
}

function freezeShallow(value) {
  return Object.freeze(value);
}

export class APCSPError extends Error {
  constructor({
    phase = 'runtime',
    code = 'APCSP_ERROR',
    message,
    loc = null,
    hint = null,
    details = null,
    callStack = [],
    cause,
  }) {
    super(message, cause ? { cause } : undefined);
    this.name = 'APCSPError';
    this.phase = phase;
    this.code = code;
    this.loc = copyLoc(loc);
    this.hint = hint;
    this.details = details == null ? null : cloneForPublic(details);
    this.callStack = callStack.map((frame) => ({
      name: frame.name,
      callLoc: copyLoc(frame.callLoc),
      definitionLoc: copyLoc(frame.definitionLoc),
    }));
  }

  toJSON() {
    return {
      name: this.name,
      phase: this.phase,
      code: this.code,
      message: this.message,
      loc: copyLoc(this.loc),
      hint: this.hint,
      details: cloneForPublic(this.details),
      callStack: this.callStack.map((frame) => ({
        name: frame.name,
        callLoc: copyLoc(frame.callLoc),
        definitionLoc: copyLoc(frame.definitionLoc),
      })),
    };
  }
}

function languageError(phase, code, message, loc, extras = {}) {
  return new APCSPError({ phase, code, message, loc, ...extras });
}

function isDigit(char) {
  return char >= '0' && char <= '9';
}

function isIdentifierStart(char) {
  return (
    (char >= 'a' && char <= 'z') ||
    (char >= 'A' && char <= 'Z') ||
    char === '_'
  );
}

function isIdentifierPart(char) {
  return isIdentifierStart(char) || isDigit(char);
}

/** Tokenize AP CSP text notation. The returned array has an aliasesUsed array. */
export function tokenize(source) {
  if (typeof source !== 'string') {
    throw languageError(
      'tokenize',
      'SOURCE_TYPE',
      'Program source must be a string.',
      null,
    );
  }

  const tokens = [];
  const aliasesUsed = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const here = () => point(index, line, column);

  const advance = () => {
    const char = source[index++];
    if (char === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return char;
  };

  const add = (type, value, start, lexeme, aliasFor = null) => {
    const token = {
      type,
      value,
      lexeme,
      loc: span(start, here()),
      aliasFor,
    };
    tokens.push(token);
    if (aliasFor) {
      aliasesUsed.push({ alias: lexeme, official: aliasFor, loc: copyLoc(token.loc) });
    }
  };

  while (index < source.length) {
    const start = here();
    const char = source[index];

    if (char === ' ' || char === '\t' || char === '\f' || char === '\v') {
      advance();
      continue;
    }

    if (char === '\r') {
      advance();
      if (source[index] === '\n') {
        advance();
      } else {
        line += 1;
        column = 1;
      }
      add('NEWLINE', '\n', start, source.slice(start.offset, index));
      continue;
    }

    if (char === '\n') {
      advance();
      add('NEWLINE', '\n', start, '\n');
      continue;
    }

    if (char === '/' && source[index + 1] === '/') {
      while (index < source.length && source[index] !== '\n' && source[index] !== '\r') {
        advance();
      }
      continue;
    }

    const two = source.slice(index, index + 2);
    if (Object.hasOwn(ASCII_ALIASES, two)) {
      advance();
      advance();
      const official = ASCII_ALIASES[two];
      const type = official === '←' ? 'ARROW' : official === '≠' ? 'NEQ' : official === '≥' ? 'GTE' : 'LTE';
      add(type, official, start, two, official);
      continue;
    }

    const singleTokens = {
      '←': ['ARROW', '←'],
      '≠': ['NEQ', '≠'],
      '≥': ['GTE', '≥'],
      '≤': ['LTE', '≤'],
      '=': ['EQ', '='],
      '>': ['GT', '>'],
      '<': ['LT', '<'],
      '+': ['PLUS', '+'],
      '-': ['MINUS', '-'],
      '*': ['STAR', '*'],
      '/': ['SLASH', '/'],
      '(': ['LPAREN', '('],
      ')': ['RPAREN', ')'],
      '{': ['LBRACE', '{'],
      '}': ['RBRACE', '}'],
      '[': ['LBRACKET', '['],
      ']': ['RBRACKET', ']'],
      ',': ['COMMA', ','],
      ';': ['SEMI', ';'],
    };

    if (singleTokens[char]) {
      advance();
      const [type, value] = singleTokens[char];
      add(type, value, start, char);
      continue;
    }

    if (char === '"') {
      advance();
      let value = '';
      let terminated = false;
      while (index < source.length) {
        const current = advance();
        if (current === '"') {
          terminated = true;
          break;
        }
        if (current === '\n' || current === '\r') {
          throw languageError(
            'tokenize',
            'UNTERMINATED_STRING',
            'String literals cannot continue across a line.',
            span(start, here()),
            { hint: 'Close the string with a double quote before the end of the line.' },
          );
        }
        if (current === '\\') {
          if (index >= source.length) break;
          const escaped = advance();
          const escapes = { n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' };
          if (!Object.hasOwn(escapes, escaped)) {
            throw languageError(
              'tokenize',
              'INVALID_ESCAPE',
              `Unsupported escape sequence \\${escaped}.`,
              span(start, here()),
              { hint: 'Supported escapes are \\n, \\r, \\t, \\" and \\\\.' },
            );
          }
          value += escapes[escaped];
        } else {
          value += current;
        }
      }
      if (!terminated) {
        throw languageError(
          'tokenize',
          'UNTERMINATED_STRING',
          'Unterminated string literal.',
          span(start, here()),
          { hint: 'Close the string with a double quote.' },
        );
      }
      add('STRING', value, start, source.slice(start.offset, index));
      continue;
    }

    if (isDigit(char) || (char === '.' && isDigit(source[index + 1]))) {
      if (char === '.') advance();
      while (isDigit(source[index])) advance();
      if (source[index] === '.') {
        advance();
        while (isDigit(source[index])) advance();
      }
      if (source[index] === 'e' || source[index] === 'E') {
        const exponentStart = index;
        advance();
        if (source[index] === '+' || source[index] === '-') advance();
        if (!isDigit(source[index])) {
          throw languageError(
            'tokenize',
            'INVALID_NUMBER',
            'A numeric exponent must contain at least one digit.',
            span(start, here()),
          );
        }
        while (isDigit(source[index])) advance();
        if (index === exponentStart + 1) advance();
      }
      const lexeme = source.slice(start.offset, index);
      const value = Number(lexeme);
      if (!Number.isFinite(value)) {
        throw languageError(
          'tokenize',
          'INVALID_NUMBER',
          `The number ${lexeme} is outside the supported finite range.`,
          span(start, here()),
        );
      }
      add('NUMBER', value, start, lexeme);
      continue;
    }

    if (isIdentifierStart(char)) {
      advance();
      while (isIdentifierPart(source[index])) advance();
      const lexeme = source.slice(start.offset, index);
      const upper = lexeme.toUpperCase();
      const lower = lexeme.toLowerCase();
      if (DIRECTION_WORDS.has(lower)) {
        add('DIRECTION', lower, start, lexeme);
      } else if (KEYWORDS.has(upper)) {
        add(KEYWORDS.get(upper), upper, start, lexeme);
      } else {
        add('IDENTIFIER', lexeme, start, lexeme);
      }
      continue;
    }

    advance();
    throw languageError(
      'tokenize',
      'UNEXPECTED_CHARACTER',
      `Unexpected character ${JSON.stringify(char)}.`,
      span(start, here()),
    );
  }

  const eof = here();
  tokens.push({ type: 'EOF', value: null, lexeme: '', loc: span(eof, eof), aliasFor: null });
  Object.defineProperty(tokens, 'aliasesUsed', {
    value: aliasesUsed,
    enumerable: false,
    writable: false,
  });
  return tokens;
}

class Parser {
  constructor(source) {
    this.source = source;
    this.tokens = tokenize(source);
    this.current = 0;
    this.procedureDepth = 0;
  }

  peek(offset = 0) {
    return this.tokens[Math.min(this.current + offset, this.tokens.length - 1)];
  }

  previous() {
    return this.tokens[this.current - 1];
  }

  check(type) {
    return this.peek().type === type;
  }

  match(...types) {
    if (!types.includes(this.peek().type)) return false;
    this.current += 1;
    return true;
  }

  consume(type, message, code = 'EXPECTED_TOKEN') {
    if (this.check(type)) return this.tokens[this.current++];
    throw languageError('parse', code, message, this.peek().loc, {
      details: { expected: type, found: this.peek().type },
    });
  }

  skipSeparators() {
    while (this.match('NEWLINE', 'SEMI')) {
      // Intentional.
    }
  }

  requireStatementEnd() {
    if (this.check('EOF') || this.check('RBRACE')) return;
    if (this.match('NEWLINE', 'SEMI')) {
      this.skipSeparators();
      return;
    }
    throw languageError(
      'parse',
      'EXPECTED_STATEMENT_END',
      'Expected a line break or semicolon after the statement.',
      this.peek().loc,
    );
  }

  parseProgram() {
    const start = this.peek();
    const body = [];
    this.skipSeparators();
    while (!this.check('EOF')) {
      body.push(this.parseStatement(true));
      this.skipSeparators();
    }
    const end = this.peek();
    const program = {
      type: 'Program',
      body,
      loc: mergeLoc(start, end),
      aliasesUsed: this.tokens.aliasesUsed.map((entry) => ({
        ...entry,
        loc: copyLoc(entry.loc),
      })),
    };
    validateProgram(program);
    return program;
  }

  parseStatement(topLevel = false) {
    if (this.match('PROCEDURE')) {
      const start = this.previous();
      if (!topLevel) {
        throw languageError(
          'parse',
          'PROCEDURE_NOT_TOP_LEVEL',
          'PROCEDURE declarations must appear at the top level.',
          start.loc,
          { hint: 'Move the PROCEDURE declaration outside every IF, loop, and other PROCEDURE block.' },
        );
      }
      return this.parseProcedure(start);
    }
    if (this.match('IF')) return this.parseIf(this.previous());
    if (this.match('REPEAT')) return this.parseRepeat(this.previous());
    if (this.match('FOR')) return this.parseForEach(this.previous());
    if (this.match('RETURN')) return this.parseReturn(this.previous());
    return this.parseAssignmentOrExpressionStatement();
  }

  parseProcedure(start) {
    if (this.procedureDepth > 0) {
      throw languageError(
        'parse',
        'NESTED_PROCEDURE',
        'PROCEDURE declarations must be at the top level.',
        start.loc,
      );
    }
    const name = this.consume(
      'IDENTIFIER',
      'Expected a procedure name after PROCEDURE.',
      'EXPECTED_PROCEDURE_NAME',
    );
    this.consume('LPAREN', 'Expected ( after the procedure name.');
    const params = [];
    if (!this.check('RPAREN')) {
      do {
        params.push(
          this.consume(
            'IDENTIFIER',
            'Expected a parameter name.',
            'EXPECTED_PARAMETER_NAME',
          ),
        );
      } while (this.match('COMMA'));
    }
    this.consume('RPAREN', 'Expected ) after the parameter list.');
    this.procedureDepth += 1;
    let block;
    try {
      block = this.parseBlock();
    } finally {
      this.procedureDepth -= 1;
    }
    return {
      type: 'ProcedureDecl',
      name: name.value,
      params: params.map((token) => ({ name: token.value, loc: copyLoc(token.loc) })),
      body: block.body,
      loc: mergeLoc(start, block),
    };
  }

  parseIf(start) {
    this.consume('LPAREN', 'Expected ( after IF.');
    const condition = this.parseExpression();
    this.consume('RPAREN', 'Expected ) after the IF condition.');
    const consequent = this.parseBlock();
    this.skipSeparators();
    let alternate = null;
    if (this.match('ELSE')) alternate = this.parseBlock();
    return {
      type: 'IfStmt',
      condition,
      consequent: consequent.body,
      alternate: alternate?.body ?? null,
      loc: mergeLoc(start, alternate ?? consequent),
    };
  }

  parseRepeat(start) {
    if (this.match('UNTIL')) {
      this.consume('LPAREN', 'Expected ( after UNTIL.');
      const condition = this.parseExpression();
      this.consume('RPAREN', 'Expected ) after the REPEAT UNTIL condition.');
      const block = this.parseBlock();
      return {
        type: 'RepeatUntilStmt',
        condition,
        body: block.body,
        loc: mergeLoc(start, block),
      };
    }

    const count = this.parseExpression();
    this.consume('TIMES', 'Expected TIMES after the repeat count.', 'EXPECTED_TIMES');
    const block = this.parseBlock();
    return {
      type: 'RepeatTimesStmt',
      count,
      body: block.body,
      loc: mergeLoc(start, block),
    };
  }

  parseForEach(start) {
    this.consume('EACH', 'Expected EACH after FOR.', 'EXPECTED_EACH');
    const item = this.consume(
      'IDENTIFIER',
      'Expected a loop variable after FOR EACH.',
      'EXPECTED_LOOP_VARIABLE',
    );
    this.consume('IN', 'Expected IN after the loop variable.', 'EXPECTED_IN');
    const iterable = this.parseExpression();
    const block = this.parseBlock();
    return {
      type: 'ForEachStmt',
      item: item.value,
      itemLoc: copyLoc(item.loc),
      iterable,
      body: block.body,
      loc: mergeLoc(start, block),
    };
  }

  parseReturn(start) {
    if (this.procedureDepth === 0) {
      throw languageError(
        'parse',
        'RETURN_OUTSIDE_PROCEDURE',
        'RETURN can only appear inside a PROCEDURE.',
        start.loc,
      );
    }
    this.consume('LPAREN', 'Expected ( after RETURN.');
    const value = this.parseExpression();
    const close = this.consume('RPAREN', 'Expected ) after the RETURN value.');
    this.requireStatementEnd();
    return { type: 'ReturnStmt', value, loc: mergeLoc(start, close) };
  }

  parseBlock() {
    // The official reference sheet places opening braces on the following line.
    this.skipSeparators();
    const start = this.consume('LBRACE', 'Expected { before the block.');
    const body = [];
    this.skipSeparators();
    while (!this.check('RBRACE') && !this.check('EOF')) {
      body.push(this.parseStatement());
      this.skipSeparators();
    }
    const end = this.consume('RBRACE', 'Expected } after the block.', 'UNCLOSED_BLOCK');
    return { type: 'Block', body, loc: mergeLoc(start, end) };
  }

  parseAssignmentOrExpressionStatement() {
    const expression = this.parseExpression();
    if (this.match('ARROW')) {
      if (expression.type === 'DirectionExpr') {
        throw languageError(
          'parse',
          'RESERVED_DIRECTION_VALUE',
          `${expression.value} is reserved for CAN_MOVE and cannot be used as an assignment target.`,
          expression.loc,
          { hint: `Use ${expression.value} only as the direction in CAN_MOVE(${expression.value}).` },
        );
      }
      if (expression.type !== 'VariableExpr' && expression.type !== 'IndexExpr') {
        throw languageError(
          'parse',
          'INVALID_ASSIGNMENT_TARGET',
          'The left side of ← must be a variable or list element.',
          expression.loc,
        );
      }
      const value = this.parseExpression();
      const node = {
        type: 'AssignStmt',
        target: expression,
        value,
        loc: mergeLoc(expression, value),
      };
      this.requireStatementEnd();
      return node;
    }
    if (expression.type !== 'CallExpr') {
      throw languageError(
        'parse',
        'INVALID_EXPRESSION_STATEMENT',
        'Only a procedure or built-in call can be used as a statement.',
        expression.loc,
      );
    }
    const node = { type: 'ExpressionStmt', expression, loc: copyLoc(expression.loc) };
    this.requireStatementEnd();
    return node;
  }

  parseExpression() {
    return this.parseOr();
  }

  parseOr() {
    let expression = this.parseAnd();
    while (this.match('OR')) {
      const operator = this.previous();
      const right = this.parseAnd();
      expression = {
        type: 'LogicalExpr',
        operator: operator.type,
        left: expression,
        right,
        loc: mergeLoc(expression, right),
      };
    }
    return expression;
  }

  parseAnd() {
    let expression = this.parseNot();
    while (this.match('AND')) {
      const operator = this.previous();
      const right = this.parseNot();
      expression = {
        type: 'LogicalExpr',
        operator: operator.type,
        left: expression,
        right,
        loc: mergeLoc(expression, right),
      };
    }
    return expression;
  }

  parseNot() {
    if (this.match('NOT')) {
      const operator = this.previous();
      const operand = this.parseNot();
      return {
        type: 'UnaryExpr',
        operator: operator.type,
        operand,
        loc: mergeLoc(operator, operand),
      };
    }
    return this.parseComparison();
  }

  parseComparison() {
    let expression = this.parseTerm();
    if (this.match('EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE')) {
      const operator = this.previous();
      const right = this.parseTerm();
      expression = {
        type: 'BinaryExpr',
        operator: operator.type,
        left: expression,
        right,
        loc: mergeLoc(expression, right),
      };
      if (this.check('EQ') || this.check('NEQ') || this.check('GT') || this.check('GTE') || this.check('LT') || this.check('LTE')) {
        throw languageError(
          'parse',
          'CHAINED_COMPARISON',
          'Chained comparisons are not supported; combine comparisons with AND.',
          this.peek().loc,
        );
      }
    }
    return expression;
  }

  parseTerm() {
    let expression = this.parseFactor();
    while (this.match('PLUS', 'MINUS')) {
      const operator = this.previous();
      const right = this.parseFactor();
      expression = {
        type: 'BinaryExpr',
        operator: operator.type,
        left: expression,
        right,
        loc: mergeLoc(expression, right),
      };
    }
    return expression;
  }

  parseFactor() {
    let expression = this.parseUnary();
    while (this.match('STAR', 'SLASH', 'MOD')) {
      const operator = this.previous();
      const right = this.parseUnary();
      expression = {
        type: 'BinaryExpr',
        operator: operator.type,
        left: expression,
        right,
        loc: mergeLoc(expression, right),
      };
    }
    return expression;
  }

  parseUnary() {
    if (this.match('MINUS', 'PLUS')) {
      const operator = this.previous();
      const operand = this.parseUnary();
      return {
        type: 'UnaryExpr',
        operator: operator.type,
        operand,
        loc: mergeLoc(operator, operand),
      };
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expression = this.parsePrimary();
    for (;;) {
      if (this.match('LPAREN')) {
        const args = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.parseExpression());
          } while (this.match('COMMA'));
        }
        const close = this.consume('RPAREN', 'Expected ) after arguments.');
        expression = {
          type: 'CallExpr',
          callee: expression,
          args,
          loc: mergeLoc(expression, close),
        };
      } else if (this.match('LBRACKET')) {
        const index = this.parseExpression();
        const close = this.consume('RBRACKET', 'Expected ] after the list index.');
        expression = {
          type: 'IndexExpr',
          list: expression,
          index,
          loc: mergeLoc(expression, close),
        };
      } else {
        break;
      }
    }
    return expression;
  }

  parsePrimary() {
    if (this.match('NUMBER')) {
      const token = this.previous();
      return { type: 'LiteralExpr', value: token.value, loc: copyLoc(token.loc) };
    }
    if (this.match('STRING')) {
      const token = this.previous();
      return { type: 'LiteralExpr', value: token.value, loc: copyLoc(token.loc) };
    }
    if (this.match('TRUE', 'FALSE')) {
      const token = this.previous();
      return { type: 'LiteralExpr', value: token.type === 'TRUE', loc: copyLoc(token.loc) };
    }
    if (this.match('DIRECTION')) {
      const token = this.previous();
      return { type: 'DirectionExpr', value: token.value, loc: copyLoc(token.loc) };
    }
    if (this.match('IDENTIFIER', ...CALLABLE_KEYWORDS)) {
      const token = this.previous();
      return {
        type: 'VariableExpr',
        name: token.type === 'IDENTIFIER' ? token.value : token.type,
        loc: copyLoc(token.loc),
      };
    }
    if (this.match('LPAREN')) {
      const start = this.previous();
      const expression = this.parseExpression();
      const end = this.consume('RPAREN', 'Expected ) after the expression.');
      return { ...expression, loc: mergeLoc(start, end) };
    }
    if (this.match('LBRACKET')) {
      const start = this.previous();
      const elements = [];
      if (!this.check('RBRACKET')) {
        do {
          elements.push(this.parseExpression());
        } while (this.match('COMMA'));
      }
      const end = this.consume('RBRACKET', 'Expected ] after the list literal.');
      return { type: 'ListExpr', elements, loc: mergeLoc(start, end) };
    }
    throw languageError(
      'parse',
      'EXPECTED_EXPRESSION',
      'Expected a number, string, Boolean, list, variable, or call.',
      this.peek().loc,
    );
  }
}

/** Parse source into a location-bearing AST. */
export function parseProgram(source) {
  return new Parser(source).parseProgram();
}

function walkNode(node, visitor, parent = null) {
  if (!node || typeof node !== 'object') return;
  visitor(node, parent);
  switch (node.type) {
    case 'Program':
      node.body.forEach((child) => walkNode(child, visitor, node));
      break;
    case 'ProcedureDecl':
      node.body.forEach((child) => walkNode(child, visitor, node));
      break;
    case 'IfStmt':
      walkNode(node.condition, visitor, node);
      node.consequent.forEach((child) => walkNode(child, visitor, node));
      node.alternate?.forEach((child) => walkNode(child, visitor, node));
      break;
    case 'RepeatTimesStmt':
      walkNode(node.count, visitor, node);
      node.body.forEach((child) => walkNode(child, visitor, node));
      break;
    case 'RepeatUntilStmt':
      walkNode(node.condition, visitor, node);
      node.body.forEach((child) => walkNode(child, visitor, node));
      break;
    case 'ForEachStmt':
      walkNode(node.iterable, visitor, node);
      node.body.forEach((child) => walkNode(child, visitor, node));
      break;
    case 'ReturnStmt':
      walkNode(node.value, visitor, node);
      break;
    case 'AssignStmt':
      walkNode(node.target, visitor, node);
      walkNode(node.value, visitor, node);
      break;
    case 'ExpressionStmt':
      walkNode(node.expression, visitor, node);
      break;
    case 'LogicalExpr':
    case 'BinaryExpr':
      walkNode(node.left, visitor, node);
      walkNode(node.right, visitor, node);
      break;
    case 'UnaryExpr':
      walkNode(node.operand, visitor, node);
      break;
    case 'CallExpr':
      walkNode(node.callee, visitor, node);
      node.args.forEach((arg) => walkNode(arg, visitor, node));
      break;
    case 'IndexExpr':
      walkNode(node.list, visitor, node);
      walkNode(node.index, visitor, node);
      break;
    case 'ListExpr':
      node.elements.forEach((element) => walkNode(element, visitor, node));
      break;
    default:
      break;
  }
}

function validateProgram(program) {
  const procedures = new Map();
  for (const statement of program.body) {
    if (statement.type !== 'ProcedureDecl') continue;
    if (BUILTIN_NAMES.has(statement.name.toUpperCase())) {
      throw languageError(
        'validate',
        'RESERVED_PROCEDURE_NAME',
        `${statement.name} is a built-in name and cannot be redefined.`,
        statement.loc,
      );
    }
    if (procedures.has(statement.name)) {
      throw languageError(
        'validate',
        'DUPLICATE_PROCEDURE',
        `PROCEDURE ${statement.name} is declared more than once.`,
        statement.loc,
        { details: { firstDeclaration: copyLoc(procedures.get(statement.name).loc) } },
      );
    }
    const names = new Set();
    for (const parameter of statement.params) {
      if (names.has(parameter.name)) {
        throw languageError(
          'validate',
          'DUPLICATE_PARAMETER',
          `Parameter ${parameter.name} appears more than once.`,
          parameter.loc,
        );
      }
      names.add(parameter.name);
    }
    procedures.set(statement.name, statement);
  }

  walkNode(program, (node, parent) => {
    if (node.type === 'ProcedureDecl' && parent?.type !== 'Program') {
      throw languageError(
        'validate',
        'PROCEDURE_NOT_TOP_LEVEL',
        'PROCEDURE declarations must appear at the top level.',
        node.loc,
        { hint: 'Move the PROCEDURE declaration outside every IF, loop, and other PROCEDURE block.' },
      );
    }

    if (node.type === 'VariableExpr' && BUILTIN_NAMES.has(node.name)) {
      const isCallTarget = parent?.type === 'CallExpr' && parent.callee === node;
      if (!isCallTarget) {
        throw languageError(
          'validate',
          'RESERVED_BUILTIN_VALUE',
          `${node.name} is a built-in procedure name and cannot be used as a variable or value.`,
          node.loc,
          { hint: `Call ${node.name} with parentheses instead.` },
        );
      }
    }

    if (node.type === 'DirectionExpr') {
      const isCanMoveArgument =
        parent?.type === 'CallExpr' &&
        parent.callee?.type === 'VariableExpr' &&
        parent.callee.name === 'CAN_MOVE' &&
        parent.args.includes(node);
      if (!isCanMoveArgument) {
        throw languageError(
          'validate',
          'RESERVED_DIRECTION_VALUE',
          `${node.value} is reserved for CAN_MOVE and cannot be used as a variable or general value.`,
          node.loc,
          { hint: `Use it only as the direction in CAN_MOVE(${node.value}).` },
        );
      }
    }

    if (node.type !== 'CallExpr' || node.callee.type !== 'VariableExpr') return;
    const declaration = procedures.get(node.callee.name);
    if (declaration && declaration.params.length !== node.args.length) {
      throw languageError(
        'validate',
        'ARITY_MISMATCH',
        `${declaration.name} expects ${declaration.params.length} argument(s), but ${node.args.length} were supplied.`,
        node.loc,
        { details: { expected: declaration.params.length, actual: node.args.length } },
      );
    }
  });
}

function cloneLanguageValue(value, seen = new Map()) {
  if (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    value === VOID
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const clone = [];
    seen.set(value, clone);
    for (const item of value) clone.push(cloneLanguageValue(item, seen));
    return clone;
  }
  throw new TypeError('Unsupported AP CSP value.');
}

function cloneForPublic(value, seen = new Map()) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Object.is(value, -0) ? 0 : value;
  if (value === VOID) return null;
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    const clone = [];
    seen.set(value, clone);
    for (const item of value) clone.push(cloneForPublic(item, seen));
    return clone;
  }
  if (value instanceof Map) {
    return Object.fromEntries(
      [...value.entries()].map(([key, item]) => [key, cloneForPublic(item, seen)]),
    );
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    const clone = {};
    seen.set(value, clone);
    for (const [key, item] of Object.entries(value)) clone[key] = cloneForPublic(item, seen);
    return clone;
  }
  return String(value);
}

function renderValue(value, seen = new Set(), depth = 0) {
  if (value === VOID) throw new TypeError('Cannot display a procedure with no return value.');
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Object.is(value, -0) ? '0' : String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    if (depth >= 20) return '[…]';
    seen.add(value);
    const rendered = value.slice(0, 1_000).map((item) => renderValue(item, seen, depth + 1));
    if (value.length > 1_000) rendered.push('…');
    seen.delete(value);
    return `[${rendered.join(', ')}]`;
  }
  return String(value);
}

class Environment {
  constructor(parent = null, isGlobal = false) {
    this.parent = parent;
    this.isGlobal = isGlobal;
    this.values = new Map();
  }

  hasLocal(name) {
    return this.values.has(name);
  }

  define(name, value) {
    this.values.set(name, value);
  }

  assign(name, value) {
    // AP does not define scope. This runner's convention is procedure-local
    // assignment; globals are only written by top-level statements.
    this.values.set(name, value);
  }

  get(name) {
    if (this.values.has(name)) return this.values.get(name);
    if (this.parent) return this.parent.get(name);
    return undefined;
  }

  contains(name) {
    if (this.values.has(name)) return true;
    return this.parent ? this.parent.contains(name) : false;
  }
}

class ReturnCompletion {
  constructor(value) {
    this.value = value;
  }
}

const CARDINALS = ['north', 'east', 'south', 'west'];
const DELTAS = {
  north: [-1, 0],
  east: [0, 1],
  south: [1, 0],
  west: [0, -1],
};
const RELATIVE_TURNS = { forward: 0, right: 1, backward: 2, left: 3 };

function normalizeRobot(config) {
  if (config == null) return null;
  const rows = config.rows;
  const columns = config.columns;
  const start = config.start ?? {};
  if (!Number.isSafeInteger(rows) || rows < 1 || !Number.isSafeInteger(columns) || columns < 1) {
    throw languageError(
      'configuration',
      'INVALID_ROBOT_GRID',
      'Robot rows and columns must be positive integers.',
      null,
    );
  }
  const row = start.row;
  const column = start.column;
  const direction = String(start.direction ?? '').toLowerCase();
  if (!Number.isSafeInteger(row) || row < 1 || row > rows || !Number.isSafeInteger(column) || column < 1 || column > columns) {
    throw languageError(
      'configuration',
      'INVALID_ROBOT_START',
      'The robot start position must be inside the grid.',
      null,
    );
  }
  if (!CARDINALS.includes(direction)) {
    throw languageError(
      'configuration',
      'INVALID_ROBOT_DIRECTION',
      'Robot start direction must be north, east, south, or west.',
      null,
    );
  }
  const blocked = new Set();
  for (const cell of config.blocked ?? []) {
    const blockedRow = Array.isArray(cell) ? cell[0] : cell?.row;
    const blockedColumn = Array.isArray(cell) ? cell[1] : cell?.column;
    if (
      !Number.isSafeInteger(blockedRow) ||
      blockedRow < 1 ||
      blockedRow > rows ||
      !Number.isSafeInteger(blockedColumn) ||
      blockedColumn < 1 ||
      blockedColumn > columns
    ) {
      throw languageError(
        'configuration',
        'INVALID_BLOCKED_CELL',
        'Every blocked robot cell must be inside the grid.',
        null,
      );
    }
    blocked.add(`${blockedRow},${blockedColumn}`);
  }
  if (blocked.has(`${row},${column}`)) {
    throw languageError(
      'configuration',
      'BLOCKED_ROBOT_START',
      'The robot cannot start on a blocked cell.',
      null,
    );
  }
  return { rows, columns, blocked, row, column, direction };
}

function publicRobot(robot) {
  if (!robot) return null;
  return {
    rows: robot.rows,
    columns: robot.columns,
    row: robot.row,
    column: robot.column,
    direction: robot.direction,
    blocked: [...robot.blocked].map((key) => {
      const [row, column] = key.split(',').map(Number);
      return { row, column };
    }),
  };
}

class Runtime {
  constructor(program, options) {
    this.program = program;
    this.options = options;
    this.stepLimit = options.stepLimit ?? DEFAULT_STEP_LIMIT;
    if (!Number.isSafeInteger(this.stepLimit) || this.stepLimit < 1) {
      throw languageError(
        'configuration',
        'INVALID_STEP_LIMIT',
        'stepLimit must be a positive safe integer.',
        null,
      );
    }
    this.maxCallDepth = options.maxCallDepth ?? 256;
    if (!Number.isSafeInteger(this.maxCallDepth) || this.maxCallDepth < 1) {
      throw languageError(
        'configuration',
        'INVALID_CALL_DEPTH',
        'maxCallDepth must be a positive safe integer.',
        null,
      );
    }
    this.rng = options.rng ?? Math.random;
    if (typeof this.rng !== 'function') {
      throw languageError('configuration', 'INVALID_RNG', 'rng must be a function.', null);
    }
    this.inputQueue = cloneForPublic(options.inputQueue ?? []);
    if (!Array.isArray(this.inputQueue)) {
      throw languageError(
        'configuration',
        'INVALID_INPUT_QUEUE',
        'inputQueue must be an array.',
        null,
      );
    }
    this.inputIndex = 0;
    this.inputCount = 0;
    this.inputRequestCount = 0;
    this.global = new Environment(null, true);
    this.procedures = new Map();
    this.steps = 0;
    this.currentLoc = null;
    this.outputEntries = [];
    this.events = [];
    this.callStack = [];
    this.robot = normalizeRobot(options.robot);
    this.robotTrace = this.robot
      ? [
          {
            action: 'START',
            success: true,
            row: this.robot.row,
            column: this.robot.column,
            direction: this.robot.direction,
            state: publicRobot(this.robot),
            loc: null,
          },
        ]
      : [];
    this.snapshots = [];
    this.captureSnapshots = Boolean(options.captureSnapshots);
    this.maxSnapshots = options.maxSnapshots ?? 1_000;
    for (const statement of program.body) {
      if (statement.type === 'ProcedureDecl') this.procedures.set(statement.name, statement);
    }
  }

  fail(code, message, nodeOrLoc, extras = {}) {
    const loc = nodeOrLoc?.loc ?? nodeOrLoc ?? this.currentLoc;
    throw languageError('runtime', code, message, loc, {
      ...extras,
      callStack: this.callStack,
    });
  }

  *tick(node, kind = 'node') {
    this.currentLoc = copyLoc(node?.loc ?? node ?? this.currentLoc);
    if (this.steps >= this.stepLimit) {
      this.fail(
        'STEP_LIMIT',
        `Execution stopped after ${this.stepLimit} steps; the program may contain an infinite loop.`,
        node,
        { details: { stepLimit: this.stepLimit, kind } },
      );
    }
    this.steps += 1;
    yield { type: 'step', step: this.steps, kind, loc: copyLoc(this.currentLoc) };
  }

  recordEvent(event) {
    this.events.push(cloneForPublic(event));
  }

  capture(node) {
    if (!this.captureSnapshots || this.snapshots.length >= this.maxSnapshots) return;
    this.snapshots.push({
      step: this.steps,
      loc: copyLoc(node?.loc),
      globals: cloneForPublic(this.global.values),
      robot: publicRobot(this.robot),
      output: this.outputEntries.join(''),
    });
  }

  expectBoolean(value, node, context = 'condition') {
    if (typeof value !== 'boolean') {
      this.fail(
        'EXPECTED_BOOLEAN',
        `The ${context} must evaluate to true or false.`,
        node,
        { details: { receivedType: describeType(value) } },
      );
    }
    return value;
  }

  expectNumber(value, node, context = 'value') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      this.fail('EXPECTED_NUMBER', `The ${context} must be a finite number.`, node, {
        details: { receivedType: describeType(value) },
      });
    }
    return value;
  }

  expectList(value, node, context = 'value') {
    if (!Array.isArray(value)) {
      this.fail('EXPECTED_LIST', `The ${context} must be a list.`, node, {
        details: { receivedType: describeType(value) },
      });
    }
    return value;
  }

  expectIndex(index, list, node, operation = 'list access', insert = false) {
    if (!Number.isSafeInteger(index)) {
      this.fail('INVALID_LIST_INDEX', `The index for ${operation} must be an integer.`, node, {
        hint: 'AP CSP list indexes begin at 1.',
        details: { index, length: list.length },
      });
    }
    // College Board's INSERT rule is deliberately strict: the index must name
    // an existing element, even for an empty list. APPEND is the add-at-end API.
    if (index < 1 || index > list.length) {
      this.fail(
        'INVALID_LIST_INDEX',
        `Index ${index} is outside the valid range 1 through ${list.length}.`,
        node,
        {
          hint: insert
            ? 'INSERT requires an existing index; use APPEND to add at the end.'
            : 'AP CSP lists are 1-indexed.',
          details: { index, length: list.length, operation },
        },
      );
    }
    return index - 1;
  }

  snapshot() {
    return {
      globals: cloneForPublic(this.global.values),
      inputConsumed: this.inputCount,
      inputRemaining: cloneForPublic(this.inputQueue.slice(this.inputIndex)),
      robot: publicRobot(this.robot),
      robotTrace: cloneForPublic(this.robotTrace),
      steps: this.steps,
      output: this.outputEntries.join(''),
      outputEntries: [...this.outputEntries],
      events: cloneForPublic(this.events),
      snapshots: cloneForPublic(this.snapshots),
    };
  }

  *executeProgram() {
    for (const statement of this.program.body) {
      if (statement.type === 'ProcedureDecl') continue;
      const completion = yield* this.executeStatement(statement, this.global);
      if (completion instanceof ReturnCompletion) {
        this.fail('RETURN_OUTSIDE_PROCEDURE', 'RETURN can only appear inside a procedure.', statement);
      }
    }
  }

  *executeBlock(statements, environment) {
    for (const statement of statements) {
      const completion = yield* this.executeStatement(statement, environment);
      if (completion instanceof ReturnCompletion) return completion;
    }
    return null;
  }

  *executeStatement(statement, environment) {
    yield* this.tick(statement, 'statement');
    let completion = null;
    switch (statement.type) {
      case 'AssignStmt': {
        const value = yield* this.evaluate(statement.value, environment);
        if (value === VOID) {
          this.fail(
            'VOID_VALUE',
            'A procedure that does not RETURN a value cannot be assigned.',
            statement.value,
          );
        }
        if (statement.target.type === 'VariableExpr') {
          environment.assign(statement.target.name, cloneLanguageValue(value));
        } else {
          const list = yield* this.evaluate(statement.target.list, environment);
          this.expectList(list, statement.target.list, 'assignment target');
          const index = yield* this.evaluate(statement.target.index, environment);
          const offset = this.expectIndex(index, list, statement.target.index, 'list assignment');
          list[offset] = cloneLanguageValue(value);
        }
        break;
      }
      case 'ExpressionStmt':
        yield* this.evaluate(statement.expression, environment);
        break;
      case 'IfStmt': {
        const condition = yield* this.evaluate(statement.condition, environment);
        this.expectBoolean(condition, statement.condition, 'IF condition');
        completion = yield* this.executeBlock(
          condition ? statement.consequent : statement.alternate ?? [],
          environment,
        );
        break;
      }
      case 'RepeatTimesStmt': {
        const count = yield* this.evaluate(statement.count, environment);
        if (!Number.isSafeInteger(count) || count < 0) {
          this.fail(
            'INVALID_REPEAT_COUNT',
            'REPEAT TIMES requires a nonnegative integer count.',
            statement.count,
            { details: { count } },
          );
        }
        for (let iteration = 0; iteration < count; iteration += 1) {
          yield* this.tick(statement, 'loop-iteration');
          completion = yield* this.executeBlock(statement.body, environment);
          if (completion instanceof ReturnCompletion) break;
        }
        break;
      }
      case 'RepeatUntilStmt': {
        for (;;) {
          const condition = yield* this.evaluate(statement.condition, environment);
          this.expectBoolean(condition, statement.condition, 'REPEAT UNTIL condition');
          if (condition) break;
          yield* this.tick(statement, 'loop-iteration');
          completion = yield* this.executeBlock(statement.body, environment);
          if (completion instanceof ReturnCompletion) break;
        }
        break;
      }
      case 'ForEachStmt': {
        const source = yield* this.evaluate(statement.iterable, environment);
        this.expectList(source, statement.iterable, 'FOR EACH source');
        const values = cloneLanguageValue(source);
        for (const value of values) {
          yield* this.tick(statement, 'loop-iteration');
          environment.assign(statement.item, cloneLanguageValue(value));
          completion = yield* this.executeBlock(statement.body, environment);
          if (completion instanceof ReturnCompletion) break;
        }
        break;
      }
      case 'ReturnStmt': {
        const value = yield* this.evaluate(statement.value, environment);
        if (value === VOID) {
          this.fail('VOID_VALUE', 'RETURN requires a value.', statement.value);
        }
        completion = new ReturnCompletion(cloneLanguageValue(value));
        break;
      }
      case 'ProcedureDecl':
        break;
      default:
        this.fail('UNKNOWN_STATEMENT', `Unknown statement ${statement.type}.`, statement);
    }
    this.capture(statement);
    return completion;
  }

  *evaluate(expression, environment) {
    yield* this.tick(expression, 'expression');
    switch (expression.type) {
      case 'LiteralExpr':
        return expression.value;
      case 'DirectionExpr':
        return freezeShallow({ __apDirection: expression.value });
      case 'ListExpr': {
        const list = [];
        for (const element of expression.elements) {
          const value = yield* this.evaluate(element, environment);
          if (value === VOID) this.fail('VOID_VALUE', 'A list element must have a value.', element);
          list.push(cloneLanguageValue(value));
        }
        return list;
      }
      case 'VariableExpr': {
        if (CALLABLE_KEYWORDS.has(expression.name)) return freezeShallow({ __builtin: expression.name });
        if (!environment.contains(expression.name)) {
          this.fail(
            'UNDEFINED_VARIABLE',
            `Variable ${expression.name} has not been assigned.`,
            expression,
          );
        }
        return environment.get(expression.name);
      }
      case 'IndexExpr': {
        const list = yield* this.evaluate(expression.list, environment);
        this.expectList(list, expression.list, 'indexed value');
        const index = yield* this.evaluate(expression.index, environment);
        const offset = this.expectIndex(index, list, expression.index, 'list access');
        return list[offset];
      }
      case 'UnaryExpr': {
        const value = yield* this.evaluate(expression.operand, environment);
        if (expression.operator === 'NOT') {
          return !this.expectBoolean(value, expression.operand, 'NOT operand');
        }
        const number = this.expectNumber(value, expression.operand, 'unary operand');
        const result = expression.operator === 'MINUS' ? -number : number;
        if (!Number.isFinite(result)) this.fail('NUMERIC_OVERFLOW', 'Numeric result is not finite.', expression);
        return result;
      }
      case 'LogicalExpr': {
        const left = yield* this.evaluate(expression.left, environment);
        this.expectBoolean(left, expression.left, `${expression.operator} left operand`);
        if (expression.operator === 'AND' && !left) return false;
        if (expression.operator === 'OR' && left) return true;
        const right = yield* this.evaluate(expression.right, environment);
        this.expectBoolean(right, expression.right, `${expression.operator} right operand`);
        return expression.operator === 'AND' ? left && right : left || right;
      }
      case 'BinaryExpr': {
        const left = yield* this.evaluate(expression.left, environment);
        const right = yield* this.evaluate(expression.right, environment);
        return this.evaluateBinary(expression, left, right);
      }
      case 'CallExpr':
        return yield* this.evaluateCall(expression, environment);
      default:
        this.fail('UNKNOWN_EXPRESSION', `Unknown expression ${expression.type}.`, expression);
    }
  }

  evaluateBinary(expression, left, right) {
    switch (expression.operator) {
      case 'EQ':
        return valuesEqual(left, right);
      case 'NEQ':
        return !valuesEqual(left, right);
      case 'GT':
      case 'GTE':
      case 'LT':
      case 'LTE': {
        this.expectNumber(left, expression.left, 'left comparison operand');
        this.expectNumber(right, expression.right, 'right comparison operand');
        if (expression.operator === 'GT') return left > right;
        if (expression.operator === 'GTE') return left >= right;
        if (expression.operator === 'LT') return left < right;
        return left <= right;
      }
      case 'PLUS':
      case 'MINUS':
      case 'STAR':
      case 'SLASH':
      case 'MOD': {
        this.expectNumber(left, expression.left, 'left arithmetic operand');
        this.expectNumber(right, expression.right, 'right arithmetic operand');
        let result;
        if (expression.operator === 'PLUS') result = left + right;
        else if (expression.operator === 'MINUS') result = left - right;
        else if (expression.operator === 'STAR') result = left * right;
        else if (expression.operator === 'SLASH') {
          if (right === 0) this.fail('DIVISION_BY_ZERO', 'Division by zero is not allowed.', expression.right);
          result = left / right;
        } else {
          if (!Number.isSafeInteger(left) || left < 0 || !Number.isSafeInteger(right) || right <= 0) {
            this.fail(
              'INVALID_MOD_OPERANDS',
              'For a MOD b, a must be a nonnegative integer and b must be a positive integer.',
              expression,
              { details: { a: left, b: right } },
            );
          }
          result = left % right;
        }
        if (!Number.isFinite(result)) {
          this.fail('NUMERIC_OVERFLOW', 'Numeric result is outside the finite range.', expression);
        }
        return result;
      }
      default:
        this.fail('UNKNOWN_OPERATOR', `Unknown operator ${expression.operator}.`, expression);
    }
  }

  *evaluateCall(call, environment) {
    if (call.callee.type !== 'VariableExpr') {
      this.fail('NOT_CALLABLE', 'Only a named procedure or built-in can be called.', call.callee);
    }
    const name = call.callee.name;
    if (BUILTIN_NAMES.has(name)) return yield* this.callBuiltin(name, call, environment);
    const declaration = this.procedures.get(name);
    if (!declaration) {
      this.fail('UNDEFINED_PROCEDURE', `PROCEDURE ${name} is not defined.`, call.callee);
    }
    if (call.args.length !== declaration.params.length) {
      this.fail(
        'ARITY_MISMATCH',
        `${name} expects ${declaration.params.length} argument(s), but ${call.args.length} were supplied.`,
        call,
        { details: { expected: declaration.params.length, actual: call.args.length } },
      );
    }
    if (this.callStack.length >= this.maxCallDepth) {
      this.fail(
        'CALL_DEPTH_LIMIT',
        `Procedure call depth exceeded ${this.maxCallDepth}.`,
        call,
        { details: { maxCallDepth: this.maxCallDepth } },
      );
    }
    const values = [];
    for (const argument of call.args) {
      const value = yield* this.evaluate(argument, environment);
      if (value === VOID) this.fail('VOID_VALUE', 'Procedure arguments must have values.', argument);
      values.push(cloneLanguageValue(value));
    }
    const local = new Environment(this.global, false);
    declaration.params.forEach((parameter, index) => {
      local.define(parameter.name, cloneLanguageValue(values[index]));
    });
    const frame = {
      name,
      callLoc: copyLoc(call.loc),
      definitionLoc: copyLoc(declaration.loc),
    };
    this.callStack.push(frame);
    try {
      const completion = yield* this.executeBlock(declaration.body, local);
      return completion instanceof ReturnCompletion
        ? cloneLanguageValue(completion.value)
        : VOID;
    } finally {
      this.callStack.pop();
    }
  }

  checkArity(name, call, expected) {
    if (call.args.length !== expected) {
      this.fail(
        'ARITY_MISMATCH',
        `${name} expects ${expected} argument(s), but ${call.args.length} were supplied.`,
        call,
        { details: { expected, actual: call.args.length } },
      );
    }
  }

  *evaluateArgs(call, environment) {
    const values = [];
    for (const argument of call.args) values.push(yield* this.evaluate(argument, environment));
    return values;
  }

  *callBuiltin(name, call, environment) {
    switch (name) {
      case 'DISPLAY': {
        this.checkArity(name, call, 1);
        const [value] = yield* this.evaluateArgs(call, environment);
        if (value === VOID) {
          this.fail('VOID_VALUE', 'DISPLAY requires an expression with a value.', call.args[0]);
        }
        let text;
        try {
          text = renderValue(value);
        } catch {
          this.fail('VOID_VALUE', 'DISPLAY requires an expression with a value.', call.args[0]);
        }
        const chunk = `${text} `;
        this.outputEntries.push(chunk);
        this.recordEvent({
          type: 'display',
          text,
          chunk,
          value: cloneForPublic(value),
          loc: copyLoc(call.loc),
        });
        return VOID;
      }
      case 'INPUT': {
        this.checkArity(name, call, 0);
        let value;
        let queueIndex = null;
        let source = 'provider';
        if (this.inputIndex < this.inputQueue.length) {
          queueIndex = this.inputIndex;
          value = this.inputQueue[this.inputIndex++];
          source = 'queue';
        } else {
          this.inputRequestCount += 1;
          value = yield {
            type: 'input-request',
            requestId: this.inputRequestCount,
            inputNumber: this.inputCount + 1,
            loc: copyLoc(call.loc),
          };
        }
        if (!isLanguageValue(value)) {
          this.fail(
            'INVALID_INPUT_VALUE',
            'The supplied input is not a supported AP CSP value.',
            call,
            { details: { queueIndex, source } },
          );
        }
        this.inputCount += 1;
        this.recordEvent({
          type: 'input',
          value: cloneForPublic(value),
          queueIndex,
          source,
          loc: copyLoc(call.loc),
        });
        return cloneLanguageValue(value);
      }
      case 'RANDOM': {
        this.checkArity(name, call, 2);
        const [a, b] = yield* this.evaluateArgs(call, environment);
        if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a > b) {
          this.fail(
            'INVALID_RANDOM_RANGE',
            'RANDOM(a, b) requires safe integers with a less than or equal to b.',
            call,
            { details: { a, b } },
          );
        }
        const width = b - a + 1;
        if (!Number.isSafeInteger(width) || width < 1) {
          this.fail('INVALID_RANDOM_RANGE', 'The RANDOM range is too large.', call);
        }
        const sample = this.rng();
        if (typeof sample !== 'number' || !Number.isFinite(sample) || sample < 0 || sample >= 1) {
          this.fail(
            'INVALID_RNG_RESULT',
            'The injected rng must return a finite number from 0 (inclusive) to 1 (exclusive).',
            call,
            { details: { sample } },
          );
        }
        return a + Math.floor(sample * width);
      }
      case 'LENGTH': {
        this.checkArity(name, call, 1);
        const [list] = yield* this.evaluateArgs(call, environment);
        return this.expectList(list, call.args[0], 'LENGTH argument').length;
      }
      case 'INSERT': {
        this.checkArity(name, call, 3);
        const [list, index, value] = yield* this.evaluateArgs(call, environment);
        this.expectList(list, call.args[0], 'INSERT list');
        if (value === VOID) this.fail('VOID_VALUE', 'INSERT requires a value.', call.args[2]);
        const offset = this.expectIndex(index, list, call.args[1], 'INSERT', true);
        list.splice(offset, 0, cloneLanguageValue(value));
        return VOID;
      }
      case 'APPEND': {
        this.checkArity(name, call, 2);
        const [list, value] = yield* this.evaluateArgs(call, environment);
        this.expectList(list, call.args[0], 'APPEND list');
        if (value === VOID) this.fail('VOID_VALUE', 'APPEND requires a value.', call.args[1]);
        list.push(cloneLanguageValue(value));
        return VOID;
      }
      case 'REMOVE': {
        this.checkArity(name, call, 2);
        const [list, index] = yield* this.evaluateArgs(call, environment);
        this.expectList(list, call.args[0], 'REMOVE list');
        const offset = this.expectIndex(index, list, call.args[1], 'REMOVE');
        list.splice(offset, 1);
        return VOID;
      }
      case 'MOVE_FORWARD':
        this.checkArity(name, call, 0);
        this.requireRobot(call);
        this.moveRobot(call);
        return VOID;
      case 'ROTATE_LEFT':
        this.checkArity(name, call, 0);
        this.requireRobot(call);
        this.rotateRobot(-1, name, call);
        return VOID;
      case 'ROTATE_RIGHT':
        this.checkArity(name, call, 0);
        this.requireRobot(call);
        this.rotateRobot(1, name, call);
        return VOID;
      case 'CAN_MOVE': {
        this.checkArity(name, call, 1);
        this.requireRobot(call);
        const [direction] = yield* this.evaluateArgs(call, environment);
        if (!direction || typeof direction !== 'object' || !direction.__apDirection) {
          this.fail(
            'INVALID_ROBOT_RELATIVE_DIRECTION',
            'CAN_MOVE requires one unquoted direction: forward, backward, left, or right.',
            call.args[0],
          );
        }
        const canMove = this.canRobotMove(direction.__apDirection);
        const event = {
          action: 'CAN_MOVE',
          relativeDirection: direction.__apDirection,
          success: canMove,
          row: this.robot.row,
          column: this.robot.column,
          direction: this.robot.direction,
          state: publicRobot(this.robot),
          loc: copyLoc(call.loc),
        };
        this.robotTrace.push(event);
        this.recordEvent({ type: 'robot', ...event });
        return canMove;
      }
      default:
        this.fail('UNKNOWN_BUILTIN', `Unknown built-in ${name}.`, call);
    }
  }

  requireRobot(call) {
    if (!this.robot) {
      this.fail(
        'ROBOT_NOT_CONFIGURED',
        'This program uses robot commands, but no robot grid was configured.',
        call,
      );
    }
  }

  absoluteDirection(relativeDirection) {
    const current = CARDINALS.indexOf(this.robot.direction);
    return CARDINALS[(current + RELATIVE_TURNS[relativeDirection] + 4) % 4];
  }

  robotTarget(relativeDirection) {
    const direction = this.absoluteDirection(relativeDirection);
    const [rowDelta, columnDelta] = DELTAS[direction];
    return {
      row: this.robot.row + rowDelta,
      column: this.robot.column + columnDelta,
      direction,
    };
  }

  canRobotMove(relativeDirection) {
    const target = this.robotTarget(relativeDirection);
    return (
      target.row >= 1 &&
      target.row <= this.robot.rows &&
      target.column >= 1 &&
      target.column <= this.robot.columns &&
      !this.robot.blocked.has(`${target.row},${target.column}`)
    );
  }

  moveRobot(call) {
    const before = publicRobot(this.robot);
    const target = this.robotTarget('forward');
    if (!this.canRobotMove('forward')) {
      const event = {
        action: 'MOVE_FORWARD',
        success: false,
        row: this.robot.row,
        column: this.robot.column,
        direction: this.robot.direction,
        before,
        after: publicRobot(this.robot),
        attempted: { row: target.row, column: target.column },
        loc: copyLoc(call.loc),
      };
      this.robotTrace.push(event);
      this.recordEvent({ type: 'robot', ...event });
      this.fail(
        'INVALID_ROBOT_MOVE',
        'MOVE_FORWARD would leave the grid or enter a blocked cell.',
        call,
        { details: { attempted: event.attempted } },
      );
    }
    this.robot.row = target.row;
    this.robot.column = target.column;
    const event = {
      action: 'MOVE_FORWARD',
      success: true,
      row: this.robot.row,
      column: this.robot.column,
      direction: this.robot.direction,
      before,
      after: publicRobot(this.robot),
      loc: copyLoc(call.loc),
    };
    this.robotTrace.push(event);
    this.recordEvent({ type: 'robot', ...event });
  }

  rotateRobot(amount, action, call) {
    const before = publicRobot(this.robot);
    const index = CARDINALS.indexOf(this.robot.direction);
    this.robot.direction = CARDINALS[(index + amount + 4) % 4];
    const event = {
      action,
      success: true,
      row: this.robot.row,
      column: this.robot.column,
      direction: this.robot.direction,
      before,
      after: publicRobot(this.robot),
      loc: copyLoc(call.loc),
    };
    this.robotTrace.push(event);
    this.recordEvent({ type: 'robot', ...event });
  }
}

function describeType(value) {
  if (value === VOID) return 'no value';
  if (Array.isArray(value)) return 'list';
  return typeof value;
}

function valuesEqual(left, right, seen = new Map()) {
  if (typeof left !== typeof right) return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  if (!Array.isArray(left)) return Object.is(left, right) || left === right;
  if (left.length !== right.length) return false;
  if (seen.get(left) === right) return true;
  seen.set(left, right);
  for (let index = 0; index < left.length; index += 1) {
    if (!valuesEqual(left[index], right[index], seen)) return false;
  }
  return true;
}

function isLanguageValue(value, seen = new Set()) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (!Array.isArray(value)) return false;
  if (seen.has(value)) return false;
  seen.add(value);
  const valid = value.every((item) => isLanguageValue(item, seen));
  seen.delete(value);
  return valid;
}

function normalizeError(error, runtime = null) {
  if (error instanceof APCSPError) return error;
  return languageError(
    'internal',
    'INTERNAL_ERROR',
    'The interpreter encountered an unexpected internal error.',
    runtime?.currentLoc ?? null,
    { details: { originalMessage: String(error?.message ?? error) }, cause: error },
  );
}

function waitForProvider(valueOrPromise, signal) {
  if (!signal) return Promise.resolve(valueOrPromise);
  if (signal.aborted) {
    return Promise.reject(languageError('runtime', 'ABORTED', 'Execution was stopped.', null));
  }
  return new Promise((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(languageError('runtime', 'ABORTED', 'Execution was stopped.', null));
    };
    const cleanup = () => signal.removeEventListener('abort', abort);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(valueOrPromise).then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

export class Execution {
  constructor(sourceOrAst, options = {}) {
    this.options = { ...options };
    this.error = null;
    this.done = false;
    this.runtime = null;
    this.program = null;
    this.iterator = null;
    this.eventCursor = 0;
    this.waitingForInput = null;
    this.resumeValue = NO_RESUME_VALUE;
    try {
      this.program =
        typeof sourceOrAst === 'string' ? parseProgram(sourceOrAst) : sourceOrAst;
      if (!this.program || this.program.type !== 'Program') {
        throw languageError(
          'configuration',
          'INVALID_AST',
          'Execution requires source text or a Program AST.',
          null,
        );
      }
      // Validate caller-supplied ASTs too.
      validateProgram(this.program);
      this.runtime = new Runtime(this.program, this.options);
      this.iterator = this.runtime.executeProgram();
    } catch (error) {
      this.error = normalizeError(error, this.runtime);
      this.done = true;
    }
  }

  abort(message = 'Execution was stopped.') {
    if (this.done) return;
    this.error = languageError(
      'runtime',
      'ABORTED',
      message,
      this.runtime?.currentLoc ?? null,
      { callStack: this.runtime?.callStack ?? [] },
    );
    try {
      this.iterator?.return();
    } catch {
      // The structured ABORTED result remains authoritative.
    }
    this.done = true;
    this.waitingForInput = null;
  }

  provideInput(value) {
    if (!this.waitingForInput) {
      throw languageError(
        'runtime',
        'INPUT_NOT_REQUESTED',
        'The program is not currently waiting for INPUT().',
        this.runtime?.currentLoc ?? null,
      );
    }
    if (!isLanguageValue(value)) {
      throw languageError(
        'runtime',
        'INVALID_INPUT_VALUE',
        'The supplied input is not a supported AP CSP value.',
        this.waitingForInput.loc,
      );
    }
    this.resumeValue = cloneLanguageValue(value);
    this.waitingForInput = null;
    return this;
  }

  step(maxSteps = 1) {
    if (!Number.isSafeInteger(maxSteps) || maxSteps < 1) {
      throw languageError(
        'configuration',
        'INVALID_CHUNK_SIZE',
        'step() requires a positive integer.',
        null,
      );
    }
    const startedAtEvent = this.runtime?.events.length ?? 0;
    let checkpoints = 0;
    while (!this.done && !this.waitingForInput && checkpoints < maxSteps) {
      try {
        const next =
          this.resumeValue === NO_RESUME_VALUE
            ? this.iterator.next()
            : this.iterator.next(this.takeResumeValue());
        if (next.done) {
          this.done = true;
          break;
        }
        if (next.value?.type === 'input-request') {
          this.waitingForInput = cloneForPublic(next.value);
          break;
        }
        checkpoints += 1;
      } catch (error) {
        this.error = normalizeError(error, this.runtime);
        this.done = true;
      }
    }
    const events = this.runtime
      ? cloneForPublic(this.runtime.events.slice(startedAtEvent))
      : [];
    this.eventCursor = this.runtime?.events.length ?? 0;
    return {
      done: this.done,
      waitingForInput: cloneForPublic(this.waitingForInput),
      steps: this.runtime?.steps ?? 0,
      events,
      result: this.done ? this.getResult() : null,
    };
  }

  takeResumeValue() {
    const value = this.resumeValue;
    this.resumeValue = NO_RESUME_VALUE;
    return value;
  }

  run() {
    while (!this.done) {
      this.step(10_000);
      if (!this.waitingForInput) continue;
      const provider = this.options.inputProvider;
      if (typeof provider !== 'function') break;
      let value;
      try {
        value = provider(cloneForPublic(this.waitingForInput));
      } catch (error) {
        this.error = languageError(
          'runtime',
          'INPUT_PROVIDER_ERROR',
          'The input provider failed.',
          this.waitingForInput.loc,
          { details: { originalMessage: String(error?.message ?? error) }, cause: error },
        );
        this.done = true;
        this.waitingForInput = null;
        break;
      }
      if (value && typeof value.then === 'function') {
        this.error = languageError(
          'configuration',
          'ASYNC_INPUT_PROVIDER_IN_SYNC_RUN',
          'runProgram cannot use an asynchronous inputProvider; use runProgramAsync.',
          this.waitingForInput.loc,
        );
        this.done = true;
        this.waitingForInput = null;
        break;
      }
      try {
        this.provideInput(value);
      } catch (error) {
        this.error = normalizeError(error, this.runtime);
        this.done = true;
        this.waitingForInput = null;
        break;
      }
    }
    const result = this.getResult();
    if (!result.ok && this.options.throwOnError && this.error) {
      const error = this.error;
      error.partialResult = result;
      throw error;
    }
    return result;
  }

  async runAsync({
    chunkSize = this.options.chunkSize ?? DEFAULT_CHUNK_SIZE,
    signal = this.options.signal,
    shouldAbort = this.options.shouldAbort,
    inputProvider = this.options.inputProvider,
  } = {}) {
    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
      throw languageError(
        'configuration',
        'INVALID_CHUNK_SIZE',
        'chunkSize must be a positive safe integer.',
        null,
      );
    }
    while (!this.done) {
      if (signal?.aborted || (typeof shouldAbort === 'function' && (await shouldAbort()))) {
        this.abort();
        break;
      }
      this.step(chunkSize);
      if (this.waitingForInput) {
        if (typeof inputProvider !== 'function') break;
        try {
          const value = await waitForProvider(
            inputProvider(cloneForPublic(this.waitingForInput), { signal }),
            signal,
          );
          if (signal?.aborted) {
            this.abort();
            break;
          }
          this.provideInput(value);
        } catch (error) {
          if (signal?.aborted || error?.code === 'ABORTED' || error?.name === 'AbortError') {
            this.abort();
          } else if (error instanceof APCSPError) {
            this.error = error;
            this.done = true;
            this.waitingForInput = null;
          } else {
            this.error = languageError(
              'runtime',
              'INPUT_PROVIDER_ERROR',
              'The input provider failed.',
              this.waitingForInput?.loc ?? this.runtime?.currentLoc ?? null,
              { details: { originalMessage: String(error?.message ?? error) }, cause: error },
            );
            this.done = true;
            this.waitingForInput = null;
          }
          break;
        }
      }
      if (!this.done) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const result = this.getResult();
    if (!result.ok && this.options.throwOnError && this.error) {
      const error = this.error;
      error.partialResult = result;
      throw error;
    }
    return result;
  }

  snapshot() {
    return this.runtime
      ? this.runtime.snapshot()
      : {
          globals: {},
          inputConsumed: 0,
          inputRemaining: [],
          robot: null,
          robotTrace: [],
          steps: 0,
          output: '',
          outputEntries: [],
          events: [],
          snapshots: [],
        };
  }

  getResult() {
    const state = this.snapshot();
    const pendingInputError = this.waitingForInput
      ? languageError(
          'runtime',
          'INPUT_REQUIRED',
          'The program is paused waiting for an INPUT() value.',
          this.waitingForInput.loc,
          {
            hint: 'Call provideInput(value) on the Execution, or pass inputProvider to runProgramAsync.',
            details: {
              requestId: this.waitingForInput.requestId,
              inputNumber: this.waitingForInput.inputNumber,
            },
          },
        )
      : null;
    const error = (this.error ?? pendingInputError)?.toJSON() ?? null;
    return {
      ok: this.done && !error,
      status: this.waitingForInput ? 'input-required' : this.done ? (error ? 'error' : 'completed') : 'running',
      inputRequest: cloneForPublic(this.waitingForInput),
      output: state.output,
      outputEntries: [...state.outputEntries],
      events: cloneForPublic(state.events),
      globals: cloneForPublic(state.globals),
      state: {
        globals: cloneForPublic(state.globals),
        inputConsumed: state.inputConsumed,
        inputRemaining: cloneForPublic(state.inputRemaining),
        robot: cloneForPublic(state.robot),
        steps: state.steps,
      },
      robot: cloneForPublic(state.robot),
      robotTrace: cloneForPublic(state.robotTrace),
      snapshots: cloneForPublic(state.snapshots),
      steps: state.steps,
      inputConsumed: state.inputConsumed,
      aliasesUsed: cloneForPublic(this.program?.aliasesUsed ?? []),
      error,
    };
  }
}

/** Create a resumable execution. `step(n)` advances at most n AST checkpoints. */
export function createExecution(sourceOrAst, options = {}) {
  return new Execution(sourceOrAst, options);
}

/** Run synchronously. Known language errors are returned as `{ok:false,error}`. */
export function runProgram(sourceOrAst, options = {}) {
  return createExecution(sourceOrAst, options).run();
}

/**
 * Run cooperatively, yielding to the event loop between chunks. AbortSignal and
 * `shouldAbort` are checked at each boundary, which keeps a file:// UI stoppable.
 */
export async function runProgramAsync(sourceOrAst, options = {}) {
  const execution = createExecution(sourceOrAst, options);
  return execution.runAsync({
    chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE,
    signal: options.signal,
    shouldAbort: options.shouldAbort,
  });
}

export default runProgram;
