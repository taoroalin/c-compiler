//       ==    !=    +   *    /    &   |   >>   <<   .    ->   12   13   14     15   16   17  18   19   20  21
//       1     2   3    4    5   6    7    8   9   10   11   12   13   14        15   16     17     18   19   20  21   22  23  24  25   26   27
reg01 = `(==)|(!=)|(>=)|(<=)|(=)|(\.)|(->)|(;)|(,)|(\()|(\))|(\[)|(\])|(\{)|(\})|(&&)|(\|\|)|(\+\+)|(--)|(\+)|(-)|(\*)|(/)|(%)|(&)|(\|)|(\^)|(~)`
//       <   >   !   &&   ||     :   ""                ''              identifier    #direct   //line comment      /* */       whitespace
//       28  29  30  31   32     33  34                35              36            37        38                  39          40
reg02 = `(>>)|(<<)|(<)|(>)|(!)|(:)|("(?:[^"]|\\")*")|('([^']|\\')*')|[a-zA-Z0-9_]+|(#[a-z]+)|//[^\n]*\n|/\*([^*]|\*[^/])*\*/|\s+`
regex = RegExp(reg01 + reg02, "gs")
console.log(regex)

tokens = [
  [`==`],
  [`!=`],
  [`>=`],
]

// luckily the group idxs start at 1, so they're always truthy, meaning I can return undefined on fail
firstIdx = (match) => {
  for (let i = 1; i < match.length; i++)
    if (match[i])
      return i
}

parseC = (text) => {
  let idx = 0
  let tree = { tag: "top level", k: [] }
  // op levels are ascending so things that aren't part of expressions (outermost level) can have oplevel undefined

  let tokenFns = [

  ]

  let keywordFns = { for:, while:, do:, break:, continue:, if:, else:, switch:, case:, default:, goto:, typedef:, struct:, union:, sizeof:, void:, return:, register:, auto:, volatile:, static:, extern:, const:, unsigned:, int:, short:, long:, double:, float:, char:}

  let preprocFNs = { define, include, undef, ifdef, ifndef, if, else, elif, endif, error, pragma }

  for (let match of text.matchAll(regex)) {
    if (match.index != idx) {
      throw new Error(`unexpected string ${text.substring(idx, match.idx)} at position ${idx}`)
    }
    const tokenIndex = firstIdx(match)
    if (tokenIndex) {
      tokenFns[tokenIndex](match[0])
    }
  }
  return tree
}

typecheckC = (ast) => {

}

compileC = (text) => {
  const ast = parseC(text)
  typecheckC(ast)
  const binary = 
}
