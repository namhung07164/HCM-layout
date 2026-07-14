const fontSize = 14;
const width = 100;
const charsPerLine = Math.max(1, width / (fontSize * 0.55));
console.log(charsPerLine);
const text = "Discussed on Singapore";
console.log("lines:", Math.max(1, Math.ceil(text.length / charsPerLine)));
