package com.fixercity.reception;

import com.fixercity.registry.ModItems;
import java.util.List;
import java.util.function.Supplier;
import net.minecraft.world.BossEvent;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;

/**
 * 도서관의 층과 그 층을 지키는 사서 (보스).
 * 이름과 싸움 방식만 원작을 따르고, 수치와 기술 구성은 이 모드의 오리지널이다.
 *
 * @param grade      대응하는 해결사 등급 (보상·가격 기준)
 * @param bossCount  담당 사서 수 (자연과학의 층은 쌍둥이)
 * @param resistPage 내성으로 쓸 책장 id
 * @param weapons    들고 있는 무기 (여러 개면 기술마다 바꿔 든다)
 */
public enum LibraryFloor {
    HISTORY("history", 8, EntityType.VINDICATOR, 1, 120, 3, 1, "office_fixer",
            List.of(BossSkill.DASH, BossSkill.WHIRLWIND), () -> List.of(ModItems.FIXER_LONGSWORD.get()),
            Blocks.BROWN_CARPET, BossEvent.BossBarColor.YELLOW),
    TECHNOLOGY("technology", 7, EntityType.PILLAGER, 1, 140, 3, 1, "full_stop",
            List.of(BossSkill.VOLLEY, BossSkill.STARE), List::of,
            Blocks.CYAN_CARPET, BossEvent.BossBarColor.BLUE),
    LITERATURE("literature", 6, EntityType.VINDICATOR, 1, 170, 4, 2, "kurokumo",
            List.of(BossSkill.BLEED_FLURRY, BossSkill.HEAL), () -> List.of(ModItems.FIXER_DAGGER.get()),
            Blocks.ORANGE_CARPET, BossEvent.BossBarColor.YELLOW),
    ART("art", 5, EntityType.VINDICATOR, 1, 220, 4, 2, "zwei",
            List.of(BossSkill.GUARD, BossSkill.SLAM), () -> List.of(ModItems.FIXER_MACE.get()),
            Blocks.LIME_CARPET, BossEvent.BossBarColor.GREEN),
    NATURAL_SCIENCES("natural_sciences", 5, EntityType.EVOKER, 2, 140, 3, 0, "seven",
            List.of(BossSkill.FLAME_CONE, BossSkill.PULL), List::of,
            Blocks.YELLOW_CARPET, BossEvent.BossBarColor.YELLOW),
    SOCIAL_SCIENCES("social_sciences", 4, EntityType.VINDICATOR, 1, 280, 5, 2, "wedge",
            List.of(BossSkill.GUARD, BossSkill.HEAL, BossSkill.DASH), () -> List.of(ModItems.WEDGE_SPEAR.get()),
            Blocks.LIGHT_BLUE_CARPET, BossEvent.BossBarColor.BLUE),
    LANGUAGE("language", 3, EntityType.VINDICATOR, 1, 340, 6, 0, "liu",
            List.of(BossSkill.DASH, BossSkill.SLAM, BossSkill.WHIRLWIND), () -> List.of(ModItems.ZWEI_GREATSWORD.get()),
            Blocks.RED_CARPET, BossEvent.BossBarColor.RED),
    PHILOSOPHY("philosophy", 2, EntityType.EVOKER, 1, 380, 6, 0, "seven",
            List.of(BossSkill.PULL, BossSkill.STARE, BossSkill.SUMMON, BossSkill.TIME_SLOW), List::of,
            Blocks.GRAY_CARPET, BossEvent.BossBarColor.WHITE),
    RELIGION("religion", 2, EntityType.VINDICATOR, 1, 360, 6, 1, "shi",
            List.of(BossSkill.TIME_SLOW, BossSkill.BLEED_FLURRY, BossSkill.WHIRLWIND), () -> List.of(ModItems.KUROKUMO_BLADE.get()),
            Blocks.WHITE_CARPET, BossEvent.BossBarColor.WHITE),
    GENERAL_WORKS("general_works", 1, EntityType.WITHER_SKELETON, 1, 500, 8, 0, "thumb",
            List.of(BossSkill.DASH, BossSkill.SLAM, BossSkill.VOLLEY, BossSkill.WHIRLWIND, BossSkill.BLEED_FLURRY, BossSkill.PULL),
            () -> List.of(ModItems.SHI_BLADE.get(), ModItems.MOLAR_HAMMER.get(), ModItems.WORKSHOP_HALBERD.get(),
                    ModItems.KUROKUMO_BLADE.get(), ModItems.WEDGE_SPEAR.get(), ModItems.ZWEI_GREATSWORD.get()),
            Blocks.BLACK_CARPET, BossEvent.BossBarColor.PURPLE);

    private final String id;
    private final int grade;
    private final EntityType<? extends Mob> bossType;
    private final int bossCount;
    private final int health;
    private final int attack;
    private final int assistants;
    private final String resistPage;
    private final List<BossSkill> skills;
    private final Supplier<List<Item>> weapons;
    private final Block carpet;
    private final BossEvent.BossBarColor barColor;

    LibraryFloor(String id, int grade, EntityType<? extends Mob> bossType, int bossCount, int health, int attack, int assistants,
            String resistPage, List<BossSkill> skills, Supplier<List<Item>> weapons, Block carpet, BossEvent.BossBarColor barColor) {
        this.id = id;
        this.grade = grade;
        this.bossType = bossType;
        this.bossCount = bossCount;
        this.health = health;
        this.attack = attack;
        this.assistants = assistants;
        this.resistPage = resistPage;
        this.skills = skills;
        this.weapons = weapons;
        this.carpet = carpet;
        this.barColor = barColor;
    }

    public String id() { return id; }
    public int grade() { return grade; }
    public EntityType<? extends Mob> bossType() { return bossType; }
    public int bossCount() { return bossCount; }
    public int health() { return health; }
    public int attack() { return attack; }
    public int assistants() { return assistants; }
    public String resistPage() { return resistPage; }
    public List<BossSkill> skills() { return skills; }
    public List<Item> weapons() { return weapons.get(); }
    public Block carpet() { return carpet; }
    public BossEvent.BossBarColor barColor() { return barColor; }

    public String floorKey() { return "floor.fixercity." + id; }
    public String librarianKey() { return "librarian.fixercity." + id; }

    public static LibraryFloor byId(String id) {
        for (LibraryFloor f : values()) {
            if (f.id.equals(id)) {
                return f;
            }
        }
        return null;
    }
}
