function stringSimilarity(s1, s2) {
  const a = (s1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = (s2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a === b) return 1;
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) {
     return 0.8 + (Math.min(a.length, b.length) / Math.max(a.length, b.length)) * 0.1;
  }
  let costs = new Array();
  for (let i = 0; i <= a.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= b.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (a.charAt(i - 1) != b.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[b.length] = lastValue;
  }
  const maxLen = Math.max(a.length, b.length);
  return (maxLen - costs[b.length]) / maxLen;
}
console.log(stringSimilarity('Elixir', 'Elixir'));
