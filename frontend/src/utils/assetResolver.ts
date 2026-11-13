/**
 * Bộ chuyển đổi và tra cứu kho tài nguyên đồ họa (Asset Bank) dành cho mầm non và tiểu học.
 * Hỗ trợ nhận diện tự động từ khóa (tiếng Việt, tiếng Anh, không dấu/có dấu)
 * để gán hình ảnh minh họa vector sắc nét (Candy Vector) cho các câu hỏi, thẻ chơi.
 *
 * ASSET_CATALOG là nguồn duy nhất của danh mục hình (backend sinh từ đây: scripts/assets/build-game-asset-catalog.mjs).
 * Tệp này KHÔNG được import gì lúc chạy: script Node nạp thẳng tệp .ts và không hiểu đường dẫn không có đuôi.
 */

export interface AssetItem {
  id: string
  name: string
  /** Nhãn riêng đưa vào prompt cho AI khi `name` chưa đủ phân biệt (ví dụ quả bóng đồ chơi và bóng bay). */
  promptLabel?: string
  /**
   * Từ khóa chỉ để backend khớp chữ với hình (không dùng ở bộ khớp của frontend, nên không thêm bóng vào mục chủ đề cùng nghĩa).
   * Dùng cụm nhiều chữ như "con voi", tránh từ trơ trọi dễ trùng âm khi bỏ dấu.
   */
  matchKeywords?: readonly string[]
  /**
   * Từ khóa CÓ DẤU (viết thường, khớp nguyên từ, phân biệt dấu) chỉ cho backend: "bàn" khác "bạn", "đầu" khác "dâu" và "đau".
   * Dùng cho từ ngắn mà bỏ dấu sẽ trùng âm; bộ khớp của frontend không dùng.
   */
  exactKeywords?: readonly string[]
  category: 'numbers' | 'fruits' | 'animals' | 'objects' | 'themes'
  url: string
  keywords: readonly string[]
}

