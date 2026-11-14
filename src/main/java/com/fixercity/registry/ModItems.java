package com.fixercity.registry;

import com.fixercity.FixerCity;
import com.fixercity.item.DaggerItem;
import com.fixercity.item.FixerArmorItem;
import com.fixercity.item.FixerMaceItem;
import com.fixercity.item.LongswordItem;
import com.fixercity.item.RevolverItem;
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

    private static DeferredItem<FixerArmorItem> armor(String name,
            net.minecraft.core.Holder<net.minecraft.world.item.ArmorMaterial> material,
            ArmorItem.Type type, int durabilityMultiplier) {
        return REGISTER.register(name, () -> new FixerArmorItem(material, type,
                new Item.Properties().durability(type.getDurability(durabilityMultiplier))));
    }

    private ModItems() {}
}
