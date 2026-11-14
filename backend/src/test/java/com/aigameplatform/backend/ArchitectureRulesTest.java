package com.aigameplatform.backend;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import com.aigameplatform.backend.entity.enums.GameType;
import jakarta.inject.Inject;
import jakarta.persistence.Entity;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

/**
 * Quy tắc phân tầng trong CLAUDE.md và .claude/rules/design-principles.md, chạy như unit test để vi phạm làm đỏ build
 * thay vì chờ agent review phát hiện. Chỉ quét code main (không quét test).
 */
@AnalyzeClasses(packages = "com.aigameplatform.backend", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureRulesTest {

    private static final String ROOT = "com.aigameplatform.backend";

    @ArchTest
    static final ArchRule controllersDoNotUseRepositories = noClasses()
            .that().resideInAPackage(ROOT + ".controller..")
            .should().dependOnClassesThat().resideInAPackage(ROOT + ".repository..")
            .because("controller chỉ điều phối, truy cập dữ liệu đi qua service");

    @ArchTest
    static final ArchRule repositoriesAndServicesDoNotUseControllers = noClasses()
            .that().resideInAnyPackage(ROOT + ".repository..", ROOT + ".service..")
            .should().dependOnClassesThat().resideInAPackage(ROOT + ".controller..");

    @ArchTest
    static final ArchRule entitiesStayIndependent = noClasses()
            .that().resideInAPackage(ROOT + ".entity..")
            .should().dependOnClassesThat()
            .resideInAnyPackage(ROOT + ".service..", ROOT + ".repository..", ROOT + ".controller..")
            .because("entity không chứa logic gọi service hay truy cập dữ liệu");

    // Chỉ chặn @Autowired/@Inject trên field; @Value trên field (ví dụ SecurityConfig.allowedOrigins) ngoài phạm vi rule này.
    @ArchTest
    static final ArchRule noFieldInjection = noFields()
            .should().beAnnotatedWith(Autowired.class)
            .orShould().beAnnotatedWith(Inject.class)
            .because("phụ thuộc inject qua constructor");

    // @Configuration được phép tạo bean bằng new trong method @Bean; code nghiệp vụ thì nhận qua constructor.
    @ArchTest
    static final ArchRule servicesAndRepositoriesAreInjectedNotConstructed = noClasses()
            .that().areNotAnnotatedWith(Configuration.class)
            // @Component kể cả dạng meta (@Service, @Repository, @RestController...); bean tạo bằng @Bean mà lớp không có
            // annotation thì không nhận ra được (shortcut: thêm annotation hoặc mở rộng rule nếu gặp).
            .should().callConstructorWhere(DescribedPredicate.describe("target is a Spring bean class or repository", call -> {
                JavaClass owner = call.getTarget().getOwner();
                if (owner.equals(call.getOriginOwner())) return false; // this(...) giữa các constructor cùng lớp
                return owner.isAnnotatedWith(Component.class) || owner.isMetaAnnotatedWith(Component.class)
                        || owner.getPackageName().startsWith(ROOT + ".repository");
            }))
            .because("phụ thuộc inject qua constructor để thay được bằng mock khi test");

    @ArchTest
    static final ArchRule unsupportedOperationOnlyInStrategySkeletons = noClasses()
            .that().resideOutsideOfPackage(ROOT + ".service.strategy..")
            .should().callConstructorWhere(DescribedPredicate.describe("target is UnsupportedOperationException",
                    call -> call.getTarget().getOwner().isEquivalentTo(UnsupportedOperationException.class)))
            .because("Liskov: chỉ khung TODO trong service/strategy được ném UnsupportedOperationException");

    @ArchTest
    static final ArchRule onlyLangChain4jForAi = noClasses()
            .should().dependOnClassesThat().resideInAPackage("org.springframework.ai..")
            .because("AI integration dùng LangChain4j duy nhất");

    // javac dịch `switch` trên enum thành $SwitchMap[e.ordinal()]; ArchUnit bỏ qua field tổng hợp nhưng thấy lệnh gọi
    // ordinal(). shortcut: không bắt chuỗi if/== theo gameType, cần review nếu thấy kiểu rẽ nhánh đó.
    @ArchTest
    static final ArchRule noSwitchOnGameType = noClasses()
            .should().callMethod(GameType.class, "ordinal")
            .because("rẽ nhánh theo gameType phải bằng đa hình (Strategy/handler), không switch");

    // PlayInteractionDetail chưa có lớp con nên chưa khai báo @Inheritance; quy tắc tổng quát bên dưới sẽ chặn ngay khi
    // lớp con đầu tiên xuất hiện mà gốc chưa đổi sang JOINED.
    @ArchTest
    static final ArchRule domainRootsUseJoinedInheritance = classes()
            .that().haveFullyQualifiedName(ROOT + ".entity.question.QuestionGame")
            .or().haveFullyQualifiedName(ROOT + ".entity.session.GameSession")
            .should(useJoinedInheritance());

    @ArchTest
    static final ArchRule everyEntityHierarchyUsesJoined = classes()
            .that().areAnnotatedWith(Entity.class)
            .and(areHierarchyRoots())
            .should(useJoinedInheritance())
            .because("kiến trúc đã chốt chỉ dùng JOINED, không SINGLE_TABLE hay TABLE_PER_CLASS");

    // Lớp trung gian (ví dụ TeacherSession) thừa hưởng chiến lược của gốc nên chỉ kiểm gốc của cây kế thừa.
    private static DescribedPredicate<JavaClass> areHierarchyRoots() {
        return DescribedPredicate.describe("are roots of an @Entity hierarchy",
                c -> c.getSubclasses().stream().anyMatch(sub -> sub.isAnnotatedWith(Entity.class))
                        && c.getRawSuperclass().map(sup -> !sup.isAnnotatedWith(Entity.class)).orElse(true));
    }

    private static ArchCondition<JavaClass> useJoinedInheritance() {
        return new ArchCondition<>("declare @Inheritance(strategy = JOINED)") {
            @Override
            public void check(JavaClass c, ConditionEvents events) {
                boolean joined = c.tryGetAnnotationOfType(Inheritance.class)
                        .map(a -> a.strategy() == InheritanceType.JOINED).orElse(false);
                events.add(new SimpleConditionEvent(c, joined,
                        c.getName() + (joined ? " dùng JOINED" : " không khai báo @Inheritance(JOINED)")));
            }
        };
    }
}
