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
  `->`,
  `.`,

  // boolean
  `&&`,
  `||`,
  `!`,

  // bitwise
  `|`,
  `&`,
  `>>`,
  `<<`,
  `^`,
  `~`,

  // arithmetic
  `++`,
  `--`,
  `+`,
  `-`,
  `*`,
  `/`,
  `%`,

  // comparison
  `==`,
  `!=`,
  `>=`,
  `<=`,
  `>`,
  `<`,

  // assignment
  // I'm trying parsing += and such in the parser instead of the lexer
  `=`,

  `;`, // cuz c needs it...
  `,`,

  // brackets
  `(`,
  `)`,
  `[`,
  `]`,
  `{`,
  `}`,
]

// all groups have to be non capturing
regexTokens = [
  [`[0-9]+\\.[0-9]+`, `float`], // need to check exact C float rules
  [`[0-9]+`, `int`],

  [`"(?:[^"]|\\")*"`, `string`],
  [`'(?:[^']|\\')*'`, `char`],

  [`\\n[a-zA-Z0-9_]+:`, `label`],
  [`#[a-zA-Z0-9_]+`, `directive`],
  [`[a-zA-Z0-9_]+`, `name`],

  [`//[^\\n]*\\n`, `linecomment`],
  [`/\\*(?:[^*]|\\*[^/])*\\*/`, `blockcomment`],

  [`\\s+`, `whitespace`],
]

regexStringForm = regexTokens.reduce((acc, cur) => acc + `(?<${cur[1]}>${cur[0]})|`, "")
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
  console.log(tokens)

  let idx = 0

  // a sort of rewind wrapper. It tries a parse, if that fails it resets the idx
  const p = (f) => {
    const startIdx = idx
    const result = f()
    if (result) return result
    idx = startIdx
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

  // parser series is more complicated because you need to combine the results somehow
  const parserSeries = (...parsers) => {
    const startIdx = idx
    for (let parser of parsers) {
      const result = parser()
      if (result !== undefined) return // @INPROGRESS
    }
  }

  // block is just statements + curly braces
  const parseBlock = () => {
    if (tokens[idx].text !== "{") return
    idx++
    const result = p(parseStatements)
    if (result === undefined) return
    if (tokens[idx].text !== "}") return
    idx++
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

  const parseStatement = () => parserUnion(parseDeclaration, parseFunctionDeclaration, parseControlFlow)

  const parseControlFlow = () => parserUnion(parseWhile, parseFor, parseIf, parseDoWhile)

  const parseWhile = () => {
    const node = { astType: "while", condition: undefined, body: undefined }
    if (tokens[idx].keyword !== "while") return
    idx++
    if (tokens[idx].text !== "(") return
    idx++
    node.condition = p(parseExpression)
    if (!node.condition) return
    if (tokens[idx].text !== ")") return
    idx++
    node.body = p(parseBlock)
    if (node.body === undefined) return
    return node
  }

  const parseFor = () => {
    const node = { astType: "for", setup: undefined, condition: undefined, increment: undefined, body: undefined }
    if (token.keyword !== "for") return
    idx++
    if (token.text !== "(") return
    idx++
    // @INPROGRESS
    return node
  }

  const parseIf = () => {
    const node = { astType: "while", condition: undefined, body: undefined }
    if (tokens[idx].keyword !== "while") return
    idx++
    if (tokens[idx].text !== "(") return
    idx++
    node.condition = p(parseExpression)
    if (!node.condition) return
    if (tokens[idx].text !== ")") return
    idx++
    node.body = p(parseBlock)
    if (node.body === undefined) return
    return node
  }

  const parseDoWhile = () => { }

  const parseFunctionDeclaration = () => {

  }

  const parseDeclaration = () => {
    const node = { astType: "declaration", type: undefined, name: undefined, expression: undefined }

    node.type = p(parseType)
    if (!node.type) return

    node.name = tokens[idx].name
    if (!node.name) return
    idx++

    if (tokens[idx].text !== "=") return
    idx++

    node.expression = p(parseExpression)
    if (!node.expression) return
    token = tokens[idx]

    if (token.text !== ";") return
    idx++

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
    parseParenthesizedExpression)

  const parseLiteral = () => {
    let token = tokens[idx]
    if (token.int !== undefined) {// because int can be zero
      const type = { astType: "type", typeTag: "int", size: 32, unsigned: false }
      idx++
      return { astType: "expression", expressionType: "literal", type, value: token.int }

    } else if (token.float !== undefined) {// because int can be zero
      const type = { astType: "type", typeTag: "float", size: 64 }
      idx++
      return { astType: "expression", expressionType: "literal", type, value: token.float }

    } else if (token.char !== undefined) {// because int can be zero
      const type = { astType: "type", typeTag: "char", size: token.char.length }
      idx++
      return { astType: "expression", expressionType: "literal", type, value: token.char }

    } else if (token.float !== undefined) {// because int can be zero
      const type = { astType: "type", typeTag: "string", size: token.string.length + 1 }
      idx++
      return { astType: "expression", expressionType: "literal", type, value: token.string }

    } else return
  }

  const parseOperatorExpression = () => {

  }

  const parseFunctionApplication = () => {
    // I prefer the word parameter over argument. less agressive
    const node = { astType: "application", name: undefined, parameters: [] }
    node.name = tokens[idx].name
    if (!node.name) return
    idx++
    if (tokens[idx].text !== "(") return
    idx++

    // @INPROGRESS
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

  // op levels are ascending so things that aren't part of expressions (outermost level) can have oplevel undefined

  // parseStatements()

  return p(parseStatements)
}

const defaultTypes = {
  s64: { typeTag: "int", size: 64, unsigned: false }
}

const _astTypes = "expression statements statement declaration type while for if "
const _expressionTypes = "literal operatorExpression application"

// how to identify types???????????? Now again I think I'm going with s8, s16, ect...
typecheckC = (ast) => {
  const typedAst = { structs: {}, types: {}, functions: {}, globals: {}, main: undefined }
  // can identify functions by name only because C doesn't have function overloading

  const typecheck = (node) => {
    switch (node.astType) {
      case "statements":

      case "expression":

      case "":

    }
  }

  typecheck(ast)

  // throw new TypeError("yo you got a type error")
  return typedAst
}


generateBinary = (typedAst) => {

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
