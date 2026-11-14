package com.fixercity.item;

import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.core.Holder;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterial;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;

/** 해결사 방어구. 네 부위를 모두 입으면 세트 효과 (FixerEvents에서 처리). */
public class FixerArmorItem extends ArmorItem {
    public FixerArmorItem(Holder<ArmorMaterial> material, Type type, Properties properties) {
        super(material, type, properties);
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        String key = getMaterial().unwrapKey().map(k -> k.location().getPath()).orElse("unknown");
        tooltip.add(Component.translatable("tooltip.fixercity.set." + key).withStyle(ChatFormatting.DARK_AQUA));
        super.appendHoverText(stack, context, tooltip, flag);
    }
}
