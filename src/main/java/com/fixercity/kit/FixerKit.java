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
            new ItemStack(ModItems.PHILIP_SWORD.get()))),

    // ---- 상점 전용 키트 (가중치 0: 처음 지급에는 안 나온다) ----
    ZWEI("zwei", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.ZWEI, Accessory.ZWEI_ARMBAND,
            new ItemStack(ModItems.ZWEI_GREATSWORD.get()))),
    KUROKUMO("kurokumo", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.KUROKUMO, Accessory.KUROKUMO_KNOT,
            new ItemStack(ModItems.KUROKUMO_BLADE.get()))),
    SEVEN("seven", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.SEVEN, Accessory.SEVEN_MONOCLE,
            new ItemStack(ModItems.SEVEN_CANE.get()))),
    LIU("liu", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.LIU, Accessory.LIU_TALISMAN,
            new ItemStack(ModItems.LIU_GAUNTLET.get()))),
    THUMB("thumb", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.THUMB, Accessory.THUMB_BANDOLIER,
            new ItemStack(ModItems.THUMB_RIFLE.get()), new ItemStack(ModItems.FIXER_BULLET.get(), 16))),

    // ---- 도시의 별 · 하나 협회 (상점 전용, 인물별) ----
    DONG_HWAN("dong_hwan", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.DONG_HWAN, null,
            new ItemStack(ModItems.KUROKUMO_BLADE.get()))),
    LOWELL("lowell", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.LOWELL, Accessory.LIU_TALISMAN,
            new ItemStack(ModItems.LIU_GAUNTLET.get()))),
    CECIL("cecil", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.CECIL, Accessory.LIU_TALISMAN,
            new ItemStack(ModItems.LIU_GAUNTLET.get()))),
    MEI("mei", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.MEI, Accessory.LIU_TALISMAN,
            new ItemStack(ModItems.LIU_GAUNTLET.get()))),
    KALO("kalo", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.KALO, Accessory.THUMB_BANDOLIER,
            new ItemStack(ModItems.THUMB_RIFLE.get()), new ItemStack(ModItems.FIXER_BULLET.get(), 16))),
    BORIS("boris", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.BORIS, Accessory.THUMB_BANDOLIER,
            new ItemStack(ModItems.THUMB_RIFLE.get()), new ItemStack(ModItems.FIXER_BULLET.get(), 16))),
    KATRIEL("katriel", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.KATRIEL, Accessory.THUMB_BANDOLIER,
            new ItemStack(ModItems.THUMB_RIFLE.get()), new ItemStack(ModItems.FIXER_BULLET.get(), 16))),
    DENIS("denis", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.DENIS, Accessory.THUMB_BANDOLIER,
            new ItemStack(ModItems.THUMB_RIFLE.get()), new ItemStack(ModItems.FIXER_BULLET.get(), 16))),
    NEMO("nemo", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.NEMO, null,
            new ItemStack(ModItems.CANE_OFFICE_CANE.get()))),
    MARTINA("martina", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.MARTINA, null,
            new ItemStack(ModItems.CANE_OFFICE_CANE.get()))),
    BADA("bada", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.BADA, null,
            new ItemStack(ModItems.CANE_OFFICE_CANE.get()))),
    ESTHER("esther", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.ESTHER, null,
            new ItemStack(ModItems.PROXY_BLADE.get()))),
    HUBERT("hubert", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.HUBERT, null,
            new ItemStack(ModItems.PROXY_BLADE.get()))),
    GLORIA("gloria", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.GLORIA, null,
            new ItemStack(ModItems.PROXY_BLADE.get()))),
    CHUN("chun", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.CHUN, Accessory.LIU_TALISMAN,
            new ItemStack(ModItems.LIU_FIRE_SWORD.get()))),
    XIAO("xiao", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.XIAO, Accessory.LIU_TALISMAN,
            new ItemStack(ModItems.LIU_FIRE_SWORD.get()))),
    MIRIS("miris", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.MIRIS, Accessory.LIU_TALISMAN,
            new ItemStack(ModItems.LIU_FIRE_SWORD.get()))),
    RED_MIST("red_mist", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.RED_MIST, null,
            new ItemStack(ModItems.RED_MIST_BLADE.get()))),
    NIKOLAI("nikolai", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.NIKOLAI, null,
            new ItemStack(ModItems.R_CORP_RIFLE.get()))),
    MYO("myo", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.MYO, null,
            new ItemStack(ModItems.R_CORP_RIFLE.get()))),
    MAXIM("maxim", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.MAXIM, null,
            new ItemStack(ModItems.RHINO_GAUNTLET.get()))),
    RUDOLPH("rudolph", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.RUDOLPH, null,
            new ItemStack(ModItems.REINDEER_STAFF.get()))),
    PURPLE_TEAR("purple_tear", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.PURPLE_TEAR, null,
            new ItemStack(ModItems.PURPLE_TEAR_SWORD.get()))),
    YAN("yan", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.YAN, null,
            new ItemStack(ModItems.YAN_BLADE.get()))),
    ALLEN("allen", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.ALLEN, null,
            new ItemStack(ModItems.ALLEN_STILETTO.get()))),
    IRINA("irina", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.IRINA, null,
            new ItemStack(ModItems.FIXER_LONGSWORD.get()))),
    YAE("yae", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.YAE, null,
            new ItemStack(ModItems.SMOKE_GEAR_BLADE.get()))),
    BAYARD("bayard", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.BAYARD, null,
            new ItemStack(ModItems.WORKSHOP_HALBERD.get()))),
    HANA_FIXER("hana_fixer", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.HANA_FIXER, null,
            new ItemStack(ModItems.HANA_SWORD.get()))),
    MIRINAE("mirinae", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.MIRINAE, null,
            new ItemStack(ModItems.HANA_SWORD.get()))),
    HAROLD("harold", 0, () -> build(ModItems.FIXER_SUIT_SET, KeyPages.HAROLD, null,
            new ItemStack(ModItems.HANA_SWORD.get()))),
    OLIVIER("olivier", 0, () -> build(ModItems.HEAVY_COAT_SET, KeyPages.OLIVIER, null,
            new ItemStack(ModItems.HANA_SWORD.get())));

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
        return weight > 0 && weight <= RARE_WEIGHT;
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
        return weight == 0 ? 0 : weight <= 1 ? 2 : weight <= RARE_WEIGHT ? 1 : 0;
    }

    /** 키트의 주무기 (첫 아이템). */
    public net.minecraft.world.item.Item weaponItem() {
        List<ItemStack> list = contents.get();
        return list.isEmpty() ? null : list.get(0).getItem();
    }

    public static FixerKit byId(String id) {
        for (FixerKit k : values()) {
            if (k.id.equals(id)) {
                return k;
            }
        }
        return null;
    }

    /** 이 책장에 맞는 키트 (상점에서 책장 대신 판다). */
    public static FixerKit forPage(String pageId) {
        return switch (pageId) {
            case "rat" -> BACKSTREET;
            case "office_fixer" -> SWORDSMAN;
            default -> byId(pageId);
        };
    }

    /** 희귀 키트 무기 강화 단계 (도시 질병 +3, 도시 악몽 +5). */
    public static final int[] RARE_REFINE = {0, 3, 5};
    /** 희귀 키트 갑옷 보호 마법 단계. */
    public static final int[] RARE_PROTECTION = {0, 2, 4};

    /** 매번 새 ItemStack 목록을 만든다. 책장/장신구 아이템도 포함 (지급 시 자동 장착). */
    public List<ItemStack> createContents(net.minecraft.core.HolderLookup.Provider registries) {
        return createContents(registries, false);
    }

    /** purchased: 상점에서 산 키트. 희귀 보너스와 도시 통행증이 없다. */
    public List<ItemStack> createContents(net.minecraft.core.HolderLookup.Provider registries, boolean purchased) {
        List<ItemStack> list = contents.get();
        if (purchased) {
            list.removeIf(s -> s.is(ModItems.CITY_PASS.get()));
            return list;
        }
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
