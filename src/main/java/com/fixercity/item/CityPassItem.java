package com.fixercity.item;

import com.fixercity.world.CityDimension;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;

/** 도시 출입증: 우클릭하면 도시 중앙 광장으로, 도시 안에서 쓰면 원래 세계로 돌아간다. 재사용 5초. */
public class CityPassItem extends Item {
    public CityPassItem(Properties properties) {
        super(properties);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (player instanceof ServerPlayer sp) {
            boolean inCity = level.dimension() == CityDimension.THE_CITY;
            ServerLevel dest = inCity ? sp.server.overworld() : sp.server.getLevel(CityDimension.THE_CITY);
            if (dest == null) {
                return InteractionResultHolder.fail(stack);
            }
            BlockPos pos;
            if (inCity) {
                BlockPos respawn = sp.getRespawnPosition();
                pos = respawn != null && sp.getRespawnDimension() == Level.OVERWORLD ? respawn.above() : dest.getSharedSpawnPos();
            } else {
                pos = new BlockPos(8, CityDimension.GROUND + 1, 8);
            }
            dest.getChunk(pos);
            sp.teleportTo(dest, pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5, sp.getYRot(), sp.getXRot());
            dest.playSound(null, pos, SoundEvents.ENDERMAN_TELEPORT, SoundSource.PLAYERS, 0.8F, 0.8F);
            sp.displayClientMessage(Component.translatable(inCity ? "message.fixercity.left_city" : "message.fixercity.entered_city")
                    .withStyle(ChatFormatting.GOLD), true);
            player.getCooldowns().addCooldown(this, 100);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("item.fixercity.city_pass.lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        tooltip.add(Component.translatable("item.fixercity.city_pass.effect").withStyle(ChatFormatting.GOLD));
    }
}