export const ASSET_CATALOG: readonly AssetItem[] = [
  // Chữ số 1 - 10
  { id: 'num-1', name: 'Số 1', category: 'numbers', url: '/assets/numbers/number-1.svg', keywords: ['so 1', '1', 'so mot', 'one', 'first'] },
  { id: 'num-2', name: 'Số 2', category: 'numbers', url: '/assets/numbers/number-2.svg', keywords: ['so 2', '2', 'so hai', 'two', 'second'] },
  { id: 'num-3', name: 'Số 3', category: 'numbers', url: '/assets/numbers/number-3.svg', keywords: ['so 3', '3', 'so ba', 'three', 'third'] },
  { id: 'num-4', name: 'Số 4', category: 'numbers', url: '/assets/numbers/number-4.svg', keywords: ['so 4', '4', 'so bon', 'four'] },
  { id: 'num-5', name: 'Số 5', category: 'numbers', url: '/assets/numbers/number-5.svg', keywords: ['so 5', '5', 'so nam', 'five'] },
  { id: 'num-6', name: 'Số 6', category: 'numbers', url: '/assets/numbers/number-6.svg', keywords: ['so 6', '6', 'so sau', 'six'] },
  { id: 'num-7', name: 'Số 7', category: 'numbers', url: '/assets/numbers/number-7.svg', keywords: ['so 7', '7', 'so bay', 'seven'] },
  { id: 'num-8', name: 'Số 8', category: 'numbers', url: '/assets/numbers/number-8.svg', keywords: ['so 8', '8', 'so tam', 'eight'] },
  { id: 'num-9', name: 'Số 9', category: 'numbers', url: '/assets/numbers/number-9.svg', keywords: ['so 9', '9', 'so chin', 'nine'] },
  { id: 'num-10', name: 'Số 10', category: 'numbers', url: '/assets/numbers/number-10.svg', keywords: ['so 10', '10', 'so muoi', 'ten'] },

  // Hoa quả
  { id: 'fruit-apple', name: 'Quả táo', category: 'fruits', url: '/assets/fruits/apple.svg', keywords: ['tao', 'apple', 'qua tao', 'trai tao'] },
  { id: 'fruit-banana', name: 'Quả chuối', category: 'fruits', url: '/assets/fruits/banana.svg', keywords: ['chuoi', 'banana', 'qua chuoi', 'trai chuoi'] },
  { id: 'fruit-orange', name: 'Quả cam', category: 'fruits', url: '/assets/fruits/orange.svg', keywords: ['cam', 'orange', 'qua cam', 'trai cam'] },
  { id: 'fruit-strawberry', name: 'Dâu tây', category: 'fruits', url: '/assets/fruits/strawberry.svg', keywords: ['dau tay', 'strawberry', 'qua dau', 'trai dau'], exactKeywords: ['dâu'] },
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
  { id: 'obj-ball', name: 'Quả bóng', promptLabel: 'Quả bóng tròn đồ chơi (không phải bóng bay)', category: 'objects', url: '/assets/objects/ball.svg', keywords: ['bong', 'ball', 'qua bong', 'trai banh'] },
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
  { id: 'farm-pig', name: 'Con lợn', category: 'themes', url: '/assets/themes/farm/pig.svg', keywords: [] },
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
  { id: 'fluent-object-lantern', name: 'Đèn lồng', category: 'objects', url: '/assets/fluent/object-lantern.svg', keywords: ['den long', 'lantern'] },
  { id: 'fluent-body-ear', name: 'Cái tai', category: 'objects', url: '/assets/fluent/body-ear.svg', keywords: ['cai tai', 'doi tai', 'ear', 'ears'] },
  { id: 'fluent-body-eye', name: 'Con mắt', category: 'objects', url: '/assets/fluent/body-eye.svg', keywords: ['con mat', 'doi mat', 'eye', 'eyes'] },
  { id: 'fluent-body-nose', name: 'Cái mũi', category: 'objects', url: '/assets/fluent/body-nose.svg', keywords: ['cai mui', 'nose'] },
  { id: 'fluent-body-mouth', name: 'Cái miệng', category: 'objects', url: '/assets/fluent/body-mouth.svg', keywords: ['cai mieng', 'mouth'] },
  { id: 'fluent-body-hand', name: 'Bàn tay', category: 'objects', url: '/assets/fluent/body-hand.svg', keywords: ['ban tay', 'hand', 'hands'] },
  { id: 'fluent-body-foot', name: 'Bàn chân', category: 'objects', url: '/assets/fluent/body-foot.svg', keywords: ['ban chan', 'foot', 'feet'], exactKeywords: ['chân'] },
  { id: 'fluent-body-leg', name: 'Cái chân', category: 'objects', url: '/assets/fluent/body-leg.svg', keywords: ['cai chan', 'doi chan', 'leg', 'legs'] },
  { id: 'fluent-body-tooth', name: 'Cái răng', category: 'objects', url: '/assets/fluent/body-tooth.svg', keywords: ['cai rang', 'tooth', 'teeth'], exactKeywords: ['răng'] },
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

  // Bổ sung giai đoạn 3 (xem docs/wiki/Khảo sát kho asset và độ phủ.md): Fluent Flat, hình tự vẽ (custom/), Kenney (CC0).
  { id: 'fluent-food-carrot', name: 'Củ cà rốt', category: 'objects', url: '/assets/fluent/food-carrot.svg', keywords: ['ca rot', 'cu ca rot', 'carrot'] },
  { id: 'fluent-food-cheese', name: 'Miếng phô mai', category: 'objects', url: '/assets/fluent/food-cheese.svg', keywords: ['pho mai', 'mieng pho mai', 'cheese'] },
  { id: 'fluent-food-eggplant', name: 'Quả cà tím', category: 'objects', url: '/assets/fluent/food-eggplant.svg', keywords: ['ca tim', 'qua ca tim', 'eggplant', 'aubergine'] },
  { id: 'fluent-food-pizza', name: 'Bánh pizza', category: 'objects', url: '/assets/fluent/food-pizza.svg', keywords: ['pizza', 'banh pizza'] },
  { id: 'fluent-food-mooncake', name: 'Bánh trung thu', category: 'objects', url: '/assets/fluent/food-mooncake.svg', keywords: ['banh trung thu', 'mooncake', 'moon cake'] },
  { id: 'fluent-food-pancakes', name: 'Bánh kếp', category: 'objects', url: '/assets/fluent/food-pancakes.svg', keywords: ['banh kep', 'pancake', 'pancakes', 'bua sang', 'an sang', 'breakfast'] },
  { id: 'custom-food-banh-chung', name: 'Bánh chưng', category: 'objects', url: '/assets/custom/food-banh-chung.svg', keywords: ['banh chung', 'chung cake'] },
  { id: 'custom-food-banh-ran', name: 'Bánh rán', category: 'objects', url: '/assets/custom/food-banh-ran.svg', keywords: ['banh ran', 'dorayaki'] },
  { id: 'custom-food-rau-muong', name: 'Rau muống', category: 'objects', url: '/assets/custom/food-rau-muong.svg', keywords: ['rau muong', 'water spinach'] },
  { id: 'custom-food-mam-ngu-qua', name: 'Mâm ngũ quả', category: 'objects', url: '/assets/custom/food-mam-ngu-qua.svg', keywords: ['mam ngu qua', 'five fruit tray'] },
  { id: 'fluent-object-motorcycle', name: 'Xe máy', category: 'objects', url: '/assets/fluent/object-motorcycle.svg', keywords: ['xe may', 'motorbike', 'motorcycle'] },
  { id: 'fluent-object-train', name: 'Tàu hỏa', category: 'objects', url: '/assets/fluent/object-train.svg', keywords: ['tau hoa', 'xe lua', 'train', 'locomotive'] },
  { id: 'fluent-object-race-car', name: 'Xe đua', category: 'objects', url: '/assets/fluent/object-race-car.svg', keywords: ['xe dua', 'xe o to dua', 'race car', 'racing car'] },
  { id: 'fluent-object-tricycle', name: 'Xe ba bánh', category: 'objects', url: '/assets/fluent/object-tricycle.svg', keywords: ['xe ba gac', 'xe ba banh', 'xe lam', 'xich lo', 'auto rickshaw', 'tuk tuk'] },
  { id: 'fluent-object-drum', name: 'Cái trống', category: 'objects', url: '/assets/fluent/object-drum.svg', keywords: ['cai trong', 'drum'], exactKeywords: ['trống'] },
  { id: 'fluent-object-scale', name: 'Cái cân', category: 'objects', url: '/assets/fluent/object-scale.svg', keywords: ['cai can', 'can dia', 'can thang bang', 'balance scale'], exactKeywords: ['cân'] },
  { id: 'fluent-object-keyboard', name: 'Bàn phím', category: 'objects', url: '/assets/fluent/object-keyboard.svg', keywords: ['ban phim', 'keyboard'] },
  { id: 'fluent-object-computer', name: 'Màn hình máy tính', category: 'objects', url: '/assets/fluent/object-computer.svg', keywords: ['man hinh', 'may tinh', 'man hinh may tinh', 'computer', 'monitor'] },
  { id: 'fluent-object-speaker', name: 'Cái loa', category: 'objects', url: '/assets/fluent/object-speaker.svg', keywords: ['cai loa', 'loa', 'speaker', 'loudspeaker'] },
  { id: 'fluent-object-music-note', name: 'Nốt nhạc', category: 'objects', url: '/assets/fluent/object-music-note.svg', keywords: ['not nhac', 'music note', 'musical note'] },
  { id: 'fluent-object-brick', name: 'Viên gạch', category: 'objects', url: '/assets/fluent/object-brick.svg', keywords: ['khoi go', 'khoi xep hinh', 'vien gach', 'brick', 'block'] },
  { id: 'fluent-object-bed', name: 'Cái giường', category: 'objects', url: '/assets/fluent/object-bed.svg', keywords: ['cai giuong', 'giuong', 'bed'] },
  { id: 'fluent-object-alarm-clock', name: 'Đồng hồ báo thức', category: 'objects', url: '/assets/fluent/object-alarm-clock.svg', keywords: ['dong ho bao thuc', 'bao thuc', 'alarm clock', 'thuc day', 'wake up', 'get up'] },
  { id: 'fluent-object-toothbrush', name: 'Bàn chải đánh răng', category: 'objects', url: '/assets/fluent/object-toothbrush.svg', keywords: ['ban chai danh rang', 'ban chai', 'toothbrush', 'brush teeth', 'danh rang'] },
  { id: 'fluent-weather-rain', name: 'Mây mưa', category: 'objects', url: '/assets/fluent/weather-rain.svg', keywords: ['may mua', 'troi mua', 'rain', 'rainy', 'cloud with rain'] },
  { id: 'fluent-weather-ice', name: 'Nước đá', category: 'objects', url: '/assets/fluent/weather-ice.svg', keywords: ['nuoc da', 'vien da', 'ice', 'ice cube'] },
  { id: 'fluent-plant-rice', name: 'Bó lúa', category: 'objects', url: '/assets/fluent/plant-rice.svg', keywords: ['bo lua', 'cay lua', 'lua gao', 'rice plant'] },
  { id: 'fluent-plant-peach-blossom', name: 'Hoa đào', category: 'objects', url: '/assets/fluent/plant-peach-blossom.svg', keywords: ['hoa dao', 'hoa anh dao', 'cherry blossom'] },
  { id: 'fluent-object-earth', name: 'Trái Đất', category: 'objects', url: '/assets/fluent/object-earth.svg', keywords: ['trai dat', 'qua dia cau', 'dia cau', 'earth', 'globe'] },
  { id: 'fluent-people-astronaut', name: 'Phi hành gia', category: 'objects', url: '/assets/fluent/people-astronaut.svg', keywords: ['phi hanh gia', 'astronaut'] },
  { id: 'fluent-people-doctor', name: 'Bác sĩ', category: 'objects', url: '/assets/fluent/people-doctor.svg', keywords: ['bac si', 'doctor'] },
  { id: 'fluent-people-farmer', name: 'Bác nông dân', category: 'objects', url: '/assets/fluent/people-farmer.svg', keywords: ['nong dan', 'bac nong dan', 'farmer'] },
  { id: 'fluent-people-firefighter', name: 'Lính cứu hỏa', category: 'objects', url: '/assets/fluent/people-firefighter.svg', keywords: ['linh cuu hoa', 'chu linh cuu hoa', 'firefighter'] },
  { id: 'fluent-people-teacher', name: 'Cô giáo', category: 'objects', url: '/assets/fluent/people-teacher.svg', keywords: ['co giao', 'thay giao', 'teacher'] },
  { id: 'fluent-clothes-coat', name: 'Áo ấm', category: 'objects', url: '/assets/fluent/clothes-coat.svg', keywords: ['ao am', 'ao khoac', 'coat', 'jacket'] },
  { id: 'fluent-clothes-gloves', name: 'Găng tay', category: 'objects', url: '/assets/fluent/clothes-gloves.svg', keywords: ['gang tay', 'gloves'] },
  { id: 'custom-clothes-beanie', name: 'Mũ len', category: 'objects', url: '/assets/custom/clothes-beanie.svg', keywords: ['mu len', 'non len', 'beanie', 'knit hat'] },
  { id: 'custom-body-head', name: 'Cái đầu', category: 'objects', url: '/assets/custom/body-head.svg', keywords: ['cai dau', 'dau nguoi', 'head'], exactKeywords: ['đầu'] },
  { id: 'custom-body-shoulder', name: 'Đôi vai', category: 'objects', url: '/assets/custom/body-shoulder.svg', keywords: ['doi vai', 'bo vai', 'shoulder', 'shoulders'], exactKeywords: ['vai'] },
  { id: 'custom-body-knee', name: 'Đầu gối', category: 'objects', url: '/assets/custom/body-knee.svg', keywords: ['dau goi', 'knee', 'knees'] },
  { id: 'custom-body-toe', name: 'Ngón chân', category: 'objects', url: '/assets/custom/body-toe.svg', keywords: ['ngon chan', 'toe', 'toes'] },
  { id: 'kenney-animal-elephant', name: 'Con voi', category: 'animals', url: '/assets/kenney/animals/elephant.png', keywords: [], matchKeywords: ['con voi', 'elephant'] },
  { id: 'kenney-animal-giraffe', name: 'Hươu cao cổ', category: 'animals', url: '/assets/kenney/animals/giraffe.png', keywords: [], matchKeywords: ['huou cao co', 'con huou cao co', 'giraffe'] },
  { id: 'kenney-animal-monkey', name: 'Con khỉ', category: 'animals', url: '/assets/kenney/animals/monkey.png', keywords: [], matchKeywords: ['con khi', 'monkey'] },
  { id: 'kenney-animal-cow', name: 'Con bò', category: 'animals', url: '/assets/kenney/animals/cow.png', keywords: [], matchKeywords: ['con bo', 'cow'] },
  { id: 'kenney-animal-chicken', name: 'Con gà', category: 'animals', url: '/assets/kenney/animals/chicken.png', keywords: [], matchKeywords: ['con ga', 'chicken'] },
  { id: 'kenney-animal-pig', name: 'Con lợn', category: 'animals', url: '/assets/kenney/animals/pig.png', keywords: [], matchKeywords: ['con heo', 'con lon', 'pig'] },
  // Bổ sung từ gói Animal Pack còn lại (đo nhu cầu 2026-11-13). Như 6 con trên: keywords rỗng để frontend không tranh từ với mục chủ đề, chỉ đường backend dùng matchKeywords.
  { id: 'kenney-animal-chick', name: 'Gà con', category: 'animals', url: '/assets/kenney/animals/chick.png', keywords: [], matchKeywords: ['con ga con', 'ga con', 'chick'] },
  { id: 'kenney-animal-crocodile', name: 'Cá sấu', category: 'animals', url: '/assets/kenney/animals/crocodile.png', keywords: [], matchKeywords: ['ca sau', 'con ca sau', 'crocodile', 'alligator'] },
  { id: 'kenney-animal-gorilla', name: 'Khỉ đột', category: 'animals', url: '/assets/kenney/animals/gorilla.png', keywords: [], matchKeywords: ['khi dot', 'con khi dot', 'gorilla'] },
  { id: 'kenney-animal-hippo', name: 'Hà mã', category: 'animals', url: '/assets/kenney/animals/hippo.png', keywords: [], matchKeywords: ['ha ma', 'con ha ma', 'hippo', 'hippopotamus'] },
  { id: 'kenney-animal-moose', name: 'Nai sừng tấm', category: 'animals', url: '/assets/kenney/animals/moose.png', keywords: [], matchKeywords: ['nai sung tam', 'con nai sung tam', 'moose'] },
  { id: 'kenney-animal-narwhal', name: 'Kỳ lân biển', category: 'animals', url: '/assets/kenney/animals/narwhal.png', keywords: [], matchKeywords: ['ky lan bien', 'narwhal'] },
  { id: 'kenney-animal-parrot', name: 'Con vẹt', category: 'animals', url: '/assets/kenney/animals/parrot.png', keywords: [], matchKeywords: ['con vet', 'parrot'], exactKeywords: ['vẹt'] },
  { id: 'kenney-animal-rhino', name: 'Tê giác', category: 'animals', url: '/assets/kenney/animals/rhino.png', keywords: [], matchKeywords: ['te giac', 'con te giac', 'rhino', 'rhinoceros'] },
  { id: 'kenney-animal-sloth', name: 'Con lười', category: 'animals', url: '/assets/kenney/animals/sloth.png', keywords: [], matchKeywords: ['con luoi', 'sloth'], exactKeywords: ['con lười'] },
  { id: 'kenney-animal-walrus', name: 'Hải mã', category: 'animals', url: '/assets/kenney/animals/walrus.png', keywords: [], matchKeywords: ['hai ma', 'con hai ma', 'walrus'] },
  { id: 'kenney-animal-whale', name: 'Cá voi', category: 'animals', url: '/assets/kenney/animals/whale.png', keywords: [], matchKeywords: ['ca voi', 'con ca voi', 'whale'] },
  { id: 'kenney-flag-vn', name: 'Cờ Việt Nam', category: 'objects', url: '/assets/kenney/flags/vn.png', keywords: ['co viet nam', 'quoc ky viet nam', 'vietnam flag', 'flag of vietnam'], matchKeywords: ['co do sao vang'] },
  { id: 'kenney-flag-th', name: 'Cờ Thái Lan', category: 'objects', url: '/assets/kenney/flags/th.png', keywords: ['co thai lan', 'thailand flag', 'flag of thailand'] },
  { id: 'kenney-planet-mercury', name: 'Sao Thủy', category: 'objects', url: '/assets/kenney/planets/mercury.png', keywords: ['sao thuy', 'mercury'] },
  { id: 'kenney-planet-venus', name: 'Sao Kim', category: 'objects', url: '/assets/kenney/planets/venus.png', keywords: ['sao kim', 'venus'] },
  { id: 'kenney-planet-mars', name: 'Sao Hỏa', category: 'objects', url: '/assets/kenney/planets/mars.png', keywords: ['sao hoa', 'mars'] },
  // Bổ sung sau thử nghiệm lần 4: hình còn thiếu cho game vần (bàn, khăn, đàn). Không dùng 'ban', 'dan' trơ trọi (lẫn "bạn", "dân").
  { id: 'custom-object-table', name: 'Cái bàn', category: 'objects', url: '/assets/custom/object-table.svg', keywords: ['cai ban', 'chiec ban', 'table', 'desk'], exactKeywords: ['bàn'] },
  { id: 'fluent-clothes-scarf', name: 'Cái khăn', category: 'objects', url: '/assets/fluent/clothes-scarf.svg', keywords: ['cai khan', 'khan quang', 'khan len', 'scarf'], exactKeywords: ['khăn'] },
  // Bổ sung sau thử nghiệm lần 7: AI chọn hình gần nghĩa (gián ra rắn, cần câu ra cây cung) vì kho thiếu hình đúng.
  { id: 'fluent-animal-cockroach', name: 'Con gián', category: 'animals', url: '/assets/fluent/animal-cockroach.svg', keywords: ['con gian', 'cockroach'], exactKeywords: ['gián'] },
  { id: 'fluent-object-fishing-pole', name: 'Cần câu', category: 'objects', url: '/assets/fluent/object-fishing-pole.svg', keywords: ['can cau', 'fishing rod', 'fishing pole'], exactKeywords: ['cần câu'] },
  { id: 'fluent-object-ring', name: 'Chiếc nhẫn', category: 'objects', url: '/assets/fluent/object-ring.svg', keywords: ['chiec nhan', 'nhan cuoi', 'ring'], exactKeywords: ['nhẫn'] },
  { id: 'fluent-object-truck', name: 'Xe tải', category: 'objects', url: '/assets/fluent/object-truck.svg', keywords: ['xe tai', 'truck', 'lorry'] },
  { id: 'fluent-object-dice', name: 'Xúc xắc', category: 'objects', url: '/assets/fluent/object-dice.svg', keywords: ['xuc xac', 'dice'] },
  { id: 'fluent-people-police', name: 'Chú công an', category: 'objects', url: '/assets/fluent/people-police.svg', keywords: ['cong an', 'chu cong an', 'canh sat', 'police', 'policeman'] },
  { id: 'custom-plant-orchid', name: 'Hoa lan', category: 'objects', url: '/assets/custom/plant-orchid.svg', keywords: ['hoa lan', 'orchid'], exactKeywords: ['lan'] },
  { id: 'fluent-object-guitar', name: 'Đàn ghi-ta', category: 'objects', url: '/assets/fluent/object-guitar.svg', keywords: ['dan ghi ta', 'cay dan', 'dan guitar', 'guitar'], exactKeywords: ['đàn'] },
  // Bổ sung từ Fluent Flat tải thêm 2026-11-13 (đo nhu cầu theo kịch bản và chuẩn mầm non). keywords rỗng: chỉ backend khớp (matchKeywords, exactKeywords),
  // như các con vật Kenney, để bộ khớp frontend không đổi. Nhãn nhóm gia đình có ngoặc để không thành từ khóa trơ trọi ("ông" bỏ dấu thành "ong").
  { id: 'fluent-animal-dolphin', name: 'Cá heo', category: 'animals', url: '/assets/fluent/animal-dolphin.svg', keywords: [], matchKeywords: ['ca heo', 'con ca heo', 'dolphin'] },
  { id: 'fluent-animal-shark', name: 'Cá mập', category: 'animals', url: '/assets/fluent/animal-shark.svg', keywords: [], matchKeywords: ['ca map', 'con ca map', 'shark'] },
  { id: 'fluent-animal-turtle', name: 'Con rùa', category: 'animals', url: '/assets/fluent/animal-turtle.svg', keywords: [], matchKeywords: ['con rua', 'turtle', 'tortoise'], exactKeywords: ['rùa'] },
  { id: 'fluent-animal-shrimp', name: 'Con tôm', category: 'animals', url: '/assets/fluent/animal-shrimp.svg', keywords: [], matchKeywords: ['con tom', 'shrimp', 'prawn'], exactKeywords: ['tôm'] },
  { id: 'fluent-animal-octopus', name: 'Bạch tuộc', category: 'animals', url: '/assets/fluent/animal-octopus.svg', keywords: [], matchKeywords: ['bach tuoc', 'con bach tuoc', 'octopus'] },
  { id: 'fluent-animal-tiger', name: 'Con hổ', category: 'animals', url: '/assets/fluent/animal-tiger.svg', keywords: [], matchKeywords: ['con ho', 'tiger'], exactKeywords: ['hổ', 'cọp'] },
  { id: 'fluent-animal-sheep', name: 'Con cừu', category: 'animals', url: '/assets/fluent/animal-sheep.svg', keywords: [], matchKeywords: ['con cuu', 'sheep', 'ewe'], exactKeywords: ['cừu'] },
  { id: 'fluent-people-father', name: 'Bố (cha)', category: 'objects', url: '/assets/fluent/people-father.svg', keywords: [], matchKeywords: ['nguoi cha', 'father', 'dad', 'daddy'], exactKeywords: ['bố', 'cha'] },
  { id: 'fluent-people-mother', name: 'Mẹ (má)', category: 'objects', url: '/assets/fluent/people-mother.svg', keywords: [], matchKeywords: ['nguoi me', 'mother', 'mom', 'mommy'], exactKeywords: ['mẹ', 'má'] },
  { id: 'fluent-people-grandfather', name: 'Ông (ông nội, ông ngoại)', category: 'objects', url: '/assets/fluent/people-grandfather.svg', keywords: [], matchKeywords: ['grandfather', 'grandpa'], exactKeywords: ['ông', 'ông nội', 'ông ngoại'] },
  { id: 'fluent-people-grandmother', name: 'Bà (bà nội, bà ngoại)', category: 'objects', url: '/assets/fluent/people-grandmother.svg', keywords: [], matchKeywords: ['grandmother', 'grandma'], exactKeywords: ['bà', 'bà nội', 'bà ngoại'] },
  { id: 'fluent-people-baby', name: 'Em bé', category: 'objects', url: '/assets/fluent/people-baby.svg', keywords: [], matchKeywords: ['em be', 'be so sinh', 'baby'] },
  { id: 'fluent-people-boy', name: 'Bé trai', category: 'objects', url: '/assets/fluent/people-boy.svg', keywords: [], matchKeywords: ['be trai', 'cau be', 'boy'] },
  { id: 'fluent-people-girl', name: 'Bé gái', category: 'objects', url: '/assets/fluent/people-girl.svg', keywords: [], matchKeywords: ['be gai', 'girl'], exactKeywords: ['cô bé'] },
  { id: 'fluent-people-cook', name: 'Đầu bếp', category: 'objects', url: '/assets/fluent/people-cook.svg', keywords: [], matchKeywords: ['dau bep', 'cook', 'chef'] },
  { id: 'fluent-people-builder', name: 'Thợ xây', category: 'objects', url: '/assets/fluent/people-builder.svg', keywords: [], matchKeywords: ['tho xay', 'cong nhan xay dung', 'construction worker', 'builder'] },
  { id: 'fluent-people-running', name: 'Bạn đang chạy', category: 'objects', url: '/assets/fluent/people-running.svg', keywords: [], matchKeywords: ['running', 'runner'], exactKeywords: ['chạy bộ'] },
  { id: 'fluent-people-clapping', name: 'Vỗ tay', category: 'objects', url: '/assets/fluent/people-clapping.svg', keywords: [], matchKeywords: ['vo tay', 'clapping', 'clap'] },
  { id: 'fluent-people-exercise', name: 'Tập thể dục', category: 'objects', url: '/assets/fluent/people-exercise.svg', keywords: [], matchKeywords: ['exercise', 'workout'], exactKeywords: ['thể dục', 'tập thể dục'] },
  { id: 'fluent-body-tongue', name: 'Cái lưỡi', category: 'objects', url: '/assets/fluent/body-tongue.svg', keywords: [], matchKeywords: ['cai luoi', 'tongue'], exactKeywords: ['lưỡi'] },
  { id: 'fluent-clothes-shoes', name: 'Đôi giày', category: 'objects', url: '/assets/fluent/clothes-shoes.svg', keywords: [], matchKeywords: ['doi giay', 'giay the thao', 'shoe', 'shoes', 'sneaker'] },
  { id: 'fluent-clothes-tshirt', name: 'Áo thun', category: 'objects', url: '/assets/fluent/clothes-tshirt.svg', keywords: [], matchKeywords: ['ao thun', 'ao phong', 't shirt', 'tshirt'] },
  { id: 'fluent-clothes-jeans', name: 'Quần dài', category: 'objects', url: '/assets/fluent/clothes-jeans.svg', keywords: [], matchKeywords: ['quan dai', 'quan jean', 'jeans', 'trousers', 'pants'] },
  { id: 'fluent-clothes-dress', name: 'Cái váy', category: 'objects', url: '/assets/fluent/clothes-dress.svg', keywords: [], matchKeywords: ['cai vay', 'chiec vay', 'dress', 'skirt'], exactKeywords: ['váy', 'đầm'] },
  { id: 'fluent-clothes-socks', name: 'Đôi tất', category: 'objects', url: '/assets/fluent/clothes-socks.svg', keywords: [], matchKeywords: ['doi tat', 'doi vo', 'socks', 'sock'] },
  { id: 'fluent-object-ambulance', name: 'Xe cứu thương', category: 'objects', url: '/assets/fluent/object-ambulance.svg', keywords: [], matchKeywords: ['xe cuu thuong', 'ambulance'] },
  { id: 'fluent-object-helicopter', name: 'Trực thăng', category: 'objects', url: '/assets/fluent/object-helicopter.svg', keywords: [], matchKeywords: ['truc thang', 'may bay truc thang', 'helicopter'] },
  { id: 'fluent-object-fire-engine', name: 'Xe cứu hỏa', category: 'objects', url: '/assets/fluent/object-fire-engine.svg', keywords: [], matchKeywords: ['xe cuu hoa', 'xe chua chay', 'fire engine', 'fire truck'] },
  { id: 'fluent-object-ship', name: 'Tàu thủy', category: 'objects', url: '/assets/fluent/object-ship.svg', keywords: [], matchKeywords: ['tau thuy', 'tau bien', 'ship'] },
  { id: 'fluent-object-tractor', name: 'Máy kéo', category: 'objects', url: '/assets/fluent/object-tractor.svg', keywords: [], matchKeywords: ['may keo', 'xe may keo', 'tractor'] },
  { id: 'fluent-weather-snowflake', name: 'Bông tuyết', category: 'objects', url: '/assets/fluent/weather-snowflake.svg', keywords: [], matchKeywords: ['bong tuyet', 'snowflake', 'snow'], exactKeywords: ['tuyết'] },
  { id: 'fluent-weather-lightning', name: 'Sấm chớp', category: 'objects', url: '/assets/fluent/weather-lightning.svg', keywords: [], matchKeywords: ['sam chop', 'set danh', 'lightning', 'thunder'] },
  { id: 'fluent-weather-rainbow', name: 'Cầu vồng', category: 'objects', url: '/assets/fluent/weather-rainbow.svg', keywords: [], matchKeywords: ['cau vong', 'rainbow'] },
  { id: 'fluent-weather-moon', name: 'Mặt trăng', category: 'objects', url: '/assets/fluent/weather-moon.svg', keywords: [], matchKeywords: ['mat trang', 'moon', 'crescent moon'] },
  { id: 'fluent-weather-droplet', name: 'Giọt nước', category: 'objects', url: '/assets/fluent/weather-droplet.svg', keywords: [], matchKeywords: ['giot nuoc', 'giot mua', 'water drop', 'droplet'] },
  { id: 'fluent-weather-wind', name: 'Gió thổi', category: 'objects', url: '/assets/fluent/weather-wind.svg', keywords: [], matchKeywords: ['troi gio', 'wind', 'windy'], exactKeywords: ['gió'] },
  { id: 'fluent-weather-snowman', name: 'Người tuyết', category: 'objects', url: '/assets/fluent/weather-snowman.svg', keywords: [], matchKeywords: ['nguoi tuyet', 'snowman'] },
  { id: 'fluent-plant-fallen-leaf', name: 'Chiếc lá rụng', category: 'objects', url: '/assets/fluent/plant-fallen-leaf.svg', keywords: [], matchKeywords: ['la rung', 'chiec la rung', 'fallen leaf', 'autumn leaf'] },
  { id: 'fluent-object-chair', name: 'Cái ghế', category: 'objects', url: '/assets/fluent/object-chair.svg', keywords: [], matchKeywords: ['cai ghe', 'chiec ghe', 'chair'], exactKeywords: ['ghế'] },
  { id: 'fluent-object-computer-mouse', name: 'Chuột máy tính', category: 'objects', url: '/assets/fluent/object-computer-mouse.svg', keywords: [], matchKeywords: ['chuot may tinh', 'computer mouse'] },
  { id: 'fluent-object-cup', name: 'Cốc nước', category: 'objects', url: '/assets/fluent/object-cup.svg', keywords: [], matchKeywords: ['coc nuoc', 'ly nuoc', 'cup', 'glass of water'], exactKeywords: ['cốc'] },
  { id: 'fluent-object-robot', name: 'Người máy', category: 'objects', url: '/assets/fluent/object-robot.svg', keywords: [], matchKeywords: ['robot', 'nguoi may'] },
  { id: 'fluent-plant-seedling', name: 'Cây non', category: 'objects', url: '/assets/fluent/plant-seedling.svg', keywords: [], matchKeywords: ['cay non', 'mam cay', 'seedling', 'sprout'] },
  { id: 'fluent-plant-potted', name: 'Chậu cây', category: 'objects', url: '/assets/fluent/plant-potted.svg', keywords: [], matchKeywords: ['chau cay', 'chau hoa', 'potted plant'] },
  { id: 'fluent-food-salt', name: 'Hũ muối', category: 'objects', url: '/assets/fluent/food-salt.svg', keywords: [], matchKeywords: ['hu muoi', 'salt'], exactKeywords: ['muối'] },
  { id: 'fluent-object-microphone', name: 'Micro', category: 'objects', url: '/assets/fluent/object-microphone.svg', keywords: [], matchKeywords: ['micro', 'cai micro', 'microphone', 'mic'] },
  { id: 'fluent-object-restroom', name: 'Nhà vệ sinh', category: 'objects', url: '/assets/fluent/object-restroom.svg', keywords: [], matchKeywords: ['nha ve sinh', 'toilet', 'restroom', 'wc'] },
  { id: 'fluent-object-no-smoking', name: 'Biển cấm hút thuốc', category: 'objects', url: '/assets/fluent/object-no-smoking.svg', keywords: [], matchKeywords: ['cam hut thuoc', 'no smoking'], exactKeywords: ['cấm lửa'] },
  { id: 'fluent-object-warning', name: 'Biển cảnh báo nguy hiểm', category: 'objects', url: '/assets/fluent/object-warning.svg', keywords: [], matchKeywords: ['canh bao', 'nguy hiem', 'noi nguy hiem', 'warning'] },
  { id: 'fluent-object-school', name: 'Trường học', category: 'objects', url: '/assets/fluent/object-school.svg', keywords: [], matchKeywords: ['truong hoc', 'nha truong', 'school'] },
  { id: 'fluent-object-supermarket', name: 'Siêu thị', category: 'objects', url: '/assets/fluent/object-supermarket.svg', keywords: [], matchKeywords: ['sieu thi', 'cua hang tap hoa', 'convenience store', 'supermarket'] },
  { id: 'fluent-object-park', name: 'Công viên', category: 'objects', url: '/assets/fluent/object-park.svg', keywords: [], matchKeywords: ['cong vien', 'vuon quoc gia', 'national park', 'park'] },
  // Hình tự vẽ bổ sung 2026-11-13 (đo nhu cầu: không nguồn quốc tế nào có món, rau, địa danh, đồ Trung thu Việt). Cùng cách với các mục trên: keywords rỗng, chỉ backend khớp.
  // Từ trùng âm khi bỏ dấu dùng từ khóa có dấu: "ao" khác "áo", "chợ" khác "chờ", "quả cân" khác "quá cần".
  { id: 'custom-food-rau-mong-toi', name: 'Rau mồng tơi', category: 'objects', url: '/assets/custom/food-rau-mong-toi.svg', keywords: [], matchKeywords: ['rau mong toi', 'mong toi', 'malabar spinach'] },
  { id: 'custom-food-rau-den', name: 'Rau dền', category: 'objects', url: '/assets/custom/food-rau-den.svg', keywords: [], matchKeywords: ['rau den', 'amaranth'] },
  { id: 'custom-food-mam-co-trung-thu', name: 'Mâm cỗ Trung thu', category: 'objects', url: '/assets/custom/food-mam-co-trung-thu.svg', keywords: [], matchKeywords: ['mam co trung thu', 'mid autumn feast'], exactKeywords: ['mâm cỗ'] },
  { id: 'custom-plant-bang', name: 'Cây bàng', category: 'objects', url: '/assets/custom/plant-bang.svg', keywords: [], matchKeywords: ['cay bang', 'la bang', 'banyan'], exactKeywords: ['bàng'] },
  { id: 'custom-object-watering-can', name: 'Bình tưới nước', category: 'objects', url: '/assets/custom/object-watering-can.svg', keywords: [], matchKeywords: ['binh tuoi nuoc', 'binh tuoi', 'watering can'] },
  { id: 'custom-object-weight', name: 'Quả cân (quả cân kg)', category: 'objects', url: '/assets/custom/object-weight.svg', keywords: [], matchKeywords: ['weight', 'kg weight'], exactKeywords: ['quả cân'] },
  { id: 'custom-object-den-ong-sao', name: 'Đèn ông sao', category: 'objects', url: '/assets/custom/object-den-ong-sao.svg', keywords: ['den ong sao'], matchKeywords: ['den sao', 'star lantern'] },
  { id: 'custom-object-mat-na', name: 'Mặt nạ Trung thu', category: 'objects', url: '/assets/custom/object-mat-na.svg', keywords: [], matchKeywords: ['mat na', 'mask'] },
  { id: 'custom-object-measuring-cup', name: 'Cốc đong', category: 'objects', url: '/assets/custom/object-measuring-cup.svg', keywords: [], matchKeywords: ['coc dong', 'binh dong', 'measuring cup'] },
  { id: 'custom-object-doll', name: 'Búp bê', category: 'objects', url: '/assets/custom/object-doll.svg', keywords: [], matchKeywords: ['bup be', 'doll'] },
  { id: 'custom-scene-ha-long', name: 'Vịnh Hạ Long', category: 'objects', url: '/assets/custom/scene-ha-long.svg', keywords: [], matchKeywords: ['vinh ha long', 'ha long', 'ha long bay'] },
  { id: 'custom-scene-chua-mot-cot', name: 'Chùa Một Cột', category: 'objects', url: '/assets/custom/scene-chua-mot-cot.svg', keywords: [], matchKeywords: ['chua mot cot', 'one pillar pagoda'] },
  { id: 'custom-object-exit-sign', name: 'Biển lối ra', category: 'objects', url: '/assets/custom/object-exit-sign.svg', keywords: [], matchKeywords: ['exit', 'exit sign', 'emergency exit'], exactKeywords: ['lối ra', 'lối thoát', 'lối ra vào'] },
  { id: 'custom-scene-cho-que', name: 'Chợ quê (chợ làng)', category: 'objects', url: '/assets/custom/scene-cho-que.svg', keywords: [], matchKeywords: ['village market', 'market'], exactKeywords: ['chợ quê', 'chợ phiên', 'chợ'] },
  { id: 'custom-scene-tiem-banh', name: 'Tiệm bánh', category: 'objects', url: '/assets/custom/scene-tiem-banh.svg', keywords: [], matchKeywords: ['tiem banh', 'cua hang banh', 'bakery', 'cake shop'] },
  { id: 'custom-scene-ao', name: 'Cái ao (ao làng)', category: 'objects', url: '/assets/custom/scene-ao.svg', keywords: [], matchKeywords: ['pond'], exactKeywords: ['ao', 'cái ao', 'ao làng', 'ao cá'] },
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
