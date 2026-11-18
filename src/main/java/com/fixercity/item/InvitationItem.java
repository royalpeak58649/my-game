package com.fixercity.item;

import com.fixercity.reception.Guest;
import com.fixercity.reception.ReceptionManager;
import com.fixercity.registry.ModDataComponents;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;

/** 도서관 초대장. 손님이 데이터로 붙어 있다. 우클릭하면 근처 플레이어와 함께 접대에 들어간다. */
public class InvitationItem extends Item {
    public InvitationItem(Properties properties) {
        super(properties);
    }

    public static Guest guestOf(ItemStack stack) {
        return Guest.byId(stack.getOrDefault(ModDataComponents.FLOOR.get(), ""));
    }

    @Override
    public Component getName(ItemStack stack) {
        Guest guest = guestOf(stack);
        return guest == null ? super.getName(stack)
                : Component.translatable("item.fixercity.invitation.named", Component.translatable(guest.nameKey()));
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        Guest guest = guestOf(stack);
        if (guest == null) {
            return InteractionResultHolder.fail(stack);
        }
        if (player instanceof ServerPlayer sp && ReceptionManager.start(sp, guest) && !player.getAbilities().instabuild) {
            stack.shrink(1);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        Guest guest = guestOf(stack);
        tooltip.add(Component.translatable("item.fixercity.invitation.lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        if (guest != null) {
            tooltip.add(Component.translatable("tooltip.fixercity.invitation_guest", Component.translatable(guest.nameKey()),
                    guest.grade()).withStyle(ChatFormatting.GOLD));
            tooltip.add(Component.translatable("tooltip.fixercity.invitation_stage", Component.translatable(guest.stageKey()))
                    .withStyle(ChatFormatting.GRAY));
            if (!Guest.bossModLoaded()) {
                tooltip.add(Component.translatable("tooltip.fixercity.invitation_needs_mod").withStyle(ChatFormatting.RED));
            }
        } else {
            tooltip.add(Component.translatable("tooltip.fixercity.invitation_expired").withStyle(ChatFormatting.DARK_RED));
        }
        tooltip.add(Component.translatable("tooltip.fixercity.invitation_use").withStyle(ChatFormatting.DARK_GRAY));
    }
}
