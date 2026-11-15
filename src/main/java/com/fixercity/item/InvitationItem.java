package com.fixercity.item;

import com.fixercity.reception.LibraryFloor;
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

/** 도서관 초대장. 층이 데이터로 붙어 있다. 우클릭하면 근처 플레이어와 함께 접대에 들어간다. */
public class InvitationItem extends Item {
    public InvitationItem(Properties properties) {
        super(properties);
    }

    public static LibraryFloor floorOf(ItemStack stack) {
        return LibraryFloor.byId(stack.getOrDefault(ModDataComponents.FLOOR.get(), ""));
    }

    @Override
    public Component getName(ItemStack stack) {
        LibraryFloor floor = floorOf(stack);
        return floor == null ? super.getName(stack)
                : Component.translatable("item.fixercity.invitation.named", Component.translatable(floor.floorKey()));
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        LibraryFloor floor = floorOf(stack);
        if (floor == null) {
            return InteractionResultHolder.fail(stack);
        }
        if (player instanceof ServerPlayer sp && ReceptionManager.start(sp, floor) && !player.getAbilities().instabuild) {
            stack.shrink(1);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        LibraryFloor floor = floorOf(stack);
        tooltip.add(Component.translatable("item.fixercity.invitation.lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        if (floor != null) {
            tooltip.add(Component.translatable("tooltip.fixercity.invitation_floor", Component.translatable(floor.librarianKey()),
                    floor.grade()).withStyle(ChatFormatting.GOLD));
        }
        tooltip.add(Component.translatable("tooltip.fixercity.invitation_use").withStyle(ChatFormatting.DARK_GRAY));
    }
}
