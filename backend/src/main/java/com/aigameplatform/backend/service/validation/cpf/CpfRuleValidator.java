package com.aigameplatform.backend.service.validation.cpf;

import com.aigameplatform.backend.service.validation.AbstractGameValidator;
import com.aigameplatform.backend.service.validation.GameValidationContext;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.rule.QuizArithmeticAnswerVerifier;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import tools.jackson.databind.JsonNode;

/**
 * Layer 2 của CPF: luật không diễn tả được bằng JSON Schema (docs/cpf-game-v2.0.0.md mục 4.2). Chạy sau Layer 1 nên
 * mọi trường bắt buộc và kiểu dữ liệu đã đúng; ở đây chỉ kiểm quan hệ giữa các phần và khả năng chơi được.
 */
final class CpfRuleValidator extends AbstractGameValidator {

    static final int MAX_VISIBLE_ENTITIES = 15;
    static final String SUBJECT_REF = "$subject";

    private final CpfAssetCatalog assets;

    CpfRuleValidator(CpfAssetCatalog assets) {
        this.assets = assets;
    }

    @Override
    protected List<ValidationError> check(GameValidationContext context) {
        JsonNode game = context.getJson();
        List<ValidationError> errors = new ArrayList<>();
        blankTexts(game, "$", errors);

        Map<String, JsonNode> entities = entities(game, errors);
        checkRoundsAndAnswers(game, errors);
        checkAssets(game, errors);
        RuleFacts facts = checkRules(game, entities, errors);
        checkPlayability(game, facts, errors);
        checkBudget(game, entities, errors);
        return errors;
    }

    // ---- 1. chung ----

