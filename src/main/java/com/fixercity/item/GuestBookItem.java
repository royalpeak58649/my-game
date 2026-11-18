package com.fixercity.item;

import com.fixercity.reception.Guest;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;

/** 손님의 책. 공방의 '책장 제본'에서 빈 책장과 함께 쓰면 그 손님의 책장이 된다. */
public class GuestBookItem extends Item {
    private final Guest guest;

    public GuestBookItem(Guest guest, Properties properties) {
        super(properties);
        this.guest = guest;
    }

    public Guest guest() {
        return guest;
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("item.fixercity.guest_book.lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        tooltip.add(Component.translatable("tooltip.fixercity.guest_book_page",
                Component.translatable(guest.page().translationKey()).withStyle(ChatFormatting.GOLD)).withStyle(ChatFormatting.GRAY));
        tooltip.add(Component.translatable("tooltip.fixercity.guest_book_use").withStyle(ChatFormatting.DARK_GRAY));
    }
}
