package com.fixercity.client;

import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.LayeredDraw;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.Entity;

/**
 * 흐트러짐 게이지 HUD.
 * - 내 게이지: 핫바 왼쪽.
 * - 방금 때린 대상의 게이지: 조준점 아래, 4초간.
 */
public class StaggerHud implements LayeredDraw.Layer {
    private static final int YELLOW = 0xFFE8C35A;
    private static final int RED = 0xFFD8312A;
    private static final int BACK = 0xA0000000;
    private static final int TARGET_SHOW_MS = 4000;

    @Override
    public void render(GuiGraphics g, DeltaTracker delta) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.options.hideGui || mc.player == null || mc.player.isSpectator()) {
            return;
        }
        Font font = mc.font;
        int w = g.guiWidth();
        int h = g.guiHeight();

        // 내 게이지
        if (ClientPayloads.ownMax > 0) {
            int barW = 80;
            int x = Math.max(4, w / 2 - 91 - 8 - barW);
            int y = h - 12;
            Component label = ClientPayloads.ownStaggered
                    ? Component.translatable("hud.fixercity.you_staggered")
                    : Component.translatable("hud.fixercity.stagger", Math.round(ClientPayloads.ownCurrent), Math.round(ClientPayloads.ownMax));
            g.drawString(font, label, x, y - 10, ClientPayloads.ownStaggered ? RED : 0xFFFFFFFF, true);
            bar(g, x, y, barW, 5, ClientPayloads.ownCurrent / ClientPayloads.ownMax, ClientPayloads.ownStaggered);
        }

        // 대상 게이지
        long age = System.currentTimeMillis() - ClientPayloads.targetTime;
        if (age < TARGET_SHOW_MS && mc.level != null && ClientPayloads.targetMax > 0) {
            Entity target = mc.level.getEntity(ClientPayloads.targetId);
            if (target != null && target.isAlive()) {
                int barW = 60;
                int x = w / 2 - barW / 2;
                int y = h / 2 + 14;
                Component name = ClientPayloads.targetStaggered
                        ? Component.translatable("hud.fixercity.target_staggered", target.getDisplayName())
                        : target.getDisplayName();
                g.drawCenteredString(font, name, w / 2, y, ClientPayloads.targetStaggered ? RED : 0xFFDDDDDD);
                bar(g, x, y + 10, barW, 4, ClientPayloads.targetCurrent / ClientPayloads.targetMax, ClientPayloads.targetStaggered);
            }
        }
    }

    private static void bar(GuiGraphics g, int x, int y, int width, int height, float fraction, boolean staggered) {
        float f = Math.max(0, Math.min(1, fraction));
        g.fill(x - 1, y - 1, x + width + 1, y + height + 1, BACK);
        g.fill(x, y, x + Math.round(width * f), y + height, staggered ? RED : YELLOW);
    }
}
