const fs = require('fs');

function patchCode(code) {
    // We want to replace the `words` logic to account for long words
    const oldLogic = `                                      const words = String(line.text).split(' ');
                                      let linesCount = 1;
                                      let currentLineLen = words[0].length;
                                      for (let i = 1; i < words.length; i++) {
                                          if (currentLineLen + 1 + words[i].length <= charsPerLine) {
                                              currentLineLen += 1 + words[i].length;
                                          } else {
                                              linesCount++;
                                              currentLineLen = words[i].length;
                                          }
                                      }`;

    const newLogic = `                                      const words = String(line.text).split(' ');
                                      let linesCount = 1;
                                      let currentLineLen = 0;
                                      for (let i = 0; i < words.length; i++) {
                                          const wordLen = words[i].length;
                                          if (wordLen > charsPerLine) {
                                              // Word itself is longer than a line, it will wrap
                                              linesCount += Math.floor(wordLen / charsPerLine);
                                              currentLineLen = wordLen % charsPerLine;
                                          } else if (currentLineLen > 0 && currentLineLen + 1 + wordLen <= charsPerLine) {
                                              currentLineLen += 1 + wordLen;
                                          } else {
                                              if (i > 0) linesCount++;
                                              currentLineLen = wordLen;
                                          }
                                      }`;
                                      
    return code.split(oldLogic).join(newLogic);
}

const files = ['src/components/DataMapping/ReviewTab.tsx', 'src/components/DataMapping/ReviewOnlyView.tsx'];
for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    code = patchCode(code);
    fs.writeFileSync(file, code);
}
