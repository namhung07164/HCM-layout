const fs = require('fs');

function patchFile(filename) {
    let code = fs.readFileSync(filename, 'utf8');
    
    // We have 3 types of shapes: rect, circle, polygon
    // Let's replace the rendering logic for all 3.
    
    // Rect
    const rectOld = `{(() => {
                                  const lines = unit.sizeLabelLines || [];
                                  const fontSize = 14;
                                  const lineHeight = fontSize * 1.2;
                                  const totalHeight = lines.length * lineHeight;
                                  const startY = (unit.height - totalHeight) / 2;
                                  return lines.map((line: any, i: number) => (
                                    <Text key={i} x={0} y={startY + i * lineHeight} width={unit.width} text={line.text} fill={reviewLabelColors?.[line.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                  ));
                                })()}`;
                                
    const rectNew = `{(() => {
                                  const lines = unit.sizeLabelLines || [];
                                  const fontSize = 14;
                                  const lineHeight = fontSize * 1.2;
                                  const estimatedCharWidth = fontSize * 0.55;
                                  const effectiveWidth = unit.width;
                                  
                                  const blocks = lines.map((line: any) => {
                                      const charsPerLine = Math.max(1, effectiveWidth / estimatedCharWidth);
                                      const words = String(line.text).split(' ');
                                      let linesCount = 1;
                                      let currentLineLen = words[0].length;
                                      for (let i = 1; i < words.length; i++) {
                                          if (currentLineLen + 1 + words[i].length <= charsPerLine) {
                                              currentLineLen += 1 + words[i].length;
                                          } else {
                                              linesCount++;
                                              currentLineLen = words[i].length;
                                          }
                                      }
                                      const explicitNewlines = (String(line.text).match(/\\n/g) || []).length;
                                      linesCount += explicitNewlines;
                                      return { ...line, blockHeight: linesCount * lineHeight };
                                  });
                                  
                                  const totalHeight = blocks.reduce((sum: number, b: any) => sum + b.blockHeight, 0);
                                  let currentY = (unit.height - totalHeight) / 2;
                                  
                                  return blocks.map((block: any, i: number) => {
                                      const y = currentY;
                                      currentY += block.blockHeight;
                                      return (
                                        <Text key={i} x={0} y={y} width={effectiveWidth} text={block.text} fill={reviewLabelColors?.[block.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                      );
                                  });
                                })()}`;
                                
    // circle
    const circleOld = `{(() => {
                                  const lines = unit.sizeLabelLines || [];
                                  const fontSize = 14;
                                  const lineHeight = fontSize * 1.2;
                                  const totalHeight = lines.length * lineHeight;
                                  const startY = ((unit.radius||0)*2 - totalHeight) / 2;
                                  return lines.map((line: any, i: number) => (
                                    <Text key={i} x={0} y={startY + i * lineHeight} width={(unit.radius||0)*2} text={line.text} fill={reviewLabelColors?.[line.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                  ));
                                })()}`;
                                
    const circleNew = `{(() => {
                                  const lines = unit.sizeLabelLines || [];
                                  const fontSize = 14;
                                  const lineHeight = fontSize * 1.2;
                                  const estimatedCharWidth = fontSize * 0.55;
                                  const effectiveWidth = (unit.radius||0)*2;
                                  
                                  const blocks = lines.map((line: any) => {
                                      const charsPerLine = Math.max(1, effectiveWidth / estimatedCharWidth);
                                      const words = String(line.text).split(' ');
                                      let linesCount = 1;
                                      let currentLineLen = words[0].length;
                                      for (let i = 1; i < words.length; i++) {
                                          if (currentLineLen + 1 + words[i].length <= charsPerLine) {
                                              currentLineLen += 1 + words[i].length;
                                          } else {
                                              linesCount++;
                                              currentLineLen = words[i].length;
                                          }
                                      }
                                      const explicitNewlines = (String(line.text).match(/\\n/g) || []).length;
                                      linesCount += explicitNewlines;
                                      return { ...line, blockHeight: linesCount * lineHeight };
                                  });
                                  
                                  const totalHeight = blocks.reduce((sum: number, b: any) => sum + b.blockHeight, 0);
                                  let currentY = (effectiveWidth - totalHeight) / 2;
                                  
                                  return blocks.map((block: any, i: number) => {
                                      const y = currentY;
                                      currentY += block.blockHeight;
                                      return (
                                        <Text key={i} x={0} y={y} width={effectiveWidth} text={block.text} fill={reviewLabelColors?.[block.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                      );
                                  });
                                })()}`;
                                
    // polygon
    const polyOld = `{(() => {
                                      const lines = unit.sizeLabelLines || [];
                                      const fontSize = 14;
                                      const lineHeight = fontSize * 1.2;
                                      const totalHeight = lines.length * lineHeight;
                                      const startY = (bh - totalHeight) / 2;
                                      return lines.map((line: any, i: number) => (
                                        <Text key={i} x={0} y={startY + i * lineHeight} width={bw} text={line.text} fill={reviewLabelColors?.[line.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                      ));
                                    })()}`;
                                    
    const polyNew = `{(() => {
                                      const lines = unit.sizeLabelLines || [];
                                      const fontSize = 14;
                                      const lineHeight = fontSize * 1.2;
                                      const estimatedCharWidth = fontSize * 0.55;
                                      const effectiveWidth = bw;
                                      
                                      const blocks = lines.map((line: any) => {
                                          const charsPerLine = Math.max(1, effectiveWidth / estimatedCharWidth);
                                          const words = String(line.text).split(' ');
                                          let linesCount = 1;
                                          let currentLineLen = words[0].length;
                                          for (let i = 1; i < words.length; i++) {
                                              if (currentLineLen + 1 + words[i].length <= charsPerLine) {
                                                  currentLineLen += 1 + words[i].length;
                                              } else {
                                                  linesCount++;
                                                  currentLineLen = words[i].length;
                                              }
                                          }
                                          const explicitNewlines = (String(line.text).match(/\\n/g) || []).length;
                                          linesCount += explicitNewlines;
                                          return { ...line, blockHeight: linesCount * lineHeight };
                                      });
                                      
                                      const totalHeight = blocks.reduce((sum: number, b: any) => sum + b.blockHeight, 0);
                                      let currentY = (bh - totalHeight) / 2;
                                      
                                      return blocks.map((block: any, i: number) => {
                                          const y = currentY;
                                          currentY += block.blockHeight;
                                          return (
                                            <Text key={i} x={0} y={y} width={effectiveWidth} text={block.text} fill={reviewLabelColors?.[block.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                          );
                                      });
                                    })()}`;

    // Apply patches
    if (code.includes(rectOld)) code = code.replace(rectOld, rectNew);
    if (code.includes(circleOld)) code = code.replace(circleOld, circleNew);
    if (code.includes(polyOld)) code = code.replace(polyOld, polyNew);

    // Some places use `fontSize = 14 / scale;`
    const rectOldScaled = rectOld.replace('const fontSize = 14;', 'const fontSize = 14 / scale;');
    const rectNewScaled = rectNew.replace('const fontSize = 14;', 'const fontSize = 14 / scale;');
    if (code.includes(rectOldScaled)) code = code.replace(rectOldScaled, rectNewScaled);
    
    const circleOldScaled = circleOld.replace('const fontSize = 14;', 'const fontSize = 14 / scale;');
    const circleNewScaled = circleNew.replace('const fontSize = 14;', 'const fontSize = 14 / scale;');
    if (code.includes(circleOldScaled)) code = code.replace(circleOldScaled, circleNewScaled);

    const polyOldScaled = polyOld.replace('const fontSize = 14;', 'const fontSize = 14 / scale;');
    const polyNewScaled = polyNew.replace('const fontSize = 14;', 'const fontSize = 14 / scale;');
    if (code.includes(polyOldScaled)) code = code.replace(polyOldScaled, polyNewScaled);

    fs.writeFileSync(filename, code);
}

patchFile('src/components/DataMapping/ReviewTab.tsx');
patchFile('src/components/DataMapping/ReviewOnlyView.tsx');

