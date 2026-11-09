import { DEFAULT_PALETTE } from '../common/palette'

// Manifest asset của CPF Game v2.0.0 (docs/cpf-game-v2.0.0.md mục 5): ánh xạ assetId sang file trong public/assets.
// Id chưa có file trả null; renderer vẽ hình thay thế có nhãn để game vẫn chơi được.
// Nguồn và giấy phép từng thư mục: public/assets/LICENSES.md (OpenMoji CC BY-SA 4.0, Microsoft Fluent Emoji MIT).

const ASSET_FILES: Record<string, string> = {
  'bg.farm': '/assets/themes/farm/bg-farm.svg',
  'bg.ocean': '/assets/themes/ocean/bg-ocean.svg',
  'bg.jungle': '/assets/themes/jungle/bg-jungle.svg',
  'bg.space': '/assets/themes/space/bg-space.svg',
  'mascot.leo': '/assets/mascots/leo.svg',
  'mascot.mimi': '/assets/mascots/mimi.svg',
  'mascot.pippy': '/assets/mascots/pippy.svg',
  'mascot.sam': '/assets/mascots/sam.svg',
  'animal.bird': '/assets/animals/bird.svg',
  'animal.cat': '/assets/animals/cat.svg',
  'animal.dog': '/assets/animals/dog.svg',
  'animal.duck': '/assets/animals/duck.svg',
  'animal.fish': '/assets/animals/fish.svg',
  'animal.rabbit': '/assets/animals/rabbit.svg',
  'fruit.apple': '/assets/fruits/apple.svg',
  'fruit.banana': '/assets/fruits/banana.svg',
  'fruit.orange': '/assets/fruits/orange.svg',
  'fruit.strawberry': '/assets/fruits/strawberry.svg',
  'fruit.watermelon': '/assets/fruits/watermelon.svg',
  'object.ball': '/assets/objects/ball.svg',
  'object.candy': '/assets/objects/candy.svg',
  'object.car': '/assets/objects/car.svg',
  'object.flower': '/assets/objects/flower.svg',
  'object.heart': '/assets/objects/heart.svg',
  'object.star': '/assets/objects/star.svg',
  'farm.barn': '/assets/themes/farm/barn.svg',
  'farm.carrot': '/assets/themes/farm/carrot.svg',
  'farm.chicken': '/assets/themes/farm/chicken.svg',
  'farm.cow': '/assets/themes/farm/cow.svg',
  'farm.pig': '/assets/themes/farm/pig.svg',
  'farm.sheep': '/assets/themes/farm/sheep.svg',
  'jungle.elephant': '/assets/themes/jungle/elephant.svg',
  'jungle.giraffe': '/assets/themes/jungle/giraffe.svg',
  'jungle.monkey': '/assets/themes/jungle/monkey.svg',
  'jungle.tiger': '/assets/themes/jungle/tiger.svg',
  'jungle.tree': '/assets/themes/jungle/tree.svg',
  'sea.clownfish': '/assets/themes/ocean/clownfish.svg',
  'sea.coral': '/assets/themes/ocean/coral.svg',
  'sea.dolphin': '/assets/themes/ocean/dolphin.svg',
  'sea.octopus': '/assets/themes/ocean/octopus.svg',
  'sea.starfish': '/assets/themes/ocean/starfish.svg',
  'sea.turtle': '/assets/themes/ocean/turtle.svg',
  'space.alien': '/assets/themes/space/alien.svg',
  'space.meteor': '/assets/themes/space/meteor.svg',
  'space.planet': '/assets/themes/space/planet.svg',
  'space.rocket': '/assets/themes/space/rocket.svg',
  'space.ufo': '/assets/themes/space/ufo.svg',
  'object.basket': '/assets/fluent/object-basket.svg',
  'object.boat': '/assets/fluent/object-boat.svg',
  'object.bow': '/assets/fluent/object-bow.svg',
  'object.target': '/assets/fluent/object-target.svg',
  'object.sign': '/assets/fluent/object-sign.svg',
  'object.box': '/assets/fluent/object-box.svg',
}

/** Đường dẫn file của asset, hoặc null khi manifest chưa có (vẽ hình thay thế). */
export function assetUrl(assetId: string | undefined): string | null {
  return (assetId && ASSET_FILES[assetId]) || null
}

export const KNOWN_ASSET_IDS: readonly string[] = Object.keys(ASSET_FILES)

// Màu nền thay thế theo nhóm asset (lấy từ bảng màu chung, không viết cứng mã màu) để vật thiếu hình vẫn phân biệt được nhóm.
export function fallbackColor(assetId: string): string {
  const group = assetId.split('.')[0]
  const colors = DEFAULT_PALETTE.linkColors
  let sum = 0
  for (const ch of group) sum += ch.charCodeAt(0)
  return colors[sum % colors.length]
}
