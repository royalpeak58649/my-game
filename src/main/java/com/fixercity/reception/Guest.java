package com.fixercity.reception;

import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPages;
import java.util.Optional;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.neoforged.fml.ModList;

/**
 * 접대 손님: 도서관에 초대되는 L_Ender's Cataclysm의 보스.
 * 보스 자체(모델, AI, 기술, 드롭)는 Cataclysm의 것을 그대로 쓰고, 이 모드는 무대와 보상, 손님 책장을 붙인다.
 * Cataclysm이 설치돼 있지 않으면 접대를 열 수 없다 (이 모드의 다른 기능은 그대로).
 *
 * @param grade 권장 해결사 등급 (보상·초대장 가격 기준)
 * @param aquatic 물속에서 나타나는 손님 (무대 가운데 물웅덩이에 소환)
 */
public enum Guest {
    AMETHYST_CRAB("amethyst_crab", "amethyst_crab", 9, Stage.GEODE, KeyPages.AMETHYST_CRAB, false),
    KOBOLEDIATOR("kobolediator", "kobolediator", 8, Stage.RUINS, KeyPages.KOBOLEDIATOR, false),
    PROWLER("prowler", "the_prowler", 7, Stage.FACTORY, KeyPages.PROWLER, false),
    CORALSSUS("coralssus", "coralssus", 7, Stage.REEF, KeyPages.CORALSSUS, false),
    WADJET("wadjet", "wadjet", 6, Stage.RUINS, KeyPages.WADJET, false),
    ENDER_GOLEM("ender_golem", "ender_golem", 6, Stage.END, KeyPages.ENDER_GOLEM, false),
    APTRGANGR("aptrgangr", "aptrgangr", 5, Stage.CRYPT, KeyPages.APTRGANGR, false),
    NETHERITE_MONSTROSITY("netherite_monstrosity", "netherite_monstrosity", 4, Stage.FORGE, KeyPages.NETHERITE_MONSTROSITY, false),
    ANCIENT_REMNANT("ancient_remnant", "ancient_remnant", 4, Stage.RUINS, KeyPages.ANCIENT_REMNANT, false),
    ENDER_GUARDIAN("ender_guardian", "ender_guardian", 3, Stage.END, KeyPages.ENDER_GUARDIAN, false),
    MALEDICTUS("maledictus", "maledictus", 3, Stage.CRYPT, KeyPages.MALEDICTUS, false),
    LEVIATHAN("leviathan", "the_leviathan", 2, Stage.REEF, KeyPages.LEVIATHAN, true),
    SCYLLA("scylla", "scylla", 2, Stage.REEF, KeyPages.SCYLLA, false),
    IGNIS("ignis", "ignis", 2, Stage.FORGE, KeyPages.IGNIS, false),
    HARBINGER("harbinger", "the_harbinger", 1, Stage.FACTORY, KeyPages.HARBINGER, false);

    public static final String BOSS_MOD = "cataclysm";

    private final String id;
    private final ResourceLocation entity;
    private final int grade;
    private final Stage stage;
    private final KeyPage page;
    private final boolean aquatic;

    Guest(String id, String entity, int grade, Stage stage, KeyPage page, boolean aquatic) {
        this.id = id;
        this.entity = ResourceLocation.fromNamespaceAndPath(BOSS_MOD, entity);
        this.grade = grade;
        this.stage = stage;
        this.page = page;
        this.aquatic = aquatic;
    }

    public String id() { return id; }
    public ResourceLocation entityId() { return entity; }
    public int grade() { return grade; }
    public Stage stage() { return stage; }
    public KeyPage page() { return page; }
    public boolean aquatic() { return aquatic; }

    public String nameKey() { return "guest.fixercity." + id; }
    public String stageKey() { return "stage.fixercity." + stage.name().toLowerCase(java.util.Locale.ROOT); }

    /** 보스 모드가 깔려 있는지. */
    public static boolean bossModLoaded() {
        return ModList.get() != null && ModList.get().isLoaded(BOSS_MOD);
    }

    /** 이 손님의 엔티티 종류 (보스 모드가 없거나 그 보스가 없는 버전이면 비어 있다). */
    public Optional<EntityType<?>> entityType() {
        if (!bossModLoaded()) {
            return Optional.empty();
        }
        return BuiltInRegistries.ENTITY_TYPE.getOptional(entity);
    }

    public boolean available() {
        return entityType().isPresent();
    }

    public static Guest byId(String id) {
        for (Guest g : values()) {
            if (g.id.equals(id)) {
                return g;
            }
        }
        return null;
    }

    public static Guest byPage(KeyPage page) {
        for (Guest g : values()) {
            if (g.page == page) {
                return g;
            }
        }
        return null;
    }
}
