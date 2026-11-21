import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicAssetsDir = path.resolve(__dirname, '../public/assets');

const BASE_URL = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/';

const ASSET_MAPPING = [
  // Animals
  { hex: '1F431', target: 'animals/cat.svg' },
  { hex: '1F436', target: 'animals/dog.svg' },
  { hex: '1F430', target: 'animals/rabbit.svg' },
  { hex: '1F426', target: 'animals/bird.svg' },
  { hex: '1F986', target: 'animals/duck.svg' },
  { hex: '1F41F', target: 'animals/fish.svg' },

  // Fruits
  { hex: '1F34E', target: 'fruits/apple.svg' },
  { hex: '1F34C', target: 'fruits/banana.svg' },
  { hex: '1F34A', target: 'fruits/orange.svg' },
  { hex: '1F353', target: 'fruits/strawberry.svg' },
  { hex: '1F349', target: 'fruits/watermelon.svg' },

  // Objects
  { hex: '2B50', target: 'objects/star.svg' },
  { hex: '1F338', target: 'objects/flower.svg' },
  { hex: '26BD', target: 'objects/ball.svg' },
  { hex: '1F36C', target: 'objects/candy.svg' },
  { hex: '2764', target: 'objects/heart.svg' },
  { hex: '1F697', target: 'objects/car.svg' },

  // Numbers 1 - 10
  { hex: '0031-FE0F-20E3', target: 'numbers/number-1.svg' },
  { hex: '0032-FE0F-20E3', target: 'numbers/number-2.svg' },
  { hex: '0033-FE0F-20E3', target: 'numbers/number-3.svg' },
  { hex: '0034-FE0F-20E3', target: 'numbers/number-4.svg' },
  { hex: '0035-FE0F-20E3', target: 'numbers/number-5.svg' },
  { hex: '0036-FE0F-20E3', target: 'numbers/number-6.svg' },
  { hex: '0037-FE0F-20E3', target: 'numbers/number-7.svg' },
  { hex: '0038-FE0F-20E3', target: 'numbers/number-8.svg' },
  { hex: '0039-FE0F-20E3', target: 'numbers/number-9.svg' },
  { hex: '1F51F', target: 'numbers/number-10.svg' },

  // Farm Theme
  { hex: '1F34E', target: 'themes/farm/apple.svg' },
  { hex: '1F34C', target: 'themes/farm/banana.svg' },
  { hex: '1F34A', target: 'themes/farm/orange.svg' },
  { hex: '1F349', target: 'themes/farm/watermelon.svg' },
  { hex: '1F955', target: 'themes/farm/carrot.svg' },
  { hex: '1F425', target: 'themes/farm/chicken.svg' },
  { hex: '1F42E', target: 'themes/farm/cow.svg' },
  { hex: '1F437', target: 'themes/farm/pig.svg' },
  { hex: '1F411', target: 'themes/farm/sheep.svg' },
  { hex: '1F986', target: 'themes/farm/duck.svg' },

  // Ocean Theme
  { hex: '1F41F', target: 'themes/ocean/clownfish.svg' },
  { hex: '1F42C', target: 'themes/ocean/dolphin.svg' },
  { hex: '1F419', target: 'themes/ocean/octopus.svg' },
  { hex: '1F422', target: 'themes/ocean/turtle.svg' },
  { hex: '2B50', target: 'themes/ocean/starfish.svg' },

  // Jungle Theme
  { hex: '1F435', target: 'themes/jungle/monkey.svg' },
  { hex: '1F42F', target: 'themes/jungle/tiger.svg' },
  { hex: '1F418', target: 'themes/jungle/elephant.svg' },
  { hex: '1F992', target: 'themes/jungle/giraffe.svg' },
  { hex: '1F333', target: 'themes/jungle/tree.svg' },

  // Space Theme
  { hex: '1F680', target: 'themes/space/rocket.svg' },
  { hex: '1FA90', target: 'themes/space/planet.svg' },
  { hex: '1F6F8', target: 'themes/space/ufo.svg' },
  { hex: '1F47D', target: 'themes/space/alien.svg' },
  { hex: '2604', target: 'themes/space/meteor.svg' },

  // Mascots
  { hex: '1F425', target: 'mascots/pippy.svg' },
  { hex: '1F431', target: 'mascots/mimi.svg' },
  { hex: '1F422', target: 'mascots/sam.svg' },
  { hex: '1F680', target: 'mascots/leo.svg' },
];

async function run() {
  console.log(`Starting download of ${ASSET_MAPPING.length} CC0 OpenMoji SVG assets...`);
  let successCount = 0;

  for (const item of ASSET_MAPPING) {
    const destPath = path.join(publicAssetsDir, item.target);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const url = `${BASE_URL}${item.hex}.svg`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`❌ Failed to fetch ${item.hex} (${res.status}): ${url}`);
        continue;
      }
      const svgText = await res.text();
      fs.writeFileSync(destPath, svgText, 'utf8');
      console.log(`✅ [${++successCount}/${ASSET_MAPPING.length}] Saved: ${item.target} (${svgText.length} bytes)`);
    } catch (err) {
      console.error(`❌ Error downloading ${item.target}:`, err.message);
    }
  }

  console.log(`\n🎉 Completed! Successfully updated ${successCount}/${ASSET_MAPPING.length} assets from OpenMoji (CC BY-SA 4.0).`);
}

run();
