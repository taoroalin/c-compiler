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
    if (match.groups.name && keywords[str])
      result.keyword = str
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
  return tokens
}

parseC = (text) => {
  const tokens = lexC(text)
  console.log(tokens)

  let tree = { tag: "top level", k: [] }

  // add tree part to tree after inner functions succeed

  // parseBlock

  // parseStatements

  // parseStatement

  // parseFn

  // parseDeclaration

  const parseExpression = (subtree, idx) => {

  }

  // op levels are ascending so things that aren't part of expressions (outermost level) can have oplevel undefined

  // parseStatements()

  return tree
}

typecheckC = (ast) => {

}


generateBinary = (typedAst) => {

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
