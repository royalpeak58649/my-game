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
            new ItemStack(ModItems.JEONG_TWIN_BLADES.get()), new ItemStack(ModItems.PAINKILLER.get()))),

    // ---- 도시 악몽 키트 (가장 드물다) ----
    SHI("shi", 1, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.SHI, Accessory.SHI_TASSEL,
            new ItemStack(ModItems.SHI_BLADE.get()))),
    W_CORP("w_corp", 1, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.W_CORP, null,
            new ItemStack(ModItems.W_CORP_BATON.get()), new ItemStack(ModItems.FIRST_AID_KIT.get()))),
    WARP("warp", 1, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.WARP, null,
            new ItemStack(ModItems.WARP_BLADE.get()), new ItemStack(ModItems.SMOKE_BOMB.get()))),
    SMILING("smiling", 1, () -> build(List.of(), KeyPages.SMILING, null,
            new ItemStack(ModItems.SMILING_MAW.get()))),
    INDEX("index", 1, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.INDEX, null,
            new ItemStack(ModItems.INDEX_BLADE.get()), new ItemStack(ModItems.PAINKILLER.get()))),
    PHILIP("philip", 1, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.PHILIP, null,
            new ItemStack(ModItems.PHILIP_SWORD.get())));

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
        return pick(random, 99);
    }

    /** 희귀 키트(가중치 2 이하: 도시 질병·도시 악몽)만 놓고 무작위로 하나 고른다. */
    public static FixerKit randomRare(net.minecraft.util.RandomSource random) {
        return pick(random, RARE_WEIGHT);
    }

    public static final int RARE_WEIGHT = 2;

    public boolean isRare() {
        return weight <= RARE_WEIGHT;
    }

    private static FixerKit pick(net.minecraft.util.RandomSource random, int maxWeight) {
        int total = 0;
        for (FixerKit k : values()) {
            if (k.weight <= maxWeight) total += k.weight;
        }
        int roll = random.nextInt(total);
        for (FixerKit k : values()) {
            if (k.weight > maxWeight) continue;
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

    /** 희귀 키트 등급: 0 = 일반, 1 = 도시 질병, 2 = 도시 악몽. */
    public int rareTier() {
        return weight <= 1 ? 2 : weight <= RARE_WEIGHT ? 1 : 0;
    }

    /** 희귀 키트 무기 강화 단계 (도시 질병 +3, 도시 악몽 +5). */
    public static final int[] RARE_REFINE = {0, 3, 5};
    /** 희귀 키트 갑옷 보호 마법 단계. */
    public static final int[] RARE_PROTECTION = {0, 2, 4};

    /** 매번 새 ItemStack 목록을 만든다. 책장/장신구 아이템도 포함 (지급 시 자동 장착). */
    public List<ItemStack> createContents(net.minecraft.core.HolderLookup.Provider registries) {
        List<ItemStack> list = contents.get();
        int tier = rareTier();
        if (tier == 0) {
            return list;
        }
        var enchants = registries.lookupOrThrow(net.minecraft.core.registries.Registries.ENCHANTMENT);
        var protection = enchants.getOrThrow(net.minecraft.world.item.enchantment.Enchantments.PROTECTION);
        var unbreaking = enchants.getOrThrow(net.minecraft.world.item.enchantment.Enchantments.UNBREAKING);
        // 첫 번째 아이템이 주무기
        ItemStack weapon = list.get(0);
        weapon.set(com.fixercity.registry.ModDataComponents.REFINE.get(), RARE_REFINE[tier]);
        weapon.enchant(unbreaking, 3);
        boolean hasAccessory = false;
        for (ItemStack s : list) {
            if (s.getItem() instanceof net.minecraft.world.item.ArmorItem) {
                s.enchant(protection, RARE_PROTECTION[tier]);
                s.enchant(unbreaking, tier + 1);
            }
            if (s.getItem() instanceof com.fixercity.item.AccessoryItem) {
                hasAccessory = true;
            }
        }
        list.add(new ItemStack(ModItems.FIRST_AID_KIT.get(), tier == 2 ? 3 : 2));
        if (tier == 2) {
            list.add(new ItemStack(ModItems.PAINKILLER.get(), 2));
            list.add(new ItemStack(ModItems.SMOKE_BOMB.get()));
            if (!hasAccessory) {
                Accessory[] all = Accessory.values();
                list.add(new ItemStack(ModItems.accessoryItem(all[java.util.concurrent.ThreadLocalRandom.current().nextInt(all.length)])));
            }
        }
        return list;
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
