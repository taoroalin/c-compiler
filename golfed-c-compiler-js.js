regexControlChars = "+-^|*()[]{}./"

escapeRegex = (text) => {
  let result = ""
  for (let letter of text) {
    if (regexControlChars.indexOf(letter) > -1) {
      result += "\\"
    }
    result += letter
  }
  return result
}

// need to keep in mind that any token that can be a prefix of another token
// needs to appear later

// biggest token first!
literalTokens = [
  // accessors
  `->`, `.`,

  // boolean
  `&&`, `||`, `!`,

  // bitwise
  `|`, `&`, `>>`, `<<`,
  `^`, // bitwise xor
  `~`, // bitwise not

  // arithmetic
  `++`, `--`, `+`, `-`, `*`, `/`, `%`,

  // comparison
  `==`, `!=`, `>=`, `<=`, `>`, `<`,

  // assignment
  // I'm trying parsing += and such in the parser instead of the lexer
  `=`,

  `;`, // cuz c needs it...
  `,`,

  // brackets
  `(`, `)`,
  `[`, `]`,
  `{`, `}`,
]

// all groups have to be non capturing
regexTokens = {
  float: `[0-9]+\\.[0-9]+`, // need to check exact C float rules
  int: `[0-9]+`,
  string: `"(?:[^"]|\\")*"`,
  char: `'(?:[^']|\\')*'`,
  label: `\\n[a-zA-Z0-9_]+:`,
  directive: `#[a-zA-Z0-9_]+`,
  name: `[a-zA-Z0-9_]+`,
  linecomment: `//[^\\n]*\\n`,
  blockcomment: `/\\*(?:[^*]|\\*[^/])*\\*/`,
  whitespace: `\\s+`,
}

regexStringForm = Object.keys(regexTokens).reduce((acc, cur) => acc + `(?<${cur}>${regexTokens[cur]})|`, "")
regexStringForm += literalTokens.reduce((acc, cur) => acc + `${escapeRegex(cur[0])}|`, "")
regexStringForm = regexStringForm.substring(0, regexStringForm.length - 1)
console.log(regexStringForm)
regex = RegExp(regexStringForm, 'gs')

console.log(regex)

let keywords = { for: 1, while: 1, do: 1, break: 1, continue: 1, if: 1, else: 1, switch: 1, case: 1, default: 1, goto: 1, typedef: 1, struct: 1, union: 1, sizeof: 1, void: 1, return: 1, register: 1, auto: 1, volatile: 1, static: 1, extern: 1, const: 1, unsigned: 1, int: 1, short: 1, long: 1, double: 1, float: 1, char: 1 }

let directives = { define: 1, include: 1, undef: 1, ifdef: 1, ifndef: 1, if: 1, else: 1, elif: 1, endif: 1, error: 1, pragma: 1 }

/**
to finish today:
while, for, if, else, int, float, +,-,*,/
*/

lexC = (text) => {
  let lexIndex = 0
  console.log("lexing: " + text)
  const tokens = []
  for (let match of text.matchAll(regex)) {
    if (match.index != lexIndex) {
      throw new SyntaxError(`Can't lex ${text.substring(lexIndex, match.index)} at position ${lexIndex}`)
    }

    const str = match[0]
    if (match.groups.whitespace ||
      match.groups["linecomment"] ||
      match.groups["blockcomment"]) {
      lexIndex = match.index + str.length
      continue
    }

    const result = { text: str }
    if (match.groups.directive) {
      if (!directives[str.substring(1)]) {
        throw new SyntaxError(`Can't lex # directive ${str.substring(1)}`)
      }
    }
    if (match.groups.name) {
      if (keywords[str])
        result.keyword = str
      else
        result.name = str
    }
    if (match.groups.string)
      result.string = str.substring(1, str.length - 1)
    if (match.groups.char)
      result.char = str.substring(1, str.length - 1)
    if (match.groups.int)
      result.int = parseInt(str)
    if (match.groups.float)
      result.float = parseFloat(str)
    tokens.push(result)
    lexIndex = match.index + str.length
  }
  if (lexIndex != text.length) {
    throw new SyntaxError(`Can't lex ${text.substring(lexIndex)} at position ${lexIndex}`)
  }
  tokens.push({ end: true })
  console.log(tokens)
  return tokens
}

