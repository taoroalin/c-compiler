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
  name: `[a-zA-Z_][a-zA-Z0-9_]*`,
  linecomment: `\\/\\/[^\\n]*\\n`,
  blockcomment: `\\/\\*(?:[^*]|\\*[^/])*\\*\\/`,
  whitespace: `\\s+`,
}

regexStringForm = Object.keys(regexTokens).reduce((acc, cur) => acc + `(?<${cur}>${regexTokens[cur]})|`, "")
regexStringForm += literalTokens.reduce((acc, cur) => acc + `${escapeRegex(cur[0])}|`, "")
regexStringForm = regexStringForm.substring(0, regexStringForm.length - 1)

regex = RegExp(regexStringForm, 'gs')

regexJsString = `regex=/${regexStringForm}/gs;`
console.log(regexJsString)