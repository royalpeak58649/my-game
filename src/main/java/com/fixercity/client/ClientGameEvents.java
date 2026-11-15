package com.fixercity.client;

import com.fixercity.FixerCity;
import com.fixercity.progress.Progression;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.player.ItemTooltipEvent;

/** 클라이언트 게임 이벤트: 강화된 무기 툴팁. */
@EventBusSubscriber(modid = FixerCity.MODID, value = Dist.CLIENT)
public final class ClientGameEvents {
    private ClientGameEvents() {}

    @SubscribeEvent
    public static void onTooltip(ItemTooltipEvent event) {
        int lv = Progression.refineLevel(event.getItemStack());
        if (lv > 0) {
            event.getToolTip().add(1, Component.translatable("tooltip.fixercity.refined", lv,
                    Math.round(lv * Progression.REFINE_DAMAGE_PER_LEVEL * 100)).withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD));
        }
    }
}
