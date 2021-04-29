# C compiler and Interpreter in JS

This is a C compiler I'm writing in JavaScript for fun/practice. I intend to compile to an x86_64 binary.

Currently the lexer covers most of the language, the parser covers some, and the typechecker covers almost none.
Machine code emitter forthcoming.

## How to Run

Open `index.html` in the browser, then look at the dev console (`ctrl + alt + j`).

It will show the tokens, parse trees, contexts, binaries, ect. that I'm currently working on.

You can try to compile C with `compileC("char* c_code = ...")`. Right now that will probably fail.

I use `npm install live-server; live-server` to reload the page whenever I save a file.