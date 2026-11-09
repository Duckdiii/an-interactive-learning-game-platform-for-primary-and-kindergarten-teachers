/**
 * Bộ chuyển đổi và tra cứu kho tài nguyên đồ họa (Asset Bank) dành cho mầm non và tiểu học.
 * Hỗ trợ nhận diện tự động từ khóa (tiếng Việt, tiếng Anh, không dấu/có dấu)
 * để gán hình ảnh minh họa vector sắc nét (Candy Vector) cho các câu hỏi, thẻ chơi.
 */

export interface AssetItem {
  id: string
  name: string
  category: 'numbers' | 'fruits' | 'animals' | 'objects' | 'themes'
  url: string
  keywords: readonly string[]
}

export const ASSET_CATALOG: readonly AssetItem[] = [
  // Chữ số 1 - 10
  { id: 'num-1', name: 'Số 1', category: 'numbers', url: '/assets/numbers/number-1.svg', keywords: ['so 1', '1', 'mot', 'one', 'first'] },
  { id: 'num-2', name: 'Số 2', category: 'numbers', url: '/assets/numbers/number-2.svg', keywords: ['so 2', '2', 'hai', 'two', 'second'] },
  { id: 'num-3', name: 'Số 3', category: 'numbers', url: '/assets/numbers/number-3.svg', keywords: ['so 3', '3', 'ba', 'three', 'third'] },
  { id: 'num-4', name: 'Số 4', category: 'numbers', url: '/assets/numbers/number-4.svg', keywords: ['so 4', '4', 'bon', 'four'] },
  { id: 'num-5', name: 'Số 5', category: 'numbers', url: '/assets/numbers/number-5.svg', keywords: ['so 5', '5', 'nam', 'five'] },
  { id: 'num-6', name: 'Số 6', category: 'numbers', url: '/assets/numbers/number-6.svg', keywords: ['so 6', '6', 'sau', 'six'] },
  { id: 'num-7', name: 'Số 7', category: 'numbers', url: '/assets/numbers/number-7.svg', keywords: ['so 7', '7', 'bay', 'seven'] },
  { id: 'num-8', name: 'Số 8', category: 'numbers', url: '/assets/numbers/number-8.svg', keywords: ['so 8', '8', 'tam', 'eight'] },
  { id: 'num-9', name: 'Số 9', category: 'numbers', url: '/assets/numbers/number-9.svg', keywords: ['so 9', '9', 'chin', 'nine'] },
  { id: 'num-10', name: 'Số 10', category: 'numbers', url: '/assets/numbers/number-10.svg', keywords: ['so 10', '10', 'muoi', 'ten'] },

  // Hoa quả
  { id: 'fruit-apple', name: 'Quả táo', category: 'fruits', url: '/assets/fruits/apple.svg', keywords: ['tao', 'apple', 'qua tao', 'trai tao'] },
  { id: 'fruit-banana', name: 'Quả chuối', category: 'fruits', url: '/assets/fruits/banana.svg', keywords: ['chuoi', 'banana', 'qua chuoi', 'trai chuoi'] },
  { id: 'fruit-orange', name: 'Quả cam', category: 'fruits', url: '/assets/fruits/orange.svg', keywords: ['cam', 'orange', 'qua cam', 'trai cam'] },
  { id: 'fruit-strawberry', name: 'Dâu tây', category: 'fruits', url: '/assets/fruits/strawberry.svg', keywords: ['dau tay', 'strawberry', 'qua dau', 'trai dau'] },
  { id: 'fruit-watermelon', name: 'Dưa hấu', category: 'fruits', url: '/assets/fruits/watermelon.svg', keywords: ['dua hau', 'watermelon', 'qua dua hau'] },

  // Con vật nông trại & quen thuộc
  { id: 'anim-cat', name: 'Con mèo', category: 'animals', url: '/assets/animals/cat.svg', keywords: ['meo', 'cat', 'chu meo', 'con meo', 'kitten'] },
  { id: 'anim-dog', name: 'Con chó', category: 'animals', url: '/assets/animals/dog.svg', keywords: ['cho', 'dog', 'con cho', 'chu cho', 'puppy'] },
  { id: 'anim-fish', name: 'Con cá', category: 'animals', url: '/assets/animals/fish.svg', keywords: ['ca', 'fish', 'con ca', 'chu ca'] },
  { id: 'anim-bird', name: 'Con chim', category: 'animals', url: '/assets/animals/bird.svg', keywords: ['chim', 'bird', 'con chim', 'chu chim'] },
  { id: 'anim-rabbit', name: 'Con thỏ', category: 'animals', url: '/assets/animals/rabbit.svg', keywords: ['tho', 'rabbit', 'bunny', 'con tho', 'chu tho'] },
  { id: 'anim-duck', name: 'Con vịt', category: 'animals', url: '/assets/animals/duck.svg', keywords: ['vit', 'duck', 'con vit', 'chu vit', 'duckling'] },

  // Đồ vật quen thuộc
  { id: 'obj-star', name: 'Ngôi sao', category: 'objects', url: '/assets/objects/star.svg', keywords: ['sao', 'star', 'ngoi sao', 'ong sao'] },
  { id: 'obj-flower', name: 'Bông hoa', category: 'objects', url: '/assets/objects/flower.svg', keywords: ['hoa', 'flower', 'bong hoa', 'canh hoa'] },
  { id: 'obj-ball', name: 'Quả bóng', category: 'objects', url: '/assets/objects/ball.svg', keywords: ['bong', 'ball', 'qua bong', 'trai banh'] },
  { id: 'obj-candy', name: 'Cây kẹo', category: 'objects', url: '/assets/objects/candy.svg', keywords: ['keo', 'candy', 'vien keo', 'cay keo', 'sweet'] },
  { id: 'obj-heart', name: 'Trái tim', category: 'objects', url: '/assets/objects/heart.svg', keywords: ['tim', 'heart', 'trai tim', 'hinh tim'] },
  { id: 'obj-car', name: 'Xe ô tô', category: 'objects', url: '/assets/objects/car.svg', keywords: ['xe', 'oto', 'car', 'xe hoi', 'o to'] },

  // Chủ đề Đại dương (Ocean Theme)
  { id: 'ocean-clownfish', name: 'Cá hề', category: 'themes', url: '/assets/themes/ocean/clownfish.svg', keywords: ['ca he', 'clownfish', 'ca', 'sinh vat bien'] },
  { id: 'ocean-turtle', name: 'Rùa biển', category: 'themes', url: '/assets/themes/ocean/turtle.svg', keywords: ['rua bien', 'rua', 'turtle', 'con rua'] },
  { id: 'ocean-starfish', name: 'Sao biển', category: 'themes', url: '/assets/themes/ocean/starfish.svg', keywords: ['sao bien', 'starfish'] },
  { id: 'ocean-octopus', name: 'Bạch tuộc', category: 'themes', url: '/assets/themes/ocean/octopus.svg', keywords: ['bach tuoc', 'octopus'] },
  { id: 'ocean-dolphin', name: 'Cá heo', category: 'themes', url: '/assets/themes/ocean/dolphin.svg', keywords: ['ca heo', 'dolphin'] },
  { id: 'ocean-coral', name: 'San hô', category: 'themes', url: '/assets/themes/ocean/coral.svg', keywords: ['san ho', 'coral'] },

  // Chủ đề Nông trại (Farm Theme)
  { id: 'farm-chicken', name: 'Con gà', category: 'themes', url: '/assets/themes/farm/chicken.svg', keywords: ['ga', 'con ga', 'chicken', 'chu ga'] },
  { id: 'farm-cow', name: 'Con bò', category: 'themes', url: '/assets/themes/farm/cow.svg', keywords: ['bo', 'con bo', 'cow', 'bo sua'] },
  { id: 'farm-sheep', name: 'Con cừu', category: 'themes', url: '/assets/themes/farm/sheep.svg', keywords: ['cuu', 'con cuu', 'sheep', 'chu cuu'] },
  { id: 'farm-pig', name: 'Con lợn', category: 'themes', url: '/assets/themes/farm/pig.svg', keywords: ['lon', 'heo', 'con lon', 'con heo', 'pig'] },
  { id: 'farm-carrot', name: 'Củ cà rốt', category: 'themes', url: '/assets/themes/farm/carrot.svg', keywords: ['ca rot', 'carrot', 'cu ca rot'] },
  { id: 'farm-barn', name: 'Chuồng trại', category: 'themes', url: '/assets/themes/farm/barn.svg', keywords: ['chuong', 'chuong trai', 'nong trai', 'barn'] },

  // Chủ đề Rừng xanh (Jungle Theme)
  { id: 'jungle-monkey', name: 'Con khỉ', category: 'themes', url: '/assets/themes/jungle/monkey.svg', keywords: ['khi', 'con khi', 'monkey', 'chu khi'] },
  { id: 'jungle-tiger', name: 'Con hổ', category: 'themes', url: '/assets/themes/jungle/tiger.svg', keywords: ['ho', 'con ho', 'tiger', 'chu ho', 'cop'] },
  { id: 'jungle-elephant', name: 'Con voi', category: 'themes', url: '/assets/themes/jungle/elephant.svg', keywords: ['voi', 'con voi', 'elephant', 'chu voi'] },
  { id: 'jungle-giraffe', name: 'Hươu cao cổ', category: 'themes', url: '/assets/themes/jungle/giraffe.svg', keywords: ['huou cao co', 'huou', 'giraffe'] },
  { id: 'jungle-tree', name: 'Cây xanh', category: 'themes', url: '/assets/themes/jungle/tree.svg', keywords: ['cay xanh', 'cay coi', 'cay co thu', 'tree'] },

  // Chủ đề Vũ trụ (Space Theme)
  { id: 'space-rocket', name: 'Tên lửa', category: 'themes', url: '/assets/themes/space/rocket.svg', keywords: ['ten lua', 'rocket', 'phi thuyen', 'tau vu tru'] },
  { id: 'space-planet', name: 'Hành tinh', category: 'themes', url: '/assets/themes/space/planet.svg', keywords: ['hanh tinh', 'planet', 'trai dat'] },
  { id: 'space-ufo', name: 'Đĩa bay', category: 'themes', url: '/assets/themes/space/ufo.svg', keywords: ['dia bay', 'ufo'] },
  { id: 'space-alien', name: 'Người ngoài hành tinh', category: 'themes', url: '/assets/themes/space/alien.svg', keywords: ['nguoi ngoai hanh tinh', 'alien'] },
  { id: 'space-meteor', name: 'Sao băng', category: 'themes', url: '/assets/themes/space/meteor.svg', keywords: ['sao bang', 'meteor'] },

  // Microsoft Fluent Emoji (MIT, xem public/assets/LICENSES.md), thêm ngày 2026-11-09
  { id: 'fluent-object-basket', name: 'Cái giỏ', category: 'objects', url: '/assets/fluent/object-basket.svg', keywords: ['cai gio', 'gio hung', 'basket'] },
  { id: 'fluent-object-boat', name: 'Con thuyền', category: 'objects', url: '/assets/fluent/object-boat.svg', keywords: ['thuyen', 'con thuyen', 'thuyen buom', 'boat', 'sailboat'] },
  { id: 'fluent-object-bow', name: 'Cung tên', category: 'objects', url: '/assets/fluent/object-bow.svg', keywords: ['cung ten', 'cay cung', 'bow and arrow', 'archery'] },
  { id: 'fluent-object-target', name: 'Bia bắn', category: 'objects', url: '/assets/fluent/object-target.svg', keywords: ['bia ban', 'hong tam', 'target', 'bullseye'] },
  { id: 'fluent-object-sign', name: 'Biển báo', category: 'objects', url: '/assets/fluent/object-sign.svg', keywords: ['bien bao', 'tam bien', 'sign', 'placard'] },
  { id: 'fluent-object-box', name: 'Cái hộp', category: 'objects', url: '/assets/fluent/object-box.svg', keywords: ['cai hop', 'hop qua tang', 'thung hang', 'box', 'package'] },
  { id: 'fluent-bg-road', name: 'Đường cao tốc', category: 'objects', url: '/assets/fluent/bg-road.svg', keywords: ['duong cao toc', 'duong dua', 'highway', 'road'] },
  { id: 'fluent-animal-buffalo', name: 'Con trâu', category: 'animals', url: '/assets/fluent/animal-buffalo.svg', keywords: ['trau', 'con trau', 'buffalo', 'water buffalo'] },
  { id: 'fluent-animal-snake', name: 'Con rắn', category: 'animals', url: '/assets/fluent/animal-snake.svg', keywords: ['con ran', 'snake'] },
  { id: 'fluent-animal-horse', name: 'Con ngựa', category: 'animals', url: '/assets/fluent/animal-horse.svg', keywords: ['con ngua', 'horse'] },
  { id: 'fluent-animal-frog', name: 'Con ếch', category: 'animals', url: '/assets/fluent/animal-frog.svg', keywords: ['ech', 'con ech', 'frog'] },
  { id: 'fluent-animal-butterfly', name: 'Con bướm', category: 'animals', url: '/assets/fluent/animal-butterfly.svg', keywords: ['buom', 'con buom', 'butterfly'] },
  { id: 'fluent-animal-bee', name: 'Con ong', category: 'animals', url: '/assets/fluent/animal-bee.svg', keywords: ['con ong', 'bee', 'honeybee'] },
  { id: 'fluent-animal-ant', name: 'Con kiến', category: 'animals', url: '/assets/fluent/animal-ant.svg', keywords: ['con kien', 'ant'] },
  { id: 'fluent-animal-lion', name: 'Con sư tử', category: 'animals', url: '/assets/fluent/animal-lion.svg', keywords: ['su tu', 'con su tu', 'lion'] },
  { id: 'fluent-animal-bear', name: 'Con gấu', category: 'animals', url: '/assets/fluent/animal-bear.svg', keywords: ['gau', 'con gau', 'bear'] },
  { id: 'fluent-animal-panda', name: 'Gấu trúc', category: 'animals', url: '/assets/fluent/animal-panda.svg', keywords: ['gau truc', 'panda'] },
  { id: 'fluent-animal-zebra', name: 'Ngựa vằn', category: 'animals', url: '/assets/fluent/animal-zebra.svg', keywords: ['ngua van', 'zebra'] },
  { id: 'fluent-animal-penguin', name: 'Chim cánh cụt', category: 'animals', url: '/assets/fluent/animal-penguin.svg', keywords: ['chim canh cut', 'canh cut', 'penguin'] },
  { id: 'fluent-animal-owl', name: 'Con cú', category: 'animals', url: '/assets/fluent/animal-owl.svg', keywords: ['cu meo', 'chim cu meo', 'con cu', 'owl'] },
  { id: 'fluent-animal-crab', name: 'Con cua', category: 'animals', url: '/assets/fluent/animal-crab.svg', keywords: ['con cua', 'crab'] },
  { id: 'fluent-animal-snail', name: 'Con ốc sên', category: 'animals', url: '/assets/fluent/animal-snail.svg', keywords: ['oc sen', 'con oc sen', 'snail'] },
  { id: 'fluent-animal-mouse', name: 'Con chuột', category: 'animals', url: '/assets/fluent/animal-mouse.svg', keywords: ['chuot', 'con chuot', 'mouse'] },
  { id: 'fluent-animal-goat', name: 'Con dê', category: 'animals', url: '/assets/fluent/animal-goat.svg', keywords: ['goat'] },
  { id: 'fluent-animal-dinosaur', name: 'Khủng long', category: 'animals', url: '/assets/fluent/animal-dinosaur.svg', keywords: ['khung long', 'dinosaur'] },
  { id: 'fluent-animal-hedgehog', name: 'Con nhím', category: 'animals', url: '/assets/fluent/animal-hedgehog.svg', keywords: ['nhim', 'con nhim', 'hedgehog'] },
  { id: 'fluent-object-balloon', name: 'Bóng bay', category: 'objects', url: '/assets/fluent/object-balloon.svg', keywords: ['bong bay', 'qua bong bay', 'balloon', 'balloons'] },
  { id: 'fluent-object-pencil', name: 'Bút chì', category: 'objects', url: '/assets/fluent/object-pencil.svg', keywords: ['but chi', 'pencil'] },
  { id: 'fluent-object-book', name: 'Quyển sách', category: 'objects', url: '/assets/fluent/object-book.svg', keywords: ['quyen sach', 'cuon sach', 'book'] },
  { id: 'fluent-object-backpack', name: 'Ba lô', category: 'objects', url: '/assets/fluent/object-backpack.svg', keywords: ['ba lo', 'cap sach', 'backpack', 'school bag'] },
  { id: 'fluent-object-umbrella', name: 'Cái ô', category: 'objects', url: '/assets/fluent/object-umbrella.svg', keywords: ['cai o', 'cay du', 'umbrella'] },
  { id: 'fluent-object-clock', name: 'Đồng hồ', category: 'objects', url: '/assets/fluent/object-clock.svg', keywords: ['dong ho', 'clock'] },
  { id: 'fluent-object-house', name: 'Ngôi nhà', category: 'objects', url: '/assets/fluent/object-house.svg', keywords: ['ngoi nha', 'can nha', 'house'] },
  { id: 'fluent-object-tree', name: 'Cái cây', category: 'objects', url: '/assets/fluent/object-tree.svg', keywords: ['cai cay', 'cay to', 'tree'] },
  { id: 'fluent-object-sun', name: 'Mặt trời', category: 'objects', url: '/assets/fluent/object-sun.svg', keywords: ['mat troi', 'sun'] },
  { id: 'fluent-object-cloud', name: 'Đám mây', category: 'objects', url: '/assets/fluent/object-cloud.svg', keywords: ['dam may', 'may troi', 'cloud'] },
  { id: 'fluent-object-bicycle', name: 'Xe đạp', category: 'objects', url: '/assets/fluent/object-bicycle.svg', keywords: ['xe dap', 'bicycle', 'bike'] },
  { id: 'fluent-object-bus', name: 'Xe buýt', category: 'objects', url: '/assets/fluent/object-bus.svg', keywords: ['xe buyt', 'bus'] },
  { id: 'fluent-object-airplane', name: 'Máy bay', category: 'objects', url: '/assets/fluent/object-airplane.svg', keywords: ['may bay', 'airplane', 'plane'] },
  { id: 'fluent-object-kite', name: 'Con diều', category: 'objects', url: '/assets/fluent/object-kite.svg', keywords: ['con dieu', 'kite'] },
  { id: 'fluent-object-teddy', name: 'Gấu bông', category: 'objects', url: '/assets/fluent/object-teddy.svg', keywords: ['gau bong', 'teddy bear', 'teddy'] },
  { id: 'fluent-object-gift', name: 'Hộp quà', category: 'objects', url: '/assets/fluent/object-gift.svg', keywords: ['hop qua', 'mon qua', 'qua tang', 'gift'] },
  { id: 'fluent-object-cake', name: 'Bánh sinh nhật', category: 'objects', url: '/assets/fluent/object-cake.svg', keywords: ['banh sinh nhat', 'banh kem', 'cake'] },
  { id: 'fluent-object-soccer', name: 'Quả bóng đá', category: 'objects', url: '/assets/fluent/object-soccer.svg', keywords: ['bong da', 'qua bong da', 'soccer ball', 'football'] },
  { id: 'fluent-object-scissors', name: 'Cái kéo', category: 'objects', url: '/assets/fluent/object-scissors.svg', keywords: ['cai keo', 'scissors'] },
  { id: 'fluent-object-ruler', name: 'Thước kẻ', category: 'objects', url: '/assets/fluent/object-ruler.svg', keywords: ['thuoc ke', 'cay thuoc', 'ruler'] },
  { id: 'fluent-object-red_envelope', name: 'Bao lì xì', category: 'objects', url: '/assets/fluent/object-red_envelope.svg', keywords: ['li xi', 'bao li xi', 'red envelope'] },
  { id: 'fluent-object-lantern', name: 'Đèn lồng', category: 'objects', url: '/assets/fluent/object-lantern.svg', keywords: ['den long', 'den ong sao', 'lantern'] },
  { id: 'fluent-body-ear', name: 'Cái tai', category: 'objects', url: '/assets/fluent/body-ear.svg', keywords: ['cai tai', 'doi tai', 'ear', 'ears'] },
  { id: 'fluent-body-eye', name: 'Con mắt', category: 'objects', url: '/assets/fluent/body-eye.svg', keywords: ['con mat', 'doi mat', 'eye', 'eyes'] },
  { id: 'fluent-body-nose', name: 'Cái mũi', category: 'objects', url: '/assets/fluent/body-nose.svg', keywords: ['cai mui', 'nose'] },
  { id: 'fluent-body-mouth', name: 'Cái miệng', category: 'objects', url: '/assets/fluent/body-mouth.svg', keywords: ['cai mieng', 'mouth'] },
  { id: 'fluent-body-hand', name: 'Bàn tay', category: 'objects', url: '/assets/fluent/body-hand.svg', keywords: ['ban tay', 'hand', 'hands'] },
  { id: 'fluent-body-foot', name: 'Bàn chân', category: 'objects', url: '/assets/fluent/body-foot.svg', keywords: ['ban chan', 'foot', 'feet'] },
  { id: 'fluent-body-leg', name: 'Cái chân', category: 'objects', url: '/assets/fluent/body-leg.svg', keywords: ['cai chan', 'doi chan', 'leg', 'legs'] },
  { id: 'fluent-body-tooth', name: 'Cái răng', category: 'objects', url: '/assets/fluent/body-tooth.svg', keywords: ['cai rang', 'tooth', 'teeth'] },
  { id: 'fluent-food-corn', name: 'Bắp ngô', category: 'fruits', url: '/assets/fluent/food-corn.svg', keywords: ['bap ngo', 'corn'] },
  { id: 'fluent-food-tomato', name: 'Quả cà chua', category: 'fruits', url: '/assets/fluent/food-tomato.svg', keywords: ['ca chua', 'qua ca chua', 'tomato'] },
  { id: 'fluent-food-grapes', name: 'Chùm nho', category: 'fruits', url: '/assets/fluent/food-grapes.svg', keywords: ['chum nho', 'qua nho', 'grapes'] },
  { id: 'fluent-food-mango', name: 'Quả xoài', category: 'fruits', url: '/assets/fluent/food-mango.svg', keywords: ['xoai', 'qua xoai', 'mango'] },
  { id: 'fluent-food-pineapple', name: 'Quả dứa', category: 'fruits', url: '/assets/fluent/food-pineapple.svg', keywords: ['qua dua', 'trai thom', 'pineapple'] },
  { id: 'fluent-food-bread', name: 'Bánh mì', category: 'fruits', url: '/assets/fluent/food-bread.svg', keywords: ['banh mi', 'bread'] },
  { id: 'fluent-food-rice', name: 'Bát cơm', category: 'fruits', url: '/assets/fluent/food-rice.svg', keywords: ['bat com', 'rice'] },
  { id: 'fluent-food-egg', name: 'Quả trứng', category: 'fruits', url: '/assets/fluent/food-egg.svg', keywords: ['qua trung', 'egg'] },
  { id: 'fluent-food-milk', name: 'Cốc sữa', category: 'fruits', url: '/assets/fluent/food-milk.svg', keywords: ['coc sua', 'ly sua', 'milk'] },
  { id: 'fluent-plant-rose', name: 'Hoa hồng', category: 'objects', url: '/assets/fluent/plant-rose.svg', keywords: ['hoa hong', 'rose'] },
  { id: 'fluent-plant-tulip', name: 'Hoa tulip', category: 'objects', url: '/assets/fluent/plant-tulip.svg', keywords: ['hoa tulip', 'tulip'] },
  { id: 'fluent-plant-sunflower', name: 'Hoa hướng dương', category: 'objects', url: '/assets/fluent/plant-sunflower.svg', keywords: ['hoa huong duong', 'huong duong', 'sunflower'] },
  { id: 'fluent-plant-mushroom', name: 'Cây nấm', category: 'objects', url: '/assets/fluent/plant-mushroom.svg', keywords: ['cay nam', 'mushroom'] },
]

