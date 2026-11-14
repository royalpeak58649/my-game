package com.fixercity.registry;

import com.fixercity.FixerCity;
import java.util.EnumMap;
import java.util.List;
import net.minecraft.Util;
import net.minecraft.core.registries.Registries;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterial;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.crafting.Ingredient;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModArmorMaterials {
    public static final DeferredRegister<ArmorMaterial> REGISTER =
            DeferredRegister.create(Registries.ARMOR_MATERIAL, FixerCity.MODID);

    /** 해결사 정장: 가볍고 기동성 위주. 세트 효과 = 신속. */
    public static final DeferredHolder<ArmorMaterial, ArmorMaterial> FIXER_SUIT = REGISTER.register("fixer_suit",
            () -> new ArmorMaterial(
                    Util.make(new EnumMap<>(ArmorItem.Type.class), m -> {
                        m.put(ArmorItem.Type.HELMET, 2);
                        m.put(ArmorItem.Type.CHESTPLATE, 6);
                        m.put(ArmorItem.Type.LEGGINGS, 5);
                        m.put(ArmorItem.Type.BOOTS, 2);
                        m.put(ArmorItem.Type.BODY, 6);
                    }),
                    15,
                    SoundEvents.ARMOR_EQUIP_LEATHER,
                    () -> Ingredient.of(Items.LEATHER),
                    List.of(new ArmorMaterial.Layer(FixerCity.id("fixer_suit"))),
                    0.5F,
                    0.0F));

    /** 방탄 코트: 무겁고 단단함. 세트 효과 = 저항. */
    public static final DeferredHolder<ArmorMaterial, ArmorMaterial> HEAVY_COAT = REGISTER.register("heavy_coat",
            () -> new ArmorMaterial(
                    Util.make(new EnumMap<>(ArmorItem.Type.class), m -> {
                        m.put(ArmorItem.Type.HELMET, 3);
                        m.put(ArmorItem.Type.CHESTPLATE, 7);
                        m.put(ArmorItem.Type.LEGGINGS, 6);
                        m.put(ArmorItem.Type.BOOTS, 3);
                        m.put(ArmorItem.Type.BODY, 8);
                    }),
                    10,
                    SoundEvents.ARMOR_EQUIP_IRON,
                    () -> Ingredient.of(Items.IRON_INGOT),
                    List.of(new ArmorMaterial.Layer(FixerCity.id("heavy_coat"))),
                    2.0F,
                    0.1F));

    private ModArmorMaterials() {}
}
