
/**
to finish today:
while, for, if, else, int, float, +,-,*,/
*/
const keywords = { for: 1, while: 1, do: 1, break: 1, continue: 1, if: 1, else: 1, switch: 1, case: 1, default: 1, goto: 1, typedef: 1, struct: 1, union: 1, sizeof: 1, void: 1, return: 1, register: 1, auto: 1, volatile: 1, static: 1, extern: 1, const: 1, unsigned: 1, int: 1, short: 1, long: 1, double: 1, float: 1, char: 1 }

const directives = { define: 1, include: 1, undef: 1, ifdef: 1, ifndef: 1, if: 1, else: 1, elif: 1, endif: 1, error: 1, pragma: 1 }

lexC = (text) => {
  const intToChar = String.fromCharCode
  const hexToChar = (str) => String.fromCharCode(parseInt(str, 16))
  const unescapeStringLiteral = (text) => {
    return text.replaceAll(/\\(?:x([0-9a-f]{2,100})|(u[0-9a-f]{4})|(U[0-9a-f]{8})|([0-7]{3})|([abefnrtv\\'"?]))/g,
      (str, x, u, U, octal, char) => {
        if (x) return intToChar(parseInt(x, 16))
        if (u) return intToChar(parseInt(u, 16))
        if (U) return intToChar(parseInt(U, 16)) // @TODO need to check official
        if (octal) return intToChar(parseInt(octal, 8))
        return {
          a: intToChar(7),
          b: intToChar(8),
          e: hexToChar("1B"),
          f: hexToChar("0C"),
          n: hexToChar("0A"), // this becomes \r\n on windows
          r: hexToChar("0D"),
          t: hexToChar("09"),
          v: hexToChar("0B"),
          "\\": hexToChar("5C"),
          "'": hexToChar("27"),
          '"': hexToChar("22"),
          '?': hexToChar("3F"),
        }[char]
      })
  }

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
    if (match.groups.name) {
      if (keywords[str])
        result.keyword = str
      else
        result.name = str
    }
    // @TODO handle C escape sequences
    if (match.groups.string)
      result.string = unescapeStringLiteral(str.substring(1, str.length - 1))
    if (match.groups.char)
      result.char = str.substring(1, str.length - 1)
    if (match.groups.int)
      if (match.groups.hex) {
        result.int = parseInt(match.groups.hex, 16)
      } else if (match.groups.octal) {
        result.int = parseInt(match.groups.octal, 8)
      } else if (match.groups.binary) {
        result.int = parseInt(match.groups.binary, 2)
      } else
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

  const parseStatement = () => parserUnion(parseDeclaration, parseFunctionDeclaration, parseControlFlow, parseExpressionStatement, parseTypedef)

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
    switch (eat().keyword) {
      case "break":
        node.astType = "break"
        break
      case "continue":
        node.astType = "continue"
        break
      case "goto":
        if (tokens[idx].name) {
          node.astType = "goto"
          node.gotoLabel = eat().name
          if (!node.gotoLabel) return
        } else return
        break
      case "return":
        node.expression = p(parseExpression)
        if (node.expression !== undefined) return
        break
      default:
        return
    }
    if (eat().text !== ";") return
    return result
  }

  const parseTypedef = () => {
    if (eat().keyword !== "typedef") return
    const node = { astType: "typedef", name: undefined, type: undefined }
    node.type = p(parseType)
    if (!node.type) return
    node.name = eat().name
    if (!node.name) return
    if (!eat().text === ";") return
    return node
  }

  const parseFunctionDeclaration = () => {
    const node = { astType: "functionDeclaration", returnType: undefined, name: undefined, arguments: [], body: undefined }
    node.returnType = p(parseType)
    if (!node.returnType) return
    node.name = eat().name
    if (!node.name) return
    if (!eat().text === "(") return

    if (tokens[idx].text === ")") {
      idx++
    } else {
      // this will get more complicated when I support type stuff after name
      // will need a "parseTypedName" or something
      for (let i = 0; i !== "end";) {
        const type = p(parseType)
        if (!type) return
        const name = eat().name
        if (!name) return
        node.parameters.push({ type, name })
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
    }

    node.body = p(parseBlock)
    if (!node.body) return
    return node
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

  // this structure doesn't work with introducers
  const parseType = () => {
    const node = { astType: "type", typeTag: undefined }
    let token = eat()
    if (!token.keyword) {
      return
    }
    switch (token.keyword) {
      case "int":
        node.typeTag = "int"
        break
      case "float":
        node.typeTag = "float"
        break
      case "struct":
        node.typeTag = "struct"
        node.members = []
        token = eat()
        if (token.name) {
          node.name = token.name
          token = eat()
        }
        if (token.text !== "{") return
        for (let i = true; i;) {
          token = tokens[idx]
          if (token.text === "}") {
            idx++
            break
          }
          const member = {}
          member.type = p(parseType)
          if (!member.type) return
          member.name = eat().name
          if (!member.name) return
          if (eat().text !== ";") return
          node.members.push(member)
        }
        break
      case "string":
        node.typeTag = "string"
        break
      case "void":
        node.typeTag = "void"
        break
      default:
        return
    }
    return node
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

    // this lets me "break" out of this for loop from the inner switch
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

  const typedAst = { structs: {}, types: defaultTypes, functions: {}, globals: {}, main: undefined }

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
        const uniqueType = typecheck(node.type)
        const expression = typecheck(node.expression)
        const typedAstNode = { type: uniqueType, expression }
        const name = node.name
        if (context.functionName === "$GLOBAL$") {
          if (typedAst.globals[name]) {
            throw new Error(`Redeclaration of global variable ${name}`)
          }
          typedAstNode.parent = typedAst.globals[name]
          typedAst.globals[name] = typedAstNode
        } else {
          const currentFn = typedAst.functions[context.functionName]
          if (currentFn.variables[name]) {
            throw new Error(`Redeclaration of function scope variable ${name}`)
          }
          currentFn.variables[name] = typedAstNode
          typedAstNode.parent = currentFn
        }
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


interpretTypedAst = (typedAst) => {

}


// interpretC = (text) => {
//   const ast = parseC(text)
//   const typedAst = typecheckC(ast)
//   const cMemory = new ArrayBuffer(1_000_000)
//   interpretTypedAst(typedAst, cMemory)
//   return cMemory
// }

// static in C is WEIRD!
// it lets you define a global variable inside a function that's only visible inside that function.
