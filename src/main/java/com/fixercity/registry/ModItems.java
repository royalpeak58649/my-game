package com.fixercity.registry;

import com.fixercity.FixerCity;
import com.fixercity.accessory.Accessory;
import com.fixercity.item.AccessoryItem;
import com.fixercity.item.DaggerItem;
import com.fixercity.item.FixerToolItem;
import com.fixercity.item.FixerArmorItem;
import com.fixercity.item.FixerMaceItem;
import com.fixercity.item.KeyPageItem;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPages;
import java.util.LinkedHashMap;
import java.util.Map;
import com.fixercity.item.LongswordItem;
import com.fixercity.item.RevolverItem;
import com.fixercity.item.KurokumoBladeItem;
import com.fixercity.item.LiuGauntletItem;
import com.fixercity.item.RustyPipeItem;
import com.fixercity.item.SevenCaneItem;
import com.fixercity.item.ShiBladeItem;
import com.fixercity.item.ThumbRifleItem;
import com.fixercity.item.ZweiGreatswordItem;
import java.util.List;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.Tier;
import net.minecraft.world.item.crafting.Ingredient;
import net.neoforged.neoforge.common.SimpleTier;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModItems {
    public static final DeferredRegister.Items REGISTER = DeferredRegister.createItems(FixerCity.MODID);

    /** 해결사용 공방 강철. 철과 다이아몬드 사이. */
    public static final Tier FIXER_STEEL = new SimpleTier(
            BlockTags.INCORRECT_FOR_IRON_TOOL, 750, 6.0F, 2.0F, 14, () -> Ingredient.of(Items.IRON_INGOT));

    /** 도서관 초대장 (층은 데이터 컴포넌트). */
    public static final DeferredItem<com.fixercity.item.InvitationItem> INVITATION = REGISTER.register("invitation",
            () -> new com.fixercity.item.InvitationItem(new Item.Properties().stacksTo(1).rarity(Rarity.EPIC)));

    public static net.minecraft.world.item.ItemStack invitation(com.fixercity.reception.LibraryFloor floor) {
        net.minecraft.world.item.ItemStack stack = new net.minecraft.world.item.ItemStack(INVITATION.get());
        stack.set(com.fixercity.registry.ModDataComponents.FLOOR.get(), floor.id());
        return stack;
    }

    /** 회수 의뢰의 의뢰품. */
    public static final DeferredItem<Item> BRIEFCASE = REGISTER.registerSimpleItem("briefcase",
            new Item.Properties().stacksTo(1).rarity(Rarity.UNCOMMON));
    /** 도시 출입증: 우클릭하면 도시와 원래 세계를 오간다. */
    public static final DeferredItem<com.fixercity.item.CityPassItem> CITY_PASS = REGISTER.register("city_pass",
            () -> new com.fixercity.item.CityPassItem(new Item.Properties().stacksTo(1)));

    // ---- 블록 아이템 ----
    public static final DeferredItem<net.minecraft.world.item.BlockItem> REQUEST_BOARD =
            REGISTER.registerSimpleBlockItem("request_board", ModBlocks.REQUEST_BOARD);
    public static final DeferredItem<net.minecraft.world.item.BlockItem> WORKSHOP =
            REGISTER.registerSimpleBlockItem("workshop", ModBlocks.WORKSHOP);

    // ---- 무기 ----
    /** 장검: 공격력 8, 공속 1.4. 우클릭 = 돌진 베기. */
    public static final DeferredItem<LongswordItem> FIXER_LONGSWORD = REGISTER.register("fixer_longsword",
            () -> new LongswordItem(FIXER_STEEL, new Item.Properties()
                    .attributes(SwordItem.createAttributes(FIXER_STEEL, 5, -2.6F))));

    /** 철퇴: 공격력 11, 공속 0.8. 우클릭 = 내려찍기. */
    public static final DeferredItem<FixerMaceItem> FIXER_MACE = REGISTER.register("fixer_mace",
            () -> new FixerMaceItem(FIXER_STEEL, new Item.Properties()
                    .attributes(SwordItem.createAttributes(FIXER_STEEL, 8, -3.2F))));

    /** 단검: 공격력 5, 공속 2.4. 등 뒤 공격 시 피해 1.75배. 우클릭 = 백스텝. */
    public static final DeferredItem<DaggerItem> FIXER_DAGGER = REGISTER.register("fixer_dagger",
            () -> new DaggerItem(FIXER_STEEL, new Item.Properties()
                    .attributes(SwordItem.createAttributes(FIXER_STEEL, 2, -1.6F))));

    /** 리볼버: 6연발 히트스캔. 탄환 소모. */
    public static final DeferredItem<RevolverItem> FIXER_REVOLVER = REGISTER.register("fixer_revolver",
            () -> new RevolverItem(new Item.Properties().stacksTo(1).durability(600).rarity(Rarity.UNCOMMON)));

    /** 탄환: 도시에서 총알은 비싸다. */
    public static final DeferredItem<Item> FIXER_BULLET = REGISTER.registerSimpleItem("fixer_bullet",
            new Item.Properties().stacksTo(32));

    // ---- 조직 전용 무기 (맞는 책장을 끼면 공명) ----
    /** 고철. 쥐 패거리의 파이프용. */
    public static final Tier SCRAP = new SimpleTier(
            BlockTags.INCORRECT_FOR_STONE_TOOL, 220, 4.0F, 1.0F, 8, () -> Ingredient.of(Items.IRON_NUGGET));

    /** 녹슨 쇠파이프: 공격력 6, 공속 1.4, 타격. */
    public static final DeferredItem<RustyPipeItem> RUSTY_PIPE = REGISTER.register("rusty_pipe",
            () -> new RustyPipeItem(SCRAP, new Item.Properties().attributes(SwordItem.createAttributes(SCRAP, 4, -2.6F))));
    /** 츠바이 대검: 공격력 10, 공속 0.9, 참격. */
    public static final DeferredItem<ZweiGreatswordItem> ZWEI_GREATSWORD = REGISTER.register("zwei_greatsword",
            () -> new ZweiGreatswordItem(FIXER_STEEL, new Item.Properties().rarity(Rarity.UNCOMMON)
                    .attributes(SwordItem.createAttributes(FIXER_STEEL, 7, -3.1F))));
    /** 시 협회 발도검: 공격력 7, 공속 1.8, 참격. */
    public static final DeferredItem<ShiBladeItem> SHI_BLADE = REGISTER.register("shi_blade",
            () -> new ShiBladeItem(FIXER_STEEL, new Item.Properties().rarity(Rarity.UNCOMMON)
                    .attributes(SwordItem.createAttributes(FIXER_STEEL, 4, -2.2F))));
    /** 리우 권갑: 공격력 6, 공속 2.6, 타격. */
    public static final DeferredItem<LiuGauntletItem> LIU_GAUNTLET = REGISTER.register("liu_gauntlet",
            () -> new LiuGauntletItem(FIXER_STEEL, new Item.Properties().rarity(Rarity.UNCOMMON)
                    .attributes(SwordItem.createAttributes(FIXER_STEEL, 3, -1.4F))));
    /** 세븐 지팡이검: 공격력 6, 공속 2.0, 관통. */
    public static final DeferredItem<SevenCaneItem> SEVEN_CANE = REGISTER.register("seven_cane",
            () -> new SevenCaneItem(FIXER_STEEL, new Item.Properties().rarity(Rarity.UNCOMMON)
                    .attributes(SwordItem.createAttributes(FIXER_STEEL, 3, -2.0F))));
    /** 쿠로쿠모 장도: 공격력 8, 공속 1.6, 참격. */
    public static final DeferredItem<KurokumoBladeItem> KUROKUMO_BLADE = REGISTER.register("kurokumo_blade",
            () -> new KurokumoBladeItem(FIXER_STEEL, new Item.Properties().rarity(Rarity.RARE)
                    .attributes(SwordItem.createAttributes(FIXER_STEEL, 5, -2.4F))));
    /** 엄지 제식 소총: 4발, 관통 3. */
    public static final DeferredItem<ThumbRifleItem> THUMB_RIFLE = REGISTER.register("thumb_rifle",
            () -> new ThumbRifleItem(new Item.Properties().stacksTo(1).durability(400).rarity(Rarity.RARE)));

    // ---- 원작 해결사들의 무기 (카나드 ~ 도시 질병) ----
    public static final DeferredItem<com.fixercity.item.SkillWeaponItem> YUN_MACHETE =
            skillWeapon("yun_machete", 4, -2.4F, 120, "yun", com.fixercity.keypage.DamageKind.SLASH, com.fixercity.item.SkillWeaponItem.Skill.MENACE, Rarity.COMMON);
    public static final DeferredItem<com.fixercity.item.SkillWeaponItem> HOOK_BLADE =
            skillWeapon("hook_blade", 3, -2.2F, 140, "hook", com.fixercity.keypage.DamageKind.PIERCE, com.fixercity.item.SkillWeaponItem.Skill.HOOK_PULL, Rarity.COMMON);
    public static final DeferredItem<com.fixercity.item.SkillWeaponItem> STREETLIGHT_STAFF =
            skillWeapon("streetlight_staff", 3, -2.0F, 300, "streetlight", com.fixercity.keypage.DamageKind.BLUNT, com.fixercity.item.SkillWeaponItem.Skill.RALLY, Rarity.UNCOMMON);
    public static final DeferredItem<com.fixercity.item.SkillWeaponItem> MOLAR_HAMMER =
            skillWeapon("molar_hammer", 7, -3.0F, 160, "molar", com.fixercity.keypage.DamageKind.BLUNT, com.fixercity.item.SkillWeaponItem.Skill.CRUSH, Rarity.UNCOMMON);
    public static final DeferredItem<com.fixercity.item.SkillWeaponItem> DAWN_SWORD =
            skillWeapon("dawn_sword", 5, -2.4F, 400, "dawn", com.fixercity.keypage.DamageKind.SLASH, com.fixercity.item.SkillWeaponItem.Skill.DAWNLIGHT, Rarity.RARE);
    public static final DeferredItem<com.fixercity.item.SkillWeaponItem> GAZE_RAPIER =
            skillWeapon("gaze_rapier", 4, -2.0F, 200, "gaze", com.fixercity.keypage.DamageKind.PIERCE, com.fixercity.item.SkillWeaponItem.Skill.STARE, Rarity.RARE);
    public static final DeferredItem<com.fixercity.item.SkillWeaponItem> WEDGE_SPEAR =
            skillWeapon("wedge_spear", 5, -2.6F, 120, "wedge", com.fixercity.keypage.DamageKind.PIERCE, com.fixercity.item.SkillWeaponItem.Skill.THRUST, Rarity.RARE);
    public static final DeferredItem<com.fixercity.item.SkillWeaponItem> WORKSHOP_HALBERD =
            skillWeapon("workshop_halberd", 7, -3.0F, 160, "workshop", com.fixercity.keypage.DamageKind.SLASH, com.fixercity.item.SkillWeaponItem.Skill.WHIRLWIND, Rarity.RARE);
    public static final DeferredItem<com.fixercity.item.SkillWeaponItem> JEONG_TWIN_BLADES =
            skillWeapon("jeong_twin_blades", 3, -1.6F, 160, "jeong", com.fixercity.keypage.DamageKind.SLASH, com.fixercity.item.SkillWeaponItem.Skill.RIPOSTE, Rarity.RARE);
    public static final DeferredItem<com.fixercity.item.FullStopRifleItem> FULL_STOP_RIFLE = REGISTER.register("full_stop_rifle",
            () -> new com.fixercity.item.FullStopRifleItem(new Item.Properties().stacksTo(1).durability(300).rarity(Rarity.RARE)));

    private static DeferredItem<com.fixercity.item.SkillWeaponItem> skillWeapon(String name, int damage, float speed, int cooldown,
            String page, com.fixercity.keypage.DamageKind kind, com.fixercity.item.SkillWeaponItem.Skill skill, Rarity rarity) {
        return REGISTER.register(name, () -> new com.fixercity.item.SkillWeaponItem(FIXER_STEEL, new Item.Properties().rarity(rarity)
                .attributes(SwordItem.createAttributes(FIXER_STEEL, damage, speed)), cooldown, page, kind, skill));
    }

    // ---- 해결사 정장 ----
    public static final DeferredItem<FixerArmorItem> FIXER_HAT = armor("fixer_hat", ModArmorMaterials.FIXER_SUIT, ArmorItem.Type.HELMET, 18);
    public static final DeferredItem<FixerArmorItem> FIXER_JACKET = armor("fixer_jacket", ModArmorMaterials.FIXER_SUIT, ArmorItem.Type.CHESTPLATE, 18);
    public static final DeferredItem<FixerArmorItem> FIXER_PANTS = armor("fixer_pants", ModArmorMaterials.FIXER_SUIT, ArmorItem.Type.LEGGINGS, 18);
    public static final DeferredItem<FixerArmorItem> FIXER_SHOES = armor("fixer_shoes", ModArmorMaterials.FIXER_SUIT, ArmorItem.Type.BOOTS, 18);

    // ---- 방탄 코트 ----
    public static final DeferredItem<FixerArmorItem> HEAVY_HAT = armor("heavy_hat", ModArmorMaterials.HEAVY_COAT, ArmorItem.Type.HELMET, 26);
    public static final DeferredItem<FixerArmorItem> HEAVY_COAT = armor("heavy_coat", ModArmorMaterials.HEAVY_COAT, ArmorItem.Type.CHESTPLATE, 26);
    public static final DeferredItem<FixerArmorItem> HEAVY_PANTS = armor("heavy_pants", ModArmorMaterials.HEAVY_COAT, ArmorItem.Type.LEGGINGS, 26);
    public static final DeferredItem<FixerArmorItem> HEAVY_BOOTS = armor("heavy_boots", ModArmorMaterials.HEAVY_COAT, ArmorItem.Type.BOOTS, 26);

    public static final List<DeferredItem<FixerArmorItem>> FIXER_SUIT_SET = List.of(FIXER_HAT, FIXER_JACKET, FIXER_PANTS, FIXER_SHOES);
    public static final List<DeferredItem<FixerArmorItem>> HEAVY_COAT_SET = List.of(HEAVY_HAT, HEAVY_COAT, HEAVY_PANTS, HEAVY_BOOTS);

    // ---- 책장 ----
    /** 빈 책장: 모든 책장의 재료. */
    public static final DeferredItem<Item> BLANK_KEY_PAGE = REGISTER.registerSimpleItem("blank_key_page",
            new Item.Properties().stacksTo(16));

    /** 책장 id -> 아이템. 아이템 이름은 key_page_<id>. */
    public static final Map<String, DeferredItem<KeyPageItem>> KEY_PAGES = new LinkedHashMap<>();

    static {
        for (KeyPage page : KeyPages.ALL) {
            Rarity rarity = page.grade() >= 8 ? Rarity.COMMON : page.grade() >= 6 ? Rarity.UNCOMMON : Rarity.RARE;
            KEY_PAGES.put(page.id(), REGISTER.register("key_page_" + page.id(),
                    () -> new KeyPageItem(page.id(), new Item.Properties().stacksTo(1).rarity(rarity))));
        }
    }

    // ---- 장신구 ----
    public static final Map<Accessory, DeferredItem<AccessoryItem>> ACCESSORIES = new LinkedHashMap<>();

    static {
        for (Accessory accessory : Accessory.values()) {
            ACCESSORIES.put(accessory, REGISTER.register(accessory.id(),
                    () -> new AccessoryItem(accessory, new Item.Properties().stacksTo(1).rarity(Rarity.UNCOMMON))));
        }
    }

    public static Item accessoryItem(Accessory accessory) {
        return ACCESSORIES.get(accessory).get();
    }

    // ---- 보조 장비 (소모품) ----
    public static final DeferredItem<FixerToolItem> FIRST_AID_KIT = REGISTER.register("first_aid_kit",
            () -> new FixerToolItem(FixerToolItem.Kind.FIRST_AID, new Item.Properties().stacksTo(8)));
    public static final DeferredItem<FixerToolItem> FLASHBANG = REGISTER.register("flashbang",
            () -> new FixerToolItem(FixerToolItem.Kind.FLASHBANG, new Item.Properties().stacksTo(8)));
    public static final DeferredItem<FixerToolItem> SMOKE_BOMB = REGISTER.register("smoke_bomb",
            () -> new FixerToolItem(FixerToolItem.Kind.SMOKE_BOMB, new Item.Properties().stacksTo(8)));
    public static final DeferredItem<FixerToolItem> PAINKILLER = REGISTER.register("painkiller",
            () -> new FixerToolItem(FixerToolItem.Kind.PAINKILLER, new Item.Properties().stacksTo(16)));

    public static Item keyPageItem(KeyPage page) {
        return KEY_PAGES.get(page.id()).get();
    }

    private static DeferredItem<FixerArmorItem> armor(String name,
            net.minecraft.core.Holder<net.minecraft.world.item.ArmorMaterial> material,
            ArmorItem.Type type, int durabilityMultiplier) {
        return REGISTER.register(name, () -> new FixerArmorItem(material, type,
                new Item.Properties().durability(type.getDurability(durabilityMultiplier))));
    }

    private ModItems() {}
}
