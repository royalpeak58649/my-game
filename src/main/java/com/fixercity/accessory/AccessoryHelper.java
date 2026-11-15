package com.fixercity.accessory;

import com.fixercity.FixerCity;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPageHelper;
import com.fixercity.registry.ModAttachments;
import com.fixercity.registry.ModItems;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;

/** 장신구 착용/해제와 효과 수치. */
public final class AccessoryHelper {
    private static final ResourceLocation KNOCKBACK_ID = FixerCity.id("accessory_knockback");

    private AccessoryHelper() {}

    public static Accessory get(LivingEntity entity) {
        if (!(entity instanceof Player)) {
            return null;
        }
        return Accessory.byId(entity.getData(ModAttachments.ACCESSORY));
    }

    public static boolean has(LivingEntity entity, Accessory accessory) {
        return get(entity) == accessory;
    }

    /** 장신구와 맞는 책장을 끼고 있는지. */
    public static boolean isResonant(LivingEntity entity) {
        Accessory a = get(entity);
        KeyPage page = KeyPageHelper.getPage(entity);
        return a != null && page != null && page.id().equals(a.resonancePage());
    }

    /** 착용한 장신구가 accessory일 때 공명 여부에 따라 값을 고른다. 아니면 none. */
    public static float value(LivingEntity entity, Accessory accessory, float normal, float resonant, float none) {
        if (!has(entity, accessory)) {
            return none;
        }
        return isResonant(entity) ? resonant : normal;
    }

    public static void equip(ServerPlayer player, Accessory accessory) {
        ItemStack old = takeOff(player);
        player.setData(ModAttachments.ACCESSORY, accessory.id());
        KeyPageHelper.applyAttributes(player);
        if (!old.isEmpty() && !player.getInventory().add(old)) {
            player.drop(old, false);
        }
    }

    public static ItemStack unequip(ServerPlayer player) {
        ItemStack old = takeOff(player);
        KeyPageHelper.applyAttributes(player);
        return old;
    }

    private static ItemStack takeOff(ServerPlayer player) {
        Accessory current = get(player);
        player.setData(ModAttachments.ACCESSORY, "");
        return current == null ? ItemStack.EMPTY : new ItemStack(ModItems.accessoryItem(current));
    }

    /** KeyPageHelper.applyAttributes에서 같이 호출된다 (공명이 책장에 따라 바뀌므로). */
    public static void applyAttributes(Player player) {
        AttributeInstance kb = player.getAttribute(Attributes.KNOCKBACK_RESISTANCE);
        if (kb == null) {
            return;
        }
        kb.removeModifier(KNOCKBACK_ID);
        float amount = value(player, Accessory.ZWEI_ARMBAND, 0.3F, 0.5F, 0.0F);
        if (amount > 0) {
            kb.addTransientModifier(new AttributeModifier(KNOCKBACK_ID, amount, AttributeModifier.Operation.ADD_VALUE));
        }
    }
}
