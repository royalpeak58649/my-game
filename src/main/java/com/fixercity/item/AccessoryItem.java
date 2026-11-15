package com.fixercity.item;

import com.fixercity.accessory.Accessory;
import com.fixercity.accessory.AccessoryHelper;
import com.fixercity.keypage.KeyPages;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
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

/** 장신구 아이템. 우클릭하면 착용 (기존 장신구는 인벤토리로). */
public class AccessoryItem extends Item {
    private final Accessory accessory;

    public AccessoryItem(Accessory accessory, Properties properties) {
        super(properties);
        this.accessory = accessory;
    }

    public Accessory accessory() {
        return accessory;
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (player instanceof ServerPlayer serverPlayer) {
            if (AccessoryHelper.get(player) == accessory) {
                player.displayClientMessage(Component.translatable("message.fixercity.accessory_already"), true);
                return InteractionResultHolder.fail(stack);
            }
            AccessoryHelper.equip(serverPlayer, accessory);
            if (!player.getAbilities().instabuild) {
                stack.shrink(1);
            }
            level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.ARMOR_EQUIP_CHAIN.value(),
                    SoundSource.PLAYERS, 1.0F, 1.2F);
            player.displayClientMessage(Component.translatable("message.fixercity.accessory_equipped",
                    Component.translatable(getDescriptionId()).withStyle(ChatFormatting.GOLD)), true);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        appendInfo(this, tooltip);
        tooltip.add(Component.translatable("tooltip.fixercity.accessory_use").withStyle(ChatFormatting.DARK_GRAY));
    }

    public static void appendInfo(Item item, List<Component> out) {
        if (!(item instanceof AccessoryItem a)) {
            return;
        }
        String key = item.getDescriptionId();
        out.add(Component.translatable(key + ".lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        out.add(Component.translatable(key + ".effect").withStyle(ChatFormatting.GOLD));
        var page = KeyPages.byId(a.accessory.resonancePage());
        if (page != null) {
            out.add(Component.translatable("tooltip.fixercity.accessory_resonance",
                    Component.translatable(page.translationKey())).withStyle(ChatFormatting.DARK_AQUA));
            out.add(Component.literal("  ").append(Component.translatable(key + ".resonance")).withStyle(ChatFormatting.AQUA));
        }
    }
}