parseC = (text) => {
  const tokens = lexC(text)

  let idx = 0

  // a sort of rewind wrapper. It tries a parse, if that fails it resets the idx
  const p = (f) => {
    const startIdx = idx
    const result = f()
    if (result) return result
    idx = startIdx
  }

  const eat = () => {
    const result = tokens[idx]
    idx++
    return result
  }

  // can you parse from here based on one token? 
  // don't know if it's a varible or function definition if it starts with [type name]
  // for that reason not going for a predictive parser rn
  // parseStatement

  // once the ast is typechecked, all the types will be deduplicated 
  // and each value will have a pointer to its type object

  // before typechecking each type will essentilly be a bag of booleans
  // major types: int float char string array struct

  const parserUnion = (...parsers) => {
    const startIdx = idx
    for (let parser of parsers) {
      const result = parser()
      if (result) return result
      idx = startIdx
    }
  }

  // block is just statements + curly braces
  // currently block doesn't parse {}
  const parseBlock = () => {
    if (eat().text !== "{") return
    const result = p(parseStatements)
    if (result === undefined) return
    if (eat().text !== "}") return
    return result
  }

  const parseStatements = () => {
    const node = { astType: "statements", statements: [] }
    while (true) {
      const statement = p(parseStatement)
      if (statement) node.statements.push(statement)
      else break
    }
    if (node.statements.length > 0) return node
  }

  const parseStatement = () => parserUnion(parseDeclaration, parseFunctionDeclaration, parseControlFlow, parseExpressionStatement)

  const parseExpressionStatement = () => {
    const node = { astType: "expressionStatement", expression: undefined }
    node.expression = p(parseExpression)
    if (eat().text !== ";") return
    return node
  }

  // lone block is considered control flow
  const parseControlFlow = () => parserUnion(parseWhile, parseControlFlowOneLiner, parseFor, parseIf, parseDoWhile, parseBlock)

  const parseWhile = () => {
    const node = { astType: "while", condition: undefined, body: undefined }
    if (eat().keyword !== "while") return
    if (eat().text !== "(") return
    node.condition = p(parseExpression)
    if (!node.condition) return
    if (eat().text !== ")") return
    node.body = p(parseBlock)
    if (node.body === undefined) return
    return node
  }

  const parseFor = () => {
    const node = { astType: "for", setup: undefined, condition: undefined, increment: undefined, body: undefined }

    if (eat().keyword !== "for") return

    if (eat().text !== "(") return

    node.setup = p(parseStatement)
    if (!node.setup) return

    node.condition = p(parseStatement)
    if (!node.condition) return

    node.increment = p(parseExpression)
    if (!node.increment) return

    if (eat().text !== ")") return

    node.body = p(parseBlock)
    if (!node.body) return
    return node
  }

  const parseIf = () => {
    if (eat().keyword !== "if") return
    if (eat().text !== "(") return
    const node = { astType: "while", condition: undefined, body: undefined }
    node.condition = p(parseExpression)
    if (!node.condition) return
    if (eat().text !== ")") return
    node.body = p(parseBlock)
    if (node.body === undefined) return
    // @TODO handle else
    return node
  }

  const parseDoWhile = () => {
    const node = { astType: "doWhile", condition: undefined, body: undefined }
    if (eat().keyword !== "do") return
    node.body = p(parseBlock)
    if (node.body === undefined) return
    if (eat().keyword !== "while") return
    if (eat().text !== "(") return
    node.condition = p(parseExpression)
    if (!node.condition) return
    if (eat().text !== ")") return
    if (eat().text !== ";") return
    return node
  }

  // return is considered control flow one liner
  const parseControlFlowOneLiner = () => {
    const result = { astType: undefined, gotoLabel: undefined }
    switch (tokens[idx].keyword) {
      case "break":
        idx++
        node.astType = "break"
        break
      case "continue":
        idx++
        node.astType = "continue"
        break
      case "goto":
        idx++
        if (tokens[idx].name) {
          node.astType = "goto"
          node.gotoLabel = tokens[idx].name
          idx++
        } else return
        break
      case "return":
        idx++
        node.expression = p(parseExpression)
        if (node.expression !== undefined) return
        break
      default:
        return
    }
    if (tokens[idx].text !== ";") return
    idx++
    return result
  }

  const parseFunctionDeclaration = () => {

  }

  const parseDeclaration = () => {
    const node = { astType: "declaration", type: undefined, name: undefined, expression: undefined }

    node.type = p(parseType)
    if (!node.type) return

    node.name = eat().name
    if (!node.name) return

    if (eat().text !== "=") return

    node.expression = p(parseExpression)
    if (!node.expression) return

    if (eat().text !== ";") return

    return node
  }


  const parseType = () => {
    const result = { astType: "type", typeTag: undefined }
    const token = tokens[idx]
    if (!token.keyword) {
      return
    }
    switch (token.keyword) {
      case "int":
        result.typeTag = "int"
        idx++
        break
      case "float":
        result.typeTag = "float"
        idx++
        break
      default:
        return
    }
    return result
  }

  const parseExpression = () => parserUnion(parseLiteral,
    parseOperatorExpression,
    parseFunctionApplication,
    parseVariable,
    parseParenthesizedExpression)

  const parseVariable = () => {
    const name = eat().name;
    if (name === undefined) return
    return { astType: "variable", name }
  }

  const parseLiteral = () => {
    let token = eat()

    if (token.int !== undefined) {// because int can be zero
      const type = { astType: "type", typeTag: "int", size: 32, unsigned: false }
      return { astType: "expression", expressionType: "literal", type, value: token.int }

    } else if (token.float !== undefined) {// because int can be zero
      const type = { astType: "type", typeTag: "float", size: 64 }
      return { astType: "expression", expressionType: "literal", type, value: token.float }

    } else if (token.char !== undefined) {// because int can be zero
      const type = { astType: "type", typeTag: "char", size: token.char.length }
      return { astType: "expression", expressionType: "literal", type, value: token.char }

    } else if (token.string !== undefined) {// because int can be zero
      const type = { astType: "type", typeTag: "string", size: token.string.length + 1 }
      return { astType: "expression", expressionType: "literal", type, value: token.string }

    }
  }

  // op levels are ascending so things that aren't part of expressions (outermost level) can have oplevel undefined
  const parseOperatorExpression = () => {

  }

  const parseFunctionApplication = () => {
    // I prefer the word parameter over argument. less agressive
    const node = { astType: "application", name: undefined, parameters: [] }
    node.name = eat().name
    if (!node.name) return
    if (eat().text !== "(") return
    if (tokens[idx].text === ")") {
      idx++
      return node
    }
    for (let i = 0; i !== "end";) {
      const parameter = p(parseExpression)
      if (!parameter) return
      node.parameters.push(parameter)
      switch (eat().text) {
        case ")":
          i = "end"
          break
        case ",":
          break
        default:
          return
      }
    }
    return node
  }

  // parseParenthesizedExpression = parseSeries(parseChar("("), ["singular", parseExpression], parseChar(")"))
  const parseParenthesizedExpression = () => {
    if (tokens[idx].text !== "(") return
    idx++
    const result = p(parseExpression)
    if (result === undefined) return
    if (tokens[idx].text !== ")") return
    idx++
    return result
  }

  return p(parseStatements)
}



