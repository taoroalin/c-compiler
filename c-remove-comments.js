CRemoveComments = (text) =>
  text.replaceAll(/("(?:[^"]|\\")*")|('([^']|\\')*')|\/\/[^\n]*\n|\/\*([^*]|\*[^\/])*\*\//gs,
    (_, string, char) => string || char || "")