/** Chuẩn hóa xâu chữ: bỏ dấu tiếng Việt, ký tự đặc biệt, chuyển chữ thường */
export function normalizeKeyword(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Tạo danh sách phẳng tất cả từ khóa xếp theo độ dài giảm dần (từ ghép được ưu tiên trước từ đơn)
const KEYWORD_MAP = ASSET_CATALOG.flatMap((item) =>
  item.keywords.map((kw) => ({ kw: normalizeKeyword(kw), url: item.url }))
).sort((a, b) => b.kw.length - a.kw.length)

/**
 * Bản đồ liên tưởng chữ cái tiếng Việt sang hình ảnh minh họa vector OpenMoji (Chuẩn mỹ thuật K-5)
 * Nguyên tắc: "Chữ gắn liền với hình" (Visual Association) giúp học sinh lớp 1 nhận biết chữ trực quan.
 */
export const LETTER_ASSOCIATION_MAP: Record<string, { name: string; url: string }> = {
  a: { name: 'Quả táo', url: '/assets/fruits/apple.svg' },
  ă: { name: 'Quả cam', url: '/assets/fruits/orange.svg' },
  â: { name: 'Quả chuối', url: '/assets/fruits/banana.svg' },
  b: { name: 'Quả bóng', url: '/assets/objects/ball.svg' },
  c: { name: 'Con cá', url: '/assets/animals/fish.svg' },
  ch: { name: 'Con chó', url: '/assets/animals/dog.svg' },
  d: { name: 'Dưa hấu', url: '/assets/fruits/watermelon.svg' },
  đ: { name: 'Bông hoa', url: '/assets/objects/flower.svg' },
  e: { name: 'Con vịt', url: '/assets/animals/duck.svg' },
  ê: { name: 'Con bò', url: '/assets/themes/farm/farm-cow.svg' },
  g: { name: 'Con gà', url: '/assets/themes/farm/farm-chicken.svg' },
  h: { name: 'Bông hoa', url: '/assets/objects/flower.svg' },
  k: { name: 'Kẹo ngọt', url: '/assets/objects/candy.svg' },
  l: { name: 'Con lợn', url: '/assets/themes/farm/farm-pig.svg' },
  m: { name: 'Con mèo', url: '/assets/animals/cat.svg' },
  n: { name: 'Ngôi sao', url: '/assets/objects/star.svg' },
  o: { name: 'Con ong', url: '/assets/animals/rabbit.svg' },
  ô: { name: 'Chiếc ô', url: '/assets/objects/star.svg' },
  ơ: { name: 'Bông hoa', url: '/assets/objects/flower.svg' },
  p: { name: 'Phi thuyền', url: '/assets/themes/space/space-rocket.svg' },
  r: { name: 'Rùa biển', url: '/assets/themes/ocean/ocean-turtle.svg' },
  s: { name: 'Ngôi sao', url: '/assets/objects/star.svg' },
  t: { name: 'Chú thỏ', url: '/assets/animals/rabbit.svg' },
  th: { name: 'Thuyền buồm', url: '/assets/themes/ocean/bg-ocean.svg' },
  v: { name: 'Con vịt', url: '/assets/animals/duck.svg' },
  x: { name: 'Xe hơi', url: '/assets/objects/car.svg' },
}

/**
 * Tự động tìm URL hình ảnh từ văn bản hoặc mô tả hình ảnh.
 * Ưu tiên tra cứu `visualPrompt`, nếu không có thì tra cứu `text`.
 */
export function resolveAssetUrl(text?: string, visualPrompt?: string): string | null {
  const candidates = [visualPrompt, text].filter(Boolean) as string[]

  for (const raw of candidates) {
    const normalized = normalizeKeyword(raw)
    if (!normalized) continue

    // Khớp từ khóa dài nhất trước (vd: "ca he" khớp trước "ca")
    for (const { kw, url } of KEYWORD_MAP) {
      const regex = new RegExp(`(^|\\s)${kw}(\\s|$)`, 'i')
      if (regex.test(normalized) || normalized === kw) {
        return url
      }
    }

    // Nếu là chữ cái đơn lẻ hoặc cặp chữ cái (vd: "a", "c", "m", "ch")
    if (LETTER_ASSOCIATION_MAP[normalized]) {
      return LETTER_ASSOCIATION_MAP[normalized].url
    }
  }

  return null
}

/**
 * Quét chuỗi văn bản để tìm tất cả các item trong kho asset được nhắc tới
 */
export function findCatalogItemsInText(text: string): AssetItem[] {
  const norm = normalizeKeyword(text)
  const matches: { item: AssetItem; length: number }[] = []
  const seenUrls = new Set<string>()

  for (const item of ASSET_CATALOG) {
    if (seenUrls.has(item.url)) continue
    // Từ khóa dài nhất khớp được của vật này: "bong bay" (bóng bay) phải thắng "bong" (quả bóng).
    const length = Math.max(
      0,
      ...item.keywords
        .map(normalizeKeyword)
        .filter((kw) => new RegExp(`(^|\\s)${kw}(\\s|$)`, 'i').test(norm))
        .map((kw) => kw.length),
    )
    if (length > 0) {
      matches.push({ item, length })
      seenUrls.add(item.url)
    }
  }

  return matches.sort((a, b) => b.length - a.length).map((match) => match.item)
}

export type DeduceTheme = 'ocean' | 'farm' | 'space' | 'jungle'

export interface DeducedThemeInfo {
  theme: DeduceTheme
  background: string
  mascot: string
}

/**
 * Tự động bóc tách ngữ nghĩa đề bài để suy ra Theme thế giới game
 */
/**
 * Nhận diện từ khóa chủ đề rõ ràng (nếu không có từ khóa đặc thù thì trả về null để không ghi đè luật môn học)
 */
export function detectExplicitTheme(text: string): DeduceTheme | null {
  const norm = normalizeKeyword(text)
  if (!norm) return null

  const oceanKeywords = [
    'bien', 'ca', 'rua', 'san ho', 'nuoc', 'dai duong', 'thuy cung',
    'bach tuoc', 'ca heo', 'sao bien', 'ocean', 'sea', 'fish', 'clownfish',
  ]
  const farmKeywords = [
    'nong trai', 'ga', 'bo', 'cuu', 'lon', 'heo', 'hoa qua', 'tao',
    'cam', 'chuoi', 'dua hau', 'ca rot', 'nong dan', 'dong co', 'farm',
  ]
  const spaceKeywords = [
    'vu tru', 'hanh tinh', 'ten lua', 'sao', 'phi thuyen', 'ufo',
    'alien', 'thien ha', 'ngan ha', 'space', 'planet', 'rocket', 'star',
  ]
  const jungleKeywords = [
    'rung', 'rung xanh', 'khi', 'ho', 'voi', 'huou', 'muong thu',
    'cay coi', 'cay', 'jungle', 'forest',
  ]

  const hasWord = (keywords: string[]) =>
    keywords.some((kw) => {
      const regex = new RegExp(`(^|\\s)${kw}(\\s|$)`, 'i')
      return regex.test(norm)
    })

  if (hasWord(oceanKeywords)) return 'ocean'
  if (hasWord(farmKeywords)) return 'farm'
  if (hasWord(spaceKeywords)) return 'space'
  if (hasWord(jungleKeywords)) return 'jungle'

  return null
}

/**
 * Tự động bóc tách ngữ nghĩa đề bài để suy ra Theme thế giới game (mặc định rừng xanh nếu không rõ)
 */
export function deduceThemeFromText(text: string): DeducedThemeInfo {
  const detected = detectExplicitTheme(text) ?? 'jungle'
  switch (detected) {
    case 'ocean':
      return {
        theme: 'ocean',
        background: '/assets/themes/ocean/bg-ocean.svg',
        mascot: '/assets/mascots/sam.svg',
      }
    case 'farm':
      return {
        theme: 'farm',
        background: '/assets/themes/farm/bg-farm.svg',
        mascot: '/assets/mascots/pippy.svg',
      }
    case 'space':
      return {
        theme: 'space',
        background: '/assets/themes/space/bg-space.svg',
        mascot: '/assets/mascots/leo.svg',
      }
    case 'jungle':
    default:
      return {
        theme: 'jungle',
        background: '/assets/themes/jungle/bg-jungle.svg',
        mascot: '/assets/mascots/mimi.svg',
      }
  }
}

const THEME_FALLBACK_SPRITES: Record<DeduceTheme, string[]> = {
  ocean: [
    '/assets/themes/ocean/clownfish.svg',
    '/assets/themes/ocean/turtle.svg',
    '/assets/themes/ocean/starfish.svg',
    '/assets/themes/ocean/octopus.svg',
    '/assets/themes/ocean/dolphin.svg',
    '/assets/themes/ocean/coral.svg',
  ],
  farm: [
    '/assets/themes/farm/apple.svg',
    '/assets/themes/farm/chicken.svg',
    '/assets/themes/farm/cow.svg',
    '/assets/themes/farm/sheep.svg',
    '/assets/themes/farm/carrot.svg',
    '/assets/themes/farm/orange.svg',
  ],
  space: [
    '/assets/themes/space/rocket.svg',
    '/assets/themes/space/planet.svg',
    '/assets/themes/space/ufo.svg',
    '/assets/objects/star.svg',
    '/assets/themes/space/alien.svg',
    '/assets/themes/space/meteor.svg',
  ],
  jungle: [
    '/assets/themes/jungle/monkey.svg',
    '/assets/themes/jungle/tiger.svg',
    '/assets/themes/jungle/elephant.svg',
    '/assets/themes/jungle/giraffe.svg',
    '/assets/themes/jungle/tree.svg',
    '/assets/animals/bird.svg',
  ],
}

/**
 * Tự động gán URL hình ảnh từ Kho Asset cho nội dung câu hỏi nếu chưa có ảnh.
 * Với MATCHING và MEMORY_CARD, BẮT BUỘC mọi cặp đều có hình ảnh minh họa vector.
 */
export function enrichGameWithAssets<T extends { gameType: string; questions: unknown[]; metadata?: { topic?: string; title?: string; theme?: string } }>(game: T): T {
  const deduced = deduceThemeFromText(`${game.metadata?.topic ?? ''} ${game.metadata?.title ?? ''}`)
  const themeKey: DeduceTheme = (game.metadata?.theme as DeduceTheme) || deduced.theme
  const pool = THEME_FALLBACK_SPRITES[themeKey] || THEME_FALLBACK_SPRITES.jungle

  if (game.gameType === 'MATCHING') {
    for (const q of game.questions as Array<{ pairs?: Array<{ left: { text?: string; visualPrompt?: string; imageUrl?: string }; right: { text?: string; visualPrompt?: string; imageUrl?: string } }> }>) {
      if (!Array.isArray(q.pairs)) continue
      q.pairs.forEach((pair, idx) => {
        if (!pair.left.imageUrl) {
          const normLeft = pair.left.text ? normalizeKeyword(pair.left.text) : ''
          const letterAssoc = LETTER_ASSOCIATION_MAP[normLeft]
          const url = letterAssoc?.url || resolveAssetUrl(pair.left.text, pair.left.visualPrompt)
          pair.left.imageUrl = url || pool[idx % pool.length]
        }
        if (!pair.right.imageUrl) {
          const normRight = pair.right.text ? normalizeKeyword(pair.right.text) : ''
          const letterAssoc = LETTER_ASSOCIATION_MAP[normRight]
          const url = letterAssoc?.url || resolveAssetUrl(pair.right.text, pair.right.visualPrompt)
          pair.right.imageUrl = url || pair.left.imageUrl
        }
      })
    }
  } else if (game.gameType === 'MEMORY_CARD') {
    for (const q of game.questions as Array<{ pairs?: Array<{ content: { text?: string; visualPrompt?: string; imageUrl?: string } }> }>) {
      if (!Array.isArray(q.pairs)) continue
      q.pairs.forEach((pair, idx) => {
        if (!pair.content.imageUrl) {
          const url = resolveAssetUrl(pair.content.text, pair.content.visualPrompt)
          pair.content.imageUrl = url || pool[idx % pool.length]
        }
      })
    }
  } else if (game.gameType === 'QUIZ') {
    for (const q of game.questions as Array<{ questionText?: string; visualPrompt?: string; imageUrl?: string; options?: Array<{ text?: string; visualPrompt?: string; imageUrl?: string }> }>) {
      if (!q.imageUrl) {
        const url = resolveAssetUrl(q.questionText, q.visualPrompt)
        if (url) q.imageUrl = url
      }
      if (Array.isArray(q.options)) {
        for (const opt of q.options) {
          if (!opt.imageUrl && (opt.text || opt.visualPrompt)) {
            const optUrl = resolveAssetUrl(opt.text, opt.visualPrompt)
            if (optUrl) opt.imageUrl = optUrl
          }
        }
      }
    }
  } else if (game.gameType === 'DRAG_DROP') {
    for (const q of game.questions as Array<{ items?: Array<{ text?: string; visualPrompt?: string; imageUrl?: string }> }>) {
      if (!Array.isArray(q.items)) continue
      for (const item of q.items) {
        if (!item.imageUrl) {
          const url = resolveAssetUrl(item.text, item.visualPrompt)
          if (url) item.imageUrl = url
        }
      }
    }
  }

  return game
}
