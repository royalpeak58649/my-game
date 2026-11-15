package com.fixercity.client;

import com.fixercity.network.ShopPayload;
import java.util.List;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** 협회 상점 화면. */
public class ShopScreen extends Screen {
    private static final List<String> CATEGORIES = List.of("supplies", "pages", "weapons", "accessories");
    private static final int PANEL_W = 320;
    private static final int ROW_H = 22;
    private ShopPayload data;
    private int left;
    private int top;
    private int listTop;

    public ShopScreen(ShopPayload data) {
        super(Component.translatable("ui.fixercity.shop"));
        this.data = data;
    }

    public void update(ShopPayload data) {
        this.data = data;
        rebuildWidgets();
    }

    private void command(String command) {
        if (minecraft != null && minecraft.player != null) {
            minecraft.player.connection.sendCommand(command);
        }
    }

    @Override
    protected void init() {
        left = (width - PANEL_W) / 2;
        int total = 34 + 24 + data.entries().size() * ROW_H + 30;
        top = Math.max(8, (height - total) / 2);
        int y = top + 32;
        int tabW = (PANEL_W - 8) / CATEGORIES.size();
        for (int i = 0; i < CATEGORIES.size(); i++) {
            String c = CATEGORIES.get(i);
            Button tab = Button.builder(Component.translatable("shop.fixercity.category." + c), b -> command("shop gui " + c))
                    .bounds(left + 4 + i * tabW, y, tabW - 2, 20).build();
            tab.active = !c.equals(data.category());
            addRenderableWidget(tab);
        }
        y += 26;
        listTop = y;
        for (ShopPayload.Entry e : data.entries()) {
            Button buy = Button.builder(Component.translatable("ui.fixercity.buy"), b -> {
                command("shop buy " + e.id());
                command("shop gui " + data.category());
            }).bounds(left + PANEL_W - 54, y + 1, 50, 18).build();
            buy.active = e.allowed();
            addRenderableWidget(buy);
            y += ROW_H;
        }
        y += 6;
        addRenderableWidget(Button.builder(Component.translatable("ui.fixercity.back_to_board"), b -> command("request gui"))
                .bounds(left + 4, y, 120, 20).build());
        addRenderableWidget(Button.builder(Component.translatable("gui.done"), b -> onClose())
                .bounds(left + PANEL_W - 84, y, 80, 20).build());
    }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float partialTick) {
        super.render(g, mouseX, mouseY, partialTick);
        g.fill(left - 4, top - 4, left + PANEL_W + 4, top + 28, 0x60000000);
        g.drawCenteredString(font, title, width / 2, top, 0xFF55FFFF);
        g.drawCenteredString(font, data.profile(), width / 2, top + 14, 0xFFFFFFFF);
        for (int i = 0; i < data.entries().size(); i++) {
            ShopPayload.Entry e = data.entries().get(i);
            int y = listTop + i * ROW_H;
            g.renderItem(e.stack(), left + 4, y + 2);
            g.renderItemDecorations(font, e.stack(), left + 4, y + 2);
            g.drawString(font, e.stack().getHoverName(), left + 26, y + 2, 0xFFFFFFFF);
            Component price = Component.translatable("ui.fixercity.price", String.format("%,d", e.price()), e.minGrade());
            g.drawString(font, price, left + 26, y + 12, e.allowed() ? 0xFFE8C35A : 0xFFAA5555);
            if (mouseX >= left + 4 && mouseX < left + 20 && mouseY >= y + 2 && mouseY < y + 18) {
                g.renderTooltip(font, e.stack(), mouseX, mouseY);
            }
        }
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }
}
