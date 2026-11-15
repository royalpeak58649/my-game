package com.fixercity.kit;

import com.fixercity.accessory.Accessory;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPages;
import com.fixercity.registry.ModItems;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.neoforged.neoforge.registries.DeferredItem;

/**
 * 시작 키트. 처음 접속하면 무작위로 5개를 보관함에 받는다 (가중치: 흔한 키트일수록 높다).
 * 원작 등급이 높은 조직의 키트일수록 드물다.
 */
public enum FixerKit {
    /** 검객: 장검 + 해결사 정장 + 사무소 해결사 책장. */
    SWORDSMAN("swordsman", 10, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.OFFICE_FIXER, null,
            new ItemStack(ModItems.FIXER_LONGSWORD.get()))),
    /** 중장: 철퇴 + 방탄 코트 + 사무소 해결사 책장. 앞에서 버티는 탱커. */
    BRAWLER("brawler", 10, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.OFFICE_FIXER, null,
            new ItemStack(ModItems.FIXER_MACE.get()))),
    /** 암살자: 단검 + 해결사 정장 + 사무소 해결사 책장 + 연막탄. */
    ASSASSIN("assassin", 10, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.OFFICE_FIXER, null,
            new ItemStack(ModItems.FIXER_DAGGER.get()), new ItemStack(ModItems.SMOKE_BOMB.get()))),
    /** 총잡이: 리볼버 + 탄환 12 + 보조 단검 + 해결사 정장 + 사무소 해결사 책장. */
    GUNNER("gunner", 10, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.OFFICE_FIXER, null,
            new ItemStack(ModItems.FIXER_REVOLVER.get()), new ItemStack(ModItems.FIXER_BULLET.get(), 12),
            new ItemStack(ModItems.FIXER_DAGGER.get()))),
    /** 뒷골목 출신: 쇠파이프 + 쥐 패거리 책장 + 행운의 동전 + 응급 키트 2. 갑옷은 없지만 잘 피한다. */
    BACKSTREET("backstreet", 10, () -> build(List.of(), KeyPages.RAT, Accessory.LUCKY_COIN,
            new ItemStack(ModItems.RUSTY_PIPE.get()), new ItemStack(ModItems.FIRST_AID_KIT.get(), 2),
            new ItemStack(ModItems.FLASHBANG.get()))),

    // ---- 원작 해결사 키트 (카나드 ~ 도시 질병) ----
    YUN("yun", 10, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.YUN, null,
            new ItemStack(ModItems.YUN_MACHETE.get()))),
    HOOK("hook", 10, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.HOOK, null,
            new ItemStack(ModItems.HOOK_BLADE.get()), new ItemStack(ModItems.FLASHBANG.get()))),
    STREETLIGHT("streetlight", 7, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.STREETLIGHT, null,
            new ItemStack(ModItems.STREETLIGHT_STAFF.get()), new ItemStack(ModItems.FIRST_AID_KIT.get()))),
    MOLAR("molar", 4, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.MOLAR, null,
            new ItemStack(ModItems.MOLAR_HAMMER.get()))),
    FULL_STOP("full_stop", 2, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.FULL_STOP, null,
            new ItemStack(ModItems.FULL_STOP_RIFLE.get()), new ItemStack(ModItems.FIXER_BULLET.get(), 8),
            new ItemStack(ModItems.FIXER_DAGGER.get()))),
    DAWN("dawn", 2, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.DAWN, null,
            new ItemStack(ModItems.DAWN_SWORD.get()), new ItemStack(ModItems.FIRST_AID_KIT.get()))),
    GAZE("gaze", 2, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.GAZE, null,
            new ItemStack(ModItems.GAZE_RAPIER.get()), new ItemStack(ModItems.SMOKE_BOMB.get()))),
    WEDGE("wedge", 2, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.WEDGE, null,
            new ItemStack(ModItems.WEDGE_SPEAR.get()))),
    WORKSHOP("workshop", 2, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.WORKSHOP, null,
            new ItemStack(ModItems.WORKSHOP_HALBERD.get()))),
    JEONG("jeong", 2, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.JEONG, null,
            new ItemStack(ModItems.JEONG_TWIN_BLADES.get()), new ItemStack(ModItems.PAINKILLER.get())));

    private final String id;
    private final int weight;
    private final Supplier<List<ItemStack>> contents;

    FixerKit(String id, int weight, Supplier<List<ItemStack>> contents) {
        this.id = id;
        this.weight = weight;
        this.contents = contents;
    }

    public int weight() {
        return weight;
    }

    /** 가중치에 따라 무작위로 하나 고른다. */
    public static FixerKit random(net.minecraft.util.RandomSource random) {
        int total = 0;
        for (FixerKit k : values()) {
            total += k.weight;
        }
        int roll = random.nextInt(total);
        for (FixerKit k : values()) {
            roll -= k.weight;
            if (roll < 0) {
                return k;
            }
        }
        return SWORDSMAN;
    }

    public String id() {
        return id;
    }

    /** 매번 새 ItemStack 목록을 만든다. 책장/장신구 아이템도 포함 (지급 시 자동 장착). */
    public List<ItemStack> createContents() {
        return contents.get();
    }

    private static List<ItemStack> build(List<? extends DeferredItem<?>> armorSet, KeyPage page, Accessory accessory,
            ItemStack... extra) {
        List<ItemStack> list = new ArrayList<>(List.of(extra));
        armorSet.forEach(item -> list.add(new ItemStack(item.get())));
        list.add(new ItemStack(ModItems.keyPageItem(page)));
        if (accessory != null) {
            list.add(new ItemStack(ModItems.accessoryItem(accessory)));
        }
        list.add(new ItemStack(Items.BREAD, 64));
        list.add(new ItemStack(ModItems.CITY_PASS.get()));
        return list;
    }
}
