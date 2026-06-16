import fs from 'fs';
let b = fs.readFileSync('src/campusData.ts', 'utf8');
b = b.replace(/voucherOffer: '.*? \((.*?)\)',/g, "voucherOffer: '$1',");
fs.writeFileSync('src/campusData.ts', b);
