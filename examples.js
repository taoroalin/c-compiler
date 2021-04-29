const examples = {
  expression: `1+1`,

  statement: `1+1;`,

  assignment: `int i=0;`,

  block: `int i=0;int j=0;`,

  functionApplication1: `int z = myfunction();`,
  functionApplication2: `int t = myfunction(1, 2);`,
  functionApplication3: `int t = myfunction(myfunction2(0,1), 2);`,

  functionDeclaration: `int add_one(){int b = 1;return b;}`,
  functionDeclaration2: `int add_one(int a, int b){int c = 1;return c;}`,
  functionDeclarationAndUse: `int add_one(int a, int b){int c = 1;return c;}
  int z = add_one(1,2);`,

  typedef: `typedef int mySpecialInt;`,
  typedef2: `typedef struct mySpecialInt {int i;} mySpecialInt;`,

  struct: `struct {} namez = 1;`,
  struct2: `struct {
    int i;
    int j;
  } namez = 1;`,

  structAccess: `int myInt = myStruct.i;`,

  structAccess2: `typedef struct myStruct {
    int i;
    int j;
  } myStruct;
  int myInt = myStruct.i;`,

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

// console.log(parseC(examples.functionDeclaration2))
// console.log(parseC(examples.all))
// console.log(parseC(examples.if))
console.log(lexC(examples.structAccess))
console.log(parseC(examples.structAccess))
console.log(parseC(examples.typedef2))
console.log(parseAndTypecheck(examples.typedef2))
console.log(parseC(examples.functionDeclaration))
console.log(parseAndTypecheck(examples.functionDeclaration))
console.log(parseC(examples.functionDeclarationAndUse))
console.log(parseAndTypecheck(examples.functionDeclarationAndUse))