const defaultTypes = {
  s64: { typeTag: "int", size: 64, unsigned: false },
  s32: { typeTag: "int", size: 32, unsigned: false },
  f32: { typeTag: "float", size: 32 },
  f64: { typeTag: "float", size: 64 },
}

const _astTypes = "expression statements statement declaration type while for if "
const _expressionTypes = "literal operatorExpression application"

// how to identify types???????????? Now again I think I'm going with s8, s16, ect...
typecheckC = (ast) => {
  const typedAst = { structs: {}, types: defaultTypes, functions: {}, globals: {}, main: undefined }
  /**
  context:
  current function
  control flow stack
  
  
  function info:
  input type
  output type
  block
  
  block info:
  block type
  variables
    name
    statement number where defined (because var can shadow another half way through)
  
  
  
   */

  /**
  whatevs. I'm gonna ignore break and shadowing so I don't have to keep track of scopes, only functions
  (kinda get why original JS didn't have thos :( )
  
   */
  // can identify functions by name only because C doesn't have function overloading

  const typecheckPassthrough = (node) => {
    for (let statement of node.statements || []) {
      typecheck(statement)
    }
    if (node.body) typecheck(node.body)
    if (node.condition) typecheck(node.condition)
    if (node.setup) typecheck(node.setup)
    if (node.comparison) typecheck(node.comparison)
    if (node.increment) typecheck(node.increment)
  }

  let context = { functionName: "$GLOBAL$", }
  const typecheck = (node) => {
    console.log(node)
    switch (node.astType) {
      case "declaration":
        asif
        break
      case "expression":
        switch (node.expressionType) {

        }
        break
      case "type":
        break

      case "statements":
      case "while":
      case "for":
      case "goto": // goto must be within the same function in C. otherwise use longjump
        // but longjump originally only copied registers not stack, but now it usually copies stack too
        typecheckPassthrough(node)
        break;
      default:
        throw new Error(`astType not recognized by typechecker: ${node.astType}`)
    }
  }

  typecheck(ast)

  // throw new TypeError("yo you got a type error")
  return typedAst
}


generateBinary = (typedAst) => {
  /**
  when I generate function calls, control flows, pointers, such, I will have to know their positions. 
  How I'm thinking of doing this is by generating exe with placeholder pointers, putting executable position into the ast, then walking the ast again and setting the pointers 
  */

  /**
  What instructions will I need?
  
  lea
  add
  
  jump
  jle
  jeq
  
  // minimal set of instructions (while still leveraging the alu)
  
  ret
  jle
  lea
  add
  mult
  
  
   */

}

parseAndTypecheck = (text) => {
  const ast = parseC(text)
  const typedAst = typecheckC(ast)
  return typedAst
}

compileC = (text) => {
  const ast = parseC(text)
  const typedAst = typecheckC(ast)
  const binary = generateBinary(typedAst)
  return binary
}


interpretC = (typedAst) => {

}


interpretC = (text) => {
  const ast = parseC(text)
  const typedAst = typecheckC(ast)
  cMemory = new ArrayBuffer(1_000_000)
  interpretC(typedAst, cMemory)
  return cMemory
}
// static in C is WEIRD!
// it lets you define a global variable inside a function that's only visible inside that function.
