import * as fs from 'fs';

let code = fs.readFileSync('src/game/GameEngine.ts', 'utf-8');

let geoCounter = 0;
const newCode = code.replace(/new THREE\.([a-zA-Z]+Geometry)\(([^)]*)\)/g, (match, type, args) => {
    const keyStr = (type + '_' + args).replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100);
    if (args.includes('new THREE') || args.includes('this.')) {
        return match; 
    }
    return `this.getGeo('${keyStr}', () => ${match})`;
});

code = newCode;

code = code.replace(/new THREE\.MeshBasicMaterial\(\{ color: color \}\)/g, "this.getMat(`basic_${color}`, () => new THREE.MeshBasicMaterial({ color: color }))");
code = code.replace(/new THREE\.MeshStandardMaterial\(\{ color: 0xFFD700, metalness: 1.0, roughness: 0.1 \}\)/g, "this.getMat('gold_metal', () => new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 1.0, roughness: 0.1 }))");
code = code.replace(/new THREE\.MeshStandardMaterial\(\{ color: 0xFFD700, metalness: 0.8, roughness: 0.2 \}\)/g, "this.getMat('gold_shield', () => new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 }))");
code = code.replace(/new THREE\.MeshStandardMaterial\(\{ color: 0x111111, metalness: 0.8, roughness: 0.2 \}\)/g, "this.getMat('dark_metal', () => new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 }))");
code = code.replace(/new THREE\.MeshStandardMaterial\(\{ color: 0xD32F2F, roughness: 0.2, metalness: 0.3 \}\)/g, "this.getMat('red_speed', () => new THREE.MeshStandardMaterial({ color: 0xD32F2F, roughness: 0.2, metalness: 0.3 }))");
code = code.replace(/new THREE\.MeshStandardMaterial\(\{ color: 0xFFA000 \}\)/g, "this.getMat('orange_bird', () => new THREE.MeshStandardMaterial({ color: 0xFFA000 }))");

fs.writeFileSync('src/game/GameEngine.ts', code);
console.log('Optimized geometries and materials.');
