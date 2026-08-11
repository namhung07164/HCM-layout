const fs = require('fs');
let content = fs.readFileSync('src/components/DataMapping/ReviewOnlyView.tsx', 'utf8');

content = content.replace(
    /const \{ mapUnits, mapVersions, isLoading \} = useDataStore\(useShallow\(state => \(\{/g,
    'const { mapUnits, mapVersions, isLoading, reviewLabelColors } = useDataStore(useShallow(state => ({'
);

content = content.replace(
    /isLoading: state\.isLoading/g,
    'isLoading: state.isLoading,\n    reviewLabelColors: state.reviewLabelColors'
);

content = content.replace(
    /import \{ useSummaryData, generateSizeLabel \} from '\.\.\/\.\.\/lib\/summaryData';/g,
    "import { useSummaryData, generateSizeLabel, generateSizeLabelLines } from '../../lib/summaryData';"
);

content = content.replace(
    /const sizeLabel = generateSizeLabel\(unit, uInfo, selectedLabels \|\| \['Unit ID', 'Size SQM'\]\);/g,
    "const sizeLabelLines = generateSizeLabelLines(unit, uInfo, selectedLabels || ['Unit ID', 'Size SQM']);\n        const sizeLabel = generateSizeLabel(unit, uInfo, selectedLabels || ['Unit ID', 'Size SQM']);"
);

content = content.replace(
    /displayOpacity: style\.opacity,/g,
    'displayOpacity: style.opacity,\n          sizeLabelLines,'
);

content = content.replace(
    /\{unit\.name && scale > 0\.4 && \(\s*<Text x=\{unit\.x\} y=\{unit\.y\} text=\{unit\.sizeLabel\} fontSize=\{14\/scale\} fill="white" fontStyle="bold" align="center" verticalAlign="middle" width=\{unit\.width\} height=\{unit\.height\} listening=\{false\} shadowColor="black" shadowBlur=\{2\} shadowOpacity=\{1\} \/>\s*\)\}/g,
    `{unit.name && scale > 0.4 && (
                            <Group x={unit.x} y={unit.y} width={unit.width} height={unit.height} rotation={unit.rotation || 0}>
                                {(() => {
                                  const lines = unit.sizeLabelLines || [];
                                  const fontSize = 14 / scale;
                                  const lineHeight = fontSize * 1.2;
                                  const totalHeight = lines.length * lineHeight;
                                  const startY = (unit.height - totalHeight) / 2;
                                  return lines.map((line: any, i: number) => (
                                    <Text key={i} x={0} y={startY + i * lineHeight} width={unit.width} text={line.text} fill={reviewLabelColors?.[line.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                  ));
                                })()}
                            </Group>
                        )}`
);

content = content.replace(
    /\{unit\.name && scale > 0\.4 && \(\s*<Text x=\{unit\.x - \(unit\.radius\|\|0\)\} y=\{unit\.y - \(14\/scale\)\} text=\{unit\.sizeLabel\} fontSize=\{14\/scale\} fill="white" fontStyle="bold" align="center" verticalAlign="middle" width=\{\(unit\.radius\|\|0\)\*2\} height=\{\(unit\.radius\|\|0\)\*2\} listening=\{false\} shadowColor="black" shadowBlur=\{2\} shadowOpacity=\{1\} \/>\s*\)\}/g,
    `{unit.name && scale > 0.4 && (
                            <Group x={unit.x - (unit.radius||0)} y={unit.y - (unit.radius||0)} width={(unit.radius||0)*2} height={(unit.radius||0)*2}>
                                {(() => {
                                  const lines = unit.sizeLabelLines || [];
                                  const fontSize = 14 / scale;
                                  const lineHeight = fontSize * 1.2;
                                  const totalHeight = lines.length * lineHeight;
                                  const startY = ((unit.radius||0)*2 - totalHeight) / 2;
                                  return lines.map((line: any, i: number) => (
                                    <Text key={i} x={0} y={startY + i * lineHeight} width={(unit.radius||0)*2} text={line.text} fill={reviewLabelColors?.[line.key] || '#ffffff'} align="center" fontSize={fontSize} fontStyle="bold" listening={false} shadowColor="black" shadowBlur={2} shadowOpacity={1} />
                                  ));
                                })()}
                            </Group>
                        )}`
);

content = content.replace(
    /\{unit\.name && scale > 0\.4 && \(\s*<Text[\s\S]*?y=\{unit\.points \? Math\.min\(\.\.\.unit\.points\.filter\(\(_, i: number\) => i % 2 === 1\)\) : unit\.y\}[\s\S]*?width=\{unit\.points \? Math\.max\(\.\.\.unit\.points\.filter\(\(_: any, i: number\) => i % 2 === 0\)\) - Math\.min\(\.\.\.unit\.points\.filter\(\(_: any, i: number\) => i % 2 === 0\)\) : 100\}[\s\S]*?height=\{unit\.points \? Math\.max\(\.\.\.unit\.points\.filter\(\(_: any, i: number\) => i % 2 === 1\)\) - Math\.min\(\.\.\.unit\.points\.filter\(\(_: any, i: number\) => i % 2 === 1\)\) : 30\}[\s\S]*?align="center"[\s\S]*?verticalAlign="middle"[\s\S]*?text=\{unit\.sizeLabel\}[\s\S]*?fontSize=\{14\/scale\}[\s\S]*?fill="white"[\s\S]*?fontStyle="bold"[\s\S]*?listening=\{false\}[\s\S]*?shadowColor="black"[\s\S]*?shadowBlur=\{2\}[\s\S]*?shadowOpacity=\{1\}[\s\S]*?\/>\s*\)\}/g,
    `{unit.name && scale > 0.4 && (() => {
                                const bx = unit.points ? Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 0)) : unit.x;
                                const by = unit.points ? Math.min(...unit.points.filter((_: any, i: number) => i % 2 === 1)) : unit.y;
                                const bw = unit.points ? Math.max(...unit.points.filter((_: any, i: number) => i % 2 === 0)) - bx : 100;
                                const bh = unit.points ? Math.max(...unit.points.filter((_: any, i: number) => i % 2 === 1)) - by : 30;
                                return (
                                  <Group x={bx} y={by} width={bw} height={bh}>
                                    {(() => {
                                      const lines = unit.sizeLabelLines || [];
                                      const fontSize = 14 / scale;
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


// And pass reviewLabelColors
content = content.replace(
    /const VersionStage = \(\{ version, mapUnits, summaryData, selectedLabels, windowSize \}: any\) => \{/g,
    'const VersionStage = ({ version, mapUnits, summaryData, selectedLabels, reviewLabelColors, windowSize }: any) => {'
);
content = content.replace(
    /<VersionStage key=\{version\.id\} version=\{version\} mapUnits=\{mapUnits\} summaryData=\{summaryData\} selectedLabels=\{selectedLabels\} windowSize=\{windowSize\} \/>/g,
    '<VersionStage key={version.id} version={version} mapUnits={mapUnits} summaryData={summaryData} selectedLabels={selectedLabels} reviewLabelColors={reviewLabelColors} windowSize={windowSize} />'
);
content = content.replace(
    /<VersionStage version=\{activeVersion\} mapUnits=\{mapUnits\} summaryData=\{summaryData\} selectedLabels=\{selectedLabels\} windowSize=\{\{width: windowSize\.width \+ 64, height: windowSize\.height \+ 100\}\} \/>/g,
    '<VersionStage version={activeVersion} mapUnits={mapUnits} summaryData={summaryData} selectedLabels={selectedLabels} reviewLabelColors={reviewLabelColors} windowSize={{width: windowSize.width + 64, height: windowSize.height + 100}} />'
);


fs.writeFileSync('src/components/DataMapping/ReviewOnlyView.tsx', content);
