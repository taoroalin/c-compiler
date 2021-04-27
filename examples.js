const examples = {
  expression: `1+1`,
  statement: `1+1;`,
  assignment: `int i=0;`,
  block: `int i=0;int j=0;`,
  functionApplication: `int z = myfunction();`,
  functionApplication1: `int y = myfunction(1);`,
  functionApplication2: `int t = myfunction(1, 2);`,
  functionApplication3: `int t = myfunction(myfunction2(0,1), 2);`,
  while: `while(1){int i=0;}`,
  for: `for(int i=0;int j=0;1){
    int myInt = 0;
  }`,
  if: `if(1){print('hi');}`,
  all: `
  while (1) {
    int i=addOne(1);
    int j=addOne(i);
    if (j) {
      float z = 0.0;
    }
  }`
}

const runAll = () => {
  for (let key in examples) {
    lexC(examples[key])
  }
}
// runAll()

console.log(parseC(examples.for))
console.log(parseC(examples.all))
console.log(parseC(examples.if))
console.log(parseAndTypecheck(examples.while))