    private static void blankTexts(JsonNode node, String path, List<ValidationError> errors) {
        if (node.isString()) {
            if (node.asString().isBlank()) {
                errors.add(new ValidationError(path, "Nội dung không được để trống hoặc chỉ gồm khoảng trắng"));
            }
        } else if (node.isObject()) {
            node.properties().forEach(e -> blankTexts(e.getValue(), path + "." + e.getKey(), errors));
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) blankTexts(node.get(i), path + "[" + i + "]", errors);
        }
    }

    /** So trùng không phân biệt hoa thường và khoảng trắng thừa, giữ nguyên dấu tiếng Việt. */
    static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFC).trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    // ---- 2. vật ----

    private static Map<String, JsonNode> entities(JsonNode game, List<ValidationError> errors) {
        Map<String, JsonNode> byId = new LinkedHashMap<>();
        JsonNode list = game.path("entities");
        for (int i = 0; i < list.size(); i++) {
            String id = list.get(i).path("id").asString();
            if (byId.putIfAbsent(id, list.get(i)) != null) {
                errors.add(new ValidationError("$.entities[" + i + "].id", "Trùng id vật \"" + id + "\""));
            }
        }
        return byId;
    }

    private static boolean boundTo(JsonNode entity, String target) {
        return entity != null && target.equals(entity.path("bindTo").asString(""));
    }

    // ---- 3. màn chơi và đáp án ----

    private static void checkRoundsAndAnswers(JsonNode game, List<ValidationError> errors) {
        JsonNode rounds = game.path("content").path("rounds");
        JsonNode answers = game.path("answerKey").path("rounds");
        if (rounds.size() != answers.size()) {
            errors.add(new ValidationError("$.answerKey.rounds",
                    "answerKey phải có đúng " + rounds.size() + " phần tử, cùng thứ tự với content.rounds"));
        }
        boolean math = "MATH".equals(game.path("metadata").path("subject").asString());
        Set<String> roundIds = new HashSet<>();
        for (int i = 0; i < rounds.size(); i++) {
            JsonNode round = rounds.get(i);
            String path = "$.content.rounds[" + i + "]";
            if (!roundIds.add(round.path("id").asString())) {
                errors.add(new ValidationError(path + ".id", "Trùng id màn"));
            }
            Map<String, String> choices = idsAndLabels(round.path("choices"), path + ".choices", errors);
            Map<String, String> zones = idsAndLabels(round.path("zones"), path + ".zones", errors);
            if (i >= answers.size()) continue;

            JsonNode answer = answers.get(i);
            String answerPath = "$.answerKey.rounds[" + i + "]";
            if (!round.path("id").asString().equals(answer.path("roundId").asString())) {
                errors.add(new ValidationError(answerPath + ".roundId", "roundId phải là \"" + round.path("id").asString() + "\""));
            }
            String task = round.path("task").asString();
            if ("SORT".equals(task)) {
                checkPlacements(answer, answerPath, choices, zones, errors);
            } else {
                checkCorrectChoices(answer, answerPath, task, choices, errors);
                if (math && "PICK_ONE".equals(task) && answer.path("correctChoiceIds").size() == 1
                        && isComputeQuestion(round.path("prompt").asString(), choices.values())) {
                    String correct = choices.get(answer.path("correctChoiceIds").get(0).asString());
                    QuizArithmeticAnswerVerifier.check(round.path("prompt").asString(), List.copyOf(choices.values()),
                            correct, path + ".prompt", path + ".choices", answerPath + ".correctChoiceIds", errors);
                }
            }
        }
    }

    private static final java.util.regex.Pattern ASKS_RESULT = java.util.regex.Pattern.compile("=\\s*\\?\\s*$");
    private static final java.util.regex.Pattern WHOLE_NUMBER = java.util.regex.Pattern.compile("^\\s*-?\\d+\\s*$");

    /**
     * Chỉ tự tính lại khi câu hỏi kết quả một phép tính ("3 + 4 = ?") và mọi nhãn là số; câu đúng/sai, so sánh hay
     * đáp án kèm đơn vị ("7 quả") không kiểm được bằng máy nên bỏ qua thay vì chặn nhầm.
     */
    private static boolean isComputeQuestion(String prompt, java.util.Collection<String> labels) {
        return ASKS_RESULT.matcher(prompt).find() && labels.stream().allMatch(l -> WHOLE_NUMBER.matcher(l).matches());
    }

    /** id → nhãn; báo id trùng và nhãn trùng trong cùng danh sách. */
    private static Map<String, String> idsAndLabels(JsonNode list, String path, List<ValidationError> errors) {
        Map<String, String> byId = new LinkedHashMap<>();
        Set<String> labels = new HashSet<>();
        for (int i = 0; i < list.size(); i++) {
            String id = list.get(i).path("id").asString();
            String label = list.get(i).path("label").asString();
            if (byId.putIfAbsent(id, label) != null) {
                errors.add(new ValidationError(path + "[" + i + "].id", "Trùng id \"" + id + "\""));
            }
            if (!labels.add(normalize(label))) {
                errors.add(new ValidationError(path + "[" + i + "].label", "Trùng nhãn \"" + label + "\" trong cùng màn"));
            }
        }
        return byId;
    }

    private static void checkCorrectChoices(JsonNode answer, String path, String task, Map<String, String> choices,
            List<ValidationError> errors) {
        JsonNode correct = answer.path("correctChoiceIds");
        if (correct.isMissingNode()) {
            errors.add(new ValidationError(path, "Màn " + task + " phải dùng correctChoiceIds"));
            return;
        }
        for (int i = 0; i < correct.size(); i++) {
            if (!choices.containsKey(correct.get(i).asString())) {
                errors.add(new ValidationError(path + ".correctChoiceIds[" + i + "]", "Không có lựa chọn này trong màn"));
            }
        }
        if ("PICK_ONE".equals(task) && correct.size() != 1) {
            errors.add(new ValidationError(path + ".correctChoiceIds", "Màn PICK_ONE phải có đúng 1 đáp án đúng"));
        }
        if ("PICK_ALL".equals(task) && correct.size() >= choices.size()) {
            errors.add(new ValidationError(path + ".correctChoiceIds",
                    "Màn PICK_ALL phải có ít đáp án đúng hơn số lựa chọn (cần có lựa chọn sai để trẻ phân biệt)"));
        }
    }

    private static void checkPlacements(JsonNode answer, String path, Map<String, String> choices, Map<String, String> zones,
            List<ValidationError> errors) {
        JsonNode placements = answer.path("placements");
        if (placements.isMissingNode()) {
            errors.add(new ValidationError(path, "Màn SORT phải dùng placements"));
            return;
        }
        Set<String> placed = new HashSet<>();
        for (int i = 0; i < placements.size(); i++) {
            String choiceId = placements.get(i).path("choiceId").asString();
            String zoneId = placements.get(i).path("zoneId").asString();
            String itemPath = path + ".placements[" + i + "]";
            if (!choices.containsKey(choiceId)) errors.add(new ValidationError(itemPath + ".choiceId", "Không có lựa chọn này trong màn"));
            if (!zones.containsKey(zoneId)) errors.add(new ValidationError(itemPath + ".zoneId", "Không có nhóm này trong màn"));
            if (!placed.add(choiceId)) errors.add(new ValidationError(itemPath + ".choiceId", "Mỗi lựa chọn chỉ thuộc một nhóm"));
        }
        if (!placed.containsAll(choices.keySet())) {
            errors.add(new ValidationError(path + ".placements", "Mọi lựa chọn của màn SORT phải có nhóm đúng"));
        }
    }

    // ---- 4. asset ----

    private void checkAssets(JsonNode game, List<ValidationError> errors) {
        JsonNode world = game.path("world");
        for (String key : List.of("backgroundId", "mascotId", "musicId")) {
            checkAsset(world.path(key), "$.world." + key, errors);
        }
        JsonNode list = game.path("entities");
        for (int i = 0; i < list.size(); i++) checkAsset(list.get(i).path("assetId"), "$.entities[" + i + "].assetId", errors);
        JsonNode rounds = game.path("content").path("rounds");
        for (int r = 0; r < rounds.size(); r++) {
            JsonNode choices = rounds.get(r).path("choices");
            for (int c = 0; c < choices.size(); c++) {
                checkAsset(choices.get(c).path("assetId"), "$.content.rounds[" + r + "].choices[" + c + "].assetId", errors);
            }
        }
    }

    private void checkAsset(JsonNode id, String path, List<ValidationError> errors) {
        if (!id.isMissingNode() && !assets.contains(id.asString())) {
            errors.add(new ValidationError(path, "assetId \"" + id.asString() + "\" không có trong danh mục asset"));
        }
    }

    // ---- 5. luật chơi ----

    /** Những gì đã thấy khi duyệt rules, dùng cho kiểm tra khả năng chơi được. */
    /**
     * Những gì đã thấy khi duyệt rules, dùng cho kiểm tra khả năng chơi được. {@code brokenTrigger}: có sự kiện đã bị
     * báo lỗi, khi đó không báo thêm lỗi dây chuyền "thiếu luật" (AI chỉ cần sửa lỗi gốc).
     */
    private record RuleFacts(boolean pickCheck, boolean sortCheck, Set<String> collideIds, boolean advance,
            boolean brokenTrigger) {
    }

    private static RuleFacts checkRules(JsonNode game, Map<String, JsonNode> entities, List<ValidationError> errors) {
        boolean pickCheck = false;
        boolean sortCheck = false;
        boolean advance = false;
        boolean brokenTrigger = false;
        Set<String> collideIds = new HashSet<>();
        JsonNode rules = game.path("rules");
        for (int i = 0; i < rules.size(); i++) {
            JsonNode on = rules.get(i).path("on");
            String path = "$.rules[" + i + "]";
            String type = on.path("type").asString();
            int errorsBefore = errors.size();
            boolean involvesChoices = switch (type) {
                case "TAP" -> checkTap(on, entities, path, errors);
                case "COLLIDE" -> checkCollide(on, entities, path, errors, collideIds);
                case "DROP" -> checkDrop(on, entities, path, errors);
                default -> false;
            };
            boolean triggerValid = errors.size() == errorsBefore;
            brokenTrigger |= !triggerValid;

            ActionFacts actions = new ActionFacts();
            JsonNode doList = rules.get(i).path("do");
            for (int a = 0; a < doList.size(); a++) {
                checkAction(doList.get(a), path + ".do[" + a + "]", entities, false, actions, errors);
            }
            if ((actions.check || actions.usesSubject) && !involvesChoices && triggerValid) {
                errors.add(new ValidationError(path,
                        "CHECK và $subject chỉ dùng được khi sự kiện gắn với vật bindTo: choices (không dùng với ROUND_START)"));
            }
            if (actions.check && involvesChoices) {
                if ("DROP".equals(type)) sortCheck = true; else pickCheck = true;
            }
            advance |= actions.advance;
        }
        return new RuleFacts(pickCheck, sortCheck, collideIds, advance, brokenTrigger);
    }

    private static boolean checkTap(JsonNode on, Map<String, JsonNode> entities, String path, List<ValidationError> errors) {
        JsonNode target = requireEntity(on.path("target").asString(), entities, path + ".on.target", errors);
        if (target != null && target.has("control")) {
            errors.add(new ValidationError(path + ".on.target", "Không dùng vật trẻ đang điều khiển làm đích chạm"));
        }
        return boundTo(target, "choices");
    }

    private static boolean checkCollide(JsonNode on, Map<String, JsonNode> entities, String path, List<ValidationError> errors,
            Set<String> collideIds) {
        String aId = on.path("a").asString();
        String bId = on.path("b").asString();
        JsonNode a = requireEntity(aId, entities, path + ".on.a", errors);
        JsonNode b = requireEntity(bId, entities, path + ".on.b", errors);
        collideIds.add(aId);
        collideIds.add(bId);
        if (a == null || b == null) return false;

        JsonNode controller = isMover(a) ? a : isMover(b) ? b : null;
        JsonNode other = controller == a ? b : a;
        if (controller == null || isMover(other) || !boundTo(other, "choices")) {
            errors.add(new ValidationError(path + ".on",
                    "COLLIDE cần đúng một vật trẻ điều khiển (DRAG_X hoặc AIM_SHOOT) và một vật bindTo: choices"));
            return false;
        }
        if ("DRAG_X".equals(controller.path("control").asString())) {
            String region = controller.path("placement").path("region").asString();
            String needed = switch (region) {
                case "BOTTOM" -> "FALL";
                case "TOP" -> "FLOAT_UP";
                default -> null;
            };
            if (needed == null) {
                errors.add(new ValidationError(path + ".on", "Vật DRAG_X chỉ đặt ở vùng TOP hoặc BOTTOM"));
            } else if (!needed.equals(other.path("motion").path("type").asString())) {
                errors.add(new ValidationError(path + ".on",
                        "Vật lựa chọn phải có motion " + needed + " để đi qua hàng của vật kéo ở vùng " + region));
            }
        }
        return true;
    }

    private static boolean isMover(JsonNode entity) {
        String control = entity.path("control").asString("");
        return control.equals("DRAG_X") || control.equals("AIM_SHOOT");
    }

    private static boolean checkDrop(JsonNode on, Map<String, JsonNode> entities, String path, List<ValidationError> errors) {
        JsonNode item = requireEntity(on.path("item").asString(), entities, path + ".on.item", errors);
        JsonNode zone = requireEntity(on.path("zone").asString(), entities, path + ".on.zone", errors);
        if (item != null && (!boundTo(item, "choices") || !"DRAG_FREE".equals(item.path("control").asString()))) {
            errors.add(new ValidationError(path + ".on.item", "Vật được thả phải là bindTo: choices và có control: DRAG_FREE"));
        }
        if (zone != null && !boundTo(zone, "zones")) {
            errors.add(new ValidationError(path + ".on.zone", "Nơi thả phải là vật bindTo: zones"));
        }
        return boundTo(item, "choices");
    }

    private static JsonNode requireEntity(String id, Map<String, JsonNode> entities, String path, List<ValidationError> errors) {
        JsonNode entity = entities.get(id);
        if (entity == null) errors.add(new ValidationError(path, "Không có vật \"" + id + "\" trong entities"));
        return entity;
    }

    private static final class ActionFacts {
        boolean check;
        boolean usesSubject;
        boolean advance;
    }

    private static void checkAction(JsonNode action, String path, Map<String, JsonNode> entities, boolean inCorrectBranch,
            ActionFacts facts, List<ValidationError> errors) {
        String type = action.path("type").asString();
        if ("CHECK".equals(type)) {
            facts.check = true;
            JsonNode onCorrect = action.path("onCorrect");
            for (int i = 0; i < onCorrect.size(); i++) {
                checkAction(onCorrect.get(i), path + ".onCorrect[" + i + "]", entities, true, facts, errors);
            }
            JsonNode onWrong = action.path("onWrong");
            for (int i = 0; i < onWrong.size(); i++) {
                checkAction(onWrong.get(i), path + ".onWrong[" + i + "]", entities, false, facts, errors);
            }
            return;
        }
        for (String key : List.of("subject", "at")) {
            JsonNode ref = action.path(key);
            if (ref.isMissingNode()) continue;
            if (SUBJECT_REF.equals(ref.asString())) facts.usesSubject = true;
            else requireEntity(ref.asString(), entities, path + "." + key, errors);
        }
        if (action.has("to")) requireEntity(action.path("to").asString(), entities, path + ".to", errors);

        if ("ADVANCE".equals(type)) {
            facts.advance = true;
            if (!inCorrectBranch) {
                errors.add(new ValidationError(path, "ADVANCE chỉ đặt trong onCorrect (mỗi màn tiến tối đa một nấc)"));
            }
            JsonNode subject = entities.get(action.path("subject").asString());
            if (subject == null || !"PROGRESS".equals(subject.path("role").asString())) {
                errors.add(new ValidationError(path + ".subject", "ADVANCE phải áp cho vật role: PROGRESS"));
            }
        }
    }

    private static void checkPlayability(JsonNode game, RuleFacts facts,
            List<ValidationError> errors) {
        Set<String> tasks = new HashSet<>();
        game.path("content").path("rounds").forEach(round -> tasks.add(round.path("task").asString()));
        if ((tasks.contains("PICK_ONE") || tasks.contains("PICK_ALL")) && !facts.pickCheck() && !facts.brokenTrigger()) {
            errors.add(new ValidationError("$.rules",
                    "Màn PICK_* cần một luật TAP hoặc COLLIDE gắn với vật bindTo: choices có CHECK"));
        }
        if (tasks.contains("SORT") && !facts.sortCheck() && !facts.brokenTrigger()) {
            errors.add(new ValidationError("$.rules", "Màn SORT cần một luật DROP có CHECK"));
        }

        boolean hasProgress = false;
        // Duyệt theo chỉ số thật trong JSON (map vật đã gộp id trùng) để vị trí lỗi gửi AI không lệch.
        JsonNode list = game.path("entities");
        for (int i = 0; i < list.size(); i++) {
            JsonNode entity = list.get(i);
            String path = "$.entities[" + i + "]";
            String id = entity.path("id").asString();
            if ("AIM_SHOOT".equals(entity.path("control").asString()) && !facts.collideIds().contains(id)) {
                errors.add(new ValidationError(path, "Vật AIM_SHOOT cần một luật COLLIDE dùng id của nó"));
            }
            if (entity.has("bindTo") && "SINGLE".equals(entity.path("placement").path("arrangement").asString())) {
                errors.add(new ValidationError(path + ".placement.arrangement",
                        "Vật bindTo có nhiều bản, không dùng arrangement SINGLE"));
            }
            if (boundTo(entity, "zones") && !tasks.contains("SORT")) {
                errors.add(new ValidationError(path + ".bindTo", "bindTo: zones chỉ dùng khi có màn SORT"));
            }
            hasProgress |= "PROGRESS".equals(entity.path("role").asString());
        }
        if (hasProgress) {
            if (!tasks.equals(Set.of("PICK_ONE"))) {
                errors.add(new ValidationError("$.content.rounds", "Game có vật PROGRESS thì mọi màn phải là PICK_ONE"));
            }
            if (!facts.advance()) {
                errors.add(new ValidationError("$.rules", "Game có vật PROGRESS cần ít nhất một ADVANCE"));
            }
        }
    }

    // ---- 6. ngân sách hiển thị ----

    private static void checkBudget(JsonNode game, Map<String, JsonNode> entities, List<ValidationError> errors) {
        int maxChoices = 0;
        int maxZones = 0;
        for (JsonNode round : game.path("content").path("rounds")) {
            maxChoices = Math.max(maxChoices, round.path("choices").size());
            maxZones = Math.max(maxZones, round.path("zones").size());
        }
        Map<String, Integer> perBinding = new HashMap<>(Map.of("choices", maxChoices, "zones", maxZones));
        int visible = 0;
        for (JsonNode entity : entities.values()) {
            visible += perBinding.getOrDefault(entity.path("bindTo").asString(""), 1);
        }
        if (visible > MAX_VISIBLE_ENTITIES) {
            errors.add(new ValidationError("$.entities",
                    "Quá nhiều vật cùng lúc (" + visible + " > " + MAX_VISIBLE_ENTITIES + ") cho máy tính bảng của trẻ"));
        }
    }
}
