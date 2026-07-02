const fs = require('fs');

let content = fs.readFileSync('src/components/DataMapping/ReviewTab.tsx', 'utf8');

content = content.replace(
    /const \{  store, reviewSelectedLabels: selectedLabels, setReviewSelectedLabels: setSelectedLabels  \} = useDataStore\(useShallow\(state => \(\{/g,
    'const {  store, reviewSelectedLabels: selectedLabels, setReviewSelectedLabels: setSelectedLabels, reviewLabelColors, setReviewLabelColors  } = useDataStore(useShallow(state => ({'
);

content = content.replace(
    /reviewSelectedLabels: state\.reviewSelectedLabels,/g,
    'reviewSelectedLabels: state.reviewSelectedLabels,\n    reviewLabelColors: state.reviewLabelColors,\n    setReviewLabelColors: state.setReviewLabelColors,'
);

// We need to change the generateSizeLabel calls to generateSizeLabelLines
content = content.replace(
    /import \{ useSummaryData, generateSizeLabel \} from '\.\.\/\.\.\/lib\/summaryData';/g,
    "import { useSummaryData, generateSizeLabel, generateSizeLabelLines } from '../../lib/summaryData';"
);

// update styling of styledUnits
content = content.replace(
    /const sizeLabel = generateSizeLabel\(unit, uInfo, selectedLabels\);/g,
    'const sizeLabelLines = generateSizeLabelLines(unit, uInfo, selectedLabels);\n        const sizeLabel = generateSizeLabel(unit, uInfo, selectedLabels);'
);

content = content.replace(
    /displayOpacity: style\.opacity,/g,
    'displayOpacity: style.opacity,\n          sizeLabelLines,'
);

// Let's modify the label list renderer to include a color picker
const labelListRenderer = `<div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 sticky top-0 bg-slate-900 py-1 z-10">Select Labels</div>
                    {AVAILABLE_LABELS.map(label => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="color"
                          className="w-4 h-4 rounded cursor-pointer border-0 p-0 appearance-none bg-transparent"
                          value={reviewLabelColors[label] || '#ffffff'}
                          onChange={(e) => setReviewLabelColors({ ...reviewLabelColors, [label]: e.target.value })}
                        />
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-600 bg-slate-800 focus:ring-brand-500"
                          checked={selectedLabels.includes(label)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLabels([...selectedLabels, label]);
                            } else {
                              setSelectedLabels(selectedLabels.filter(l => l !== label));
                            }
                          }}
                        />
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
                      </label>
                    ))}`;

content = content.replace(
    /<div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 sticky top-0 bg-slate-900 py-1 z-10">Select Labels<\/div>[\s\S]*?\{AVAILABLE_LABELS\.map\(label => \([\s\S]*?<\/label>\)[\s\S]*?\)\}/,
    labelListRenderer
);

// Now update how <Text> is rendered in Main Preview
content = content.replace(
    /\{scale > 0\.3 && \([\s\S]*?<Text[\s\S]*?text=\{unit\.sizeLabel\}[\s\S]*?\/\>[\s\S]*?\)\}/g,
    `{scale > 0.3 && (
                      <Group
                        x={unit.type === 'rect' ? unit.x : (unit.type === 'circle' ? unit.x - (unit.radius || 0) : (unit.points ? Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 0)) : unit.x))}
                        y={unit.type === 'rect' ? unit.y : (unit.type === 'circle' ? unit.y - (unit.radius || 0) : (unit.points ? Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 1)) : unit.y))}
                        width={unit.type === 'rect' ? unit.width : (unit.type === 'circle' ? (unit.radius || 0) * 2 : (unit.points ? Math.max(...unit.points.filter((_: any, i: number) => i % 2 === 0)) - Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 0)) : 100))}
                        height={unit.type === 'rect' ? unit.height : (unit.type === 'circle' ? (unit.radius || 0) * 2 : (unit.points ? Math.max(...unit.points.filter((_: any, i: number) => i % 2 === 1)) - Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 1)) : 30))}
                        rotation={unit.rotation || 0}
                      >
                        {(() => {
                          const lines = unit.sizeLabelLines || [];
                          const fontSize = 10 / scale;
                          const lineHeight = fontSize * 1.2;
                          const totalHeight = lines.length * lineHeight;
                          const boxHeight = unit.type === 'rect' ? unit.height : (unit.type === 'circle' ? (unit.radius || 0) * 2 : (unit.points ? Math.max(...unit.points.filter((_: any, i: number) => i % 2 === 1)) - Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 1)) : 30));
                          const boxWidth = unit.type === 'rect' ? unit.width : (unit.type === 'circle' ? (unit.radius || 0) * 2 : (unit.points ? Math.max(...unit.points.filter((_: any, i: number) => i % 2 === 0)) - Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 0)) : 100));
                          const startY = (boxHeight - totalHeight) / 2;
                          return lines.map((line: any, i: number) => (
                            <Text
                              key={i}
                              x={0}
                              y={startY + i * lineHeight}
                              width={boxWidth}
                              text={line.text}
                              fill={reviewLabelColors[line.key] || '#ffffff'}
                              align="center"
                              fontSize={fontSize}
                              fontStyle="bold"
                              listening={false}
                              shadowColor="black"
                              shadowBlur={2}
                              shadowOpacity={1}
                              shadowOffset={{ x: 1, y: 1 }}
                            />
                          ));
                        })()}
                      </Group>
                    )}`
);

// We need to pass reviewLabelColors to HiddenExportStage and ExportAllManager
content = content.replace(
    /selectedLabels=\{selectedLabels\}/g,
    'selectedLabels={selectedLabels}\n             reviewLabelColors={reviewLabelColors}'
);

content = content.replace(
    /const HiddenExportStage = \(\{ version, units, summaryData, selectedLabels, paperSize, onReady, index \}: any\) => \{/g,
    'const HiddenExportStage = ({ version, units, summaryData, selectedLabels, reviewLabelColors, paperSize, onReady, index }: any) => {'
);

content = content.replace(
    /export const ExportAllManager = \(\{ versions, units, summaryData, format, paperSize, quality, selectedLabels, onComplete \}: any\) => \{/g,
    'export const ExportAllManager = ({ versions, units, summaryData, format, paperSize, quality, selectedLabels, reviewLabelColors, onComplete }: any) => {'
);


// Now for HiddenExportStage texts
content = content.replace(
    /<React\.Fragment key=\{unit\.id\}>\s*<Rect \{\.\.\.shapeProps\} width=\{unit\.width\} height=\{unit\.height\} cornerRadius=\{4\} \/>\s*\{unit\.name && \(\s*<Text x=\{unit\.x\} y=\{unit\.y\} text=\{unit\.sizeLabel\} fontSize=\{14\} fill="white" fontStyle="bold" align="center" verticalAlign="middle" width=\{unit\.width\} height=\{unit\.height\} listening=\{false\} shadowColor="black" shadowBlur=\{2\} shadowOpacity=\{1\} \/>\s*\)\}\s*<\/React\.Fragment>/g,
    `<React.Fragment key={unit.id}>
                        <Rect {...shapeProps} width={unit.width} height={unit.height} cornerRadius={4} />
                        {unit.name && (
                            <Group x={unit.x} y={unit.y} width={unit.width} height={unit.height} rotation={unit.rotation || 0}>
                                {(() => {
                                  const lines = unit.sizeLabelLines || [];
                                  const fontSize = 14;
                                  const lineHeight = fontSize * 1.2;
                                  const totalHeight = lines.length * lineHeight;
                                  const startY = (unit.height - totalHeight) / 2;
                                  return lines.map((line: any, i: number) => (
                                    <Text key={i} x={0} y={startY + i * lineHeight} width={unit.width} text={line.text} fill={reviewLabelColors?.[line.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                  ));
                                })()}
                            </Group>
                        )}
                    </React.Fragment>`
);

content = content.replace(
    /<React\.Fragment key=\{unit\.id\}>\s*<Circle \{\.\.\.shapeProps\} radius=\{unit\.radius\} \/>\s*\{unit\.name && \(\s*<Text x=\{unit\.x - \(unit\.radius\|\|0\)\} y=\{unit\.y - 14\} text=\{unit\.sizeLabel\} fontSize=\{14\} fill="white" fontStyle="bold" align="center" verticalAlign="middle" width=\{\(unit\.radius\|\|0\)\*2\} height=\{\(unit\.radius\|\|0\)\*2\} listening=\{false\} shadowColor="black" shadowBlur=\{2\} shadowOpacity=\{1\} \/>\s*\)\}\s*<\/React\.Fragment>/g,
    `<React.Fragment key={unit.id}>
                        <Circle {...shapeProps} radius={unit.radius} />
                        {unit.name && (
                            <Group x={unit.x - (unit.radius||0)} y={unit.y - (unit.radius||0)} width={(unit.radius||0)*2} height={(unit.radius||0)*2}>
                                {(() => {
                                  const lines = unit.sizeLabelLines || [];
                                  const fontSize = 14;
                                  const lineHeight = fontSize * 1.2;
                                  const totalHeight = lines.length * lineHeight;
                                  const startY = ((unit.radius||0)*2 - totalHeight) / 2;
                                  return lines.map((line: any, i: number) => (
                                    <Text key={i} x={0} y={startY + i * lineHeight} width={(unit.radius||0)*2} text={line.text} fill={reviewLabelColors?.[line.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                  ));
                                })()}
                            </Group>
                        )}
                    </React.Fragment>`
);

content = content.replace(
    /\{unit\.name && \(\s*<Text[\s\S]*?y=\{unit\.points \? Math\.min\(\.\.\.unit\.points\.filter\(\(_: any, i: number\) => i % 2 === 1\)\) : unit\.y\}[\s\S]*?width=\{unit\.points \? Math\.max\(\.\.\.unit\.points\.filter\(\(_: any, i: number\) => i % 2 === 0\)\) - Math\.min\(\.\.\.unit\.points\.filter\(\(_: any, i: number\) => i % 2 === 0\)\) : 100\}[\s\S]*?height=\{unit\.points \? Math\.max\(\.\.\.unit\.points\.filter\(\(_: any, i: number\) => i % 2 === 1\)\) - Math\.min\(\.\.\.unit\.points\.filter\(\(_: any, i: number\) => i % 2 === 1\)\) : 30\}[\s\S]*?align="center"[\s\S]*?verticalAlign="middle"[\s\S]*?text=\{unit\.sizeLabel\}[\s\S]*?fontSize=\{14\}[\s\S]*?fill="white"[\s\S]*?fontStyle="bold"[\s\S]*?listening=\{false\}[\s\S]*?shadowColor="black"[\s\S]*?shadowBlur=\{2\}[\s\S]*?shadowOpacity=\{1\}[\s\S]*?\/>\s*\)\}/g,
    `{unit.name && (() => {
                                const bx = unit.points ? Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 0)) : unit.x;
                                const by = unit.points ? Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 1)) : unit.y;
                                const bw = unit.points ? Math.max(...unit.points.filter((_: any, i: number) => i % 2 === 0)) - bx : 100;
                                const bh = unit.points ? Math.max(...unit.points.filter((_: any, i: number) => i % 2 === 1)) - by : 30;
                                return (
                                  <Group x={bx} y={by} width={bw} height={bh}>
                                    {(() => {
                                      const lines = unit.sizeLabelLines || [];
                                      const fontSize = 14;
                                      const lineHeight = fontSize * 1.2;
                                      const totalHeight = lines.length * lineHeight;
                                      const startY = (bh - totalHeight) / 2;
                                      return lines.map((line: any, i: number) => (
                                        <Text key={i} x={0} y={startY + i * lineHeight} width={bw} text={line.text} fill={reviewLabelColors?.[line.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                      ));
                                    })()}
                                  </Group>
                                );
                            })()}`
);

fs.writeFileSync('src/components/DataMapping/ReviewTab.tsx', content);
