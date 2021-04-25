const examples = {
  expression: `1+1`,
  statement: `1+1;`,
  assignment: `int i=0;`,
  block: `int i=0;int j=0;`,
  if: `if(1){print("hi")}`
}

parseC(examples.expression)

const runAll = () => {
  for (let key in examples) {
    console.log(lexC(examples[key]))
  }
}
runAll()