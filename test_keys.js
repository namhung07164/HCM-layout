const taskDef = { "Task code phụ ": "A123", "Task code phá»¥": "B456" };
const tcKey = Object.keys(taskDef).find(k => {
    const nk = k.toLowerCase().replace(/á»¥/g, 'ụ').replace(/\s+/g, '');
    return nk.includes('taskcodeph');
});
console.log(tcKey);
