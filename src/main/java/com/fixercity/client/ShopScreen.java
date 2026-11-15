package com.fixercity.client;

import com.fixercity.network.ShopPayload;
import java.util.List;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** 협회 상점 화면. */
public class ShopScreen extends Screen {
    private static final List<String> CATEGORIES = List.of("supplies", "pages", "weapons", "accessories", "invitations");
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

    /** 맨 위에 보이는 품목 번호. 같은 분류를 다시 열어도(구매 후 새로고침) 유지된다. */
    private int scroll;
    private int visibleRows;
    private int footerY;
    private String scrollCategory = "";
    private boolean draggingBar;

    private int maxScroll() {
        return Math.max(0, data.entries().size() - visibleRows);
    }

    @Override
    protected void init() {
        left = (width - PANEL_W) / 2;
        if (!data.category().equals(scrollCategory)) {
            scrollCategory = data.category();
            scroll = 0;
        }
        // 화면에 들어가는 만큼만 보여 주고 나머지는 스크롤
        top = 8;
        listTop = top + 32 + 26;
        int room = height - listTop - 36;
        visibleRows = Math.max(1, Math.min(data.entries().size(), room / ROW_H));
        scroll = Math.max(0, Math.min(scroll, maxScroll()));

        int y = top + 32;
        int tabW = (PANEL_W - 8) / CATEGORIES.size();
        for (int i = 0; i < CATEGORIES.size(); i++) {
            String c = CATEGORIES.get(i);
            Button tab = Button.builder(Component.translatable("shop.fixercity.category." + c), b -> command("shop gui " + c))
                    .bounds(left + 4 + i * tabW, y, tabW - 2, 20).build();
            tab.active = !c.equals(data.category());
            addRenderableWidget(tab);
        }
        y = listTop;
        int end = Math.min(data.entries().size(), scroll + visibleRows);
        for (int i = scroll; i < end; i++) {
            ShopPayload.Entry e = data.entries().get(i);
            Button buy = Button.builder(Component.translatable("ui.fixercity.buy"), b -> {
                command("shop buy " + e.id());
                command("shop gui " + data.category());
            }).bounds(left + PANEL_W - 62, y + 1, 50, 18).build();
            buy.active = e.allowed();
            addRenderableWidget(buy);
            y += ROW_H;
        }
        footerY = listTop + visibleRows * ROW_H + 6;
        addRenderableWidget(Button.builder(Component.translatable("ui.fixercity.back_to_board"), b -> command("request gui"))
                .bounds(left + 4, footerY, 120, 20).build());
        addRenderableWidget(Button.builder(Component.translatable("gui.done"), b -> onClose())
                .bounds(left + PANEL_W - 84, footerY, 80, 20).build());
    }

    private void setScroll(int value) {
        int v = Math.max(0, Math.min(value, maxScroll()));
        if (v != scroll) {
            scroll = v;
            rebuildWidgets();
        }
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double scrollX, double scrollY) {
        if (maxScroll() > 0 && scrollY != 0) {
            setScroll(scroll - (int) Math.signum(scrollY));
            return true;
        }
        return super.mouseScrolled(mouseX, mouseY, scrollX, scrollY);
    }

    private int barX() {
        return left + PANEL_W - 8;
    }

    private boolean overBar(double mx, double my) {
        return maxScroll() > 0 && mx >= barX() - 1 && mx < barX() + 7 && my >= listTop && my < listTop + visibleRows * ROW_H;
    }

    private void dragTo(double my) {
        int trackH = visibleRows * ROW_H;
        double t = (my - listTop) / trackH;
        setScroll((int) Math.round(t * maxScroll()));
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button == 0 && overBar(mouseX, mouseY)) {
            draggingBar = true;
            dragTo(mouseY);
            return true;
        }
        return super.mouseClicked(mouseX, mouseY, button);
    }

    @Override
    public boolean mouseDragged(double mouseX, double mouseY, int button, double dragX, double dragY) {
        if (draggingBar) {
            dragTo(mouseY);
            return true;
        }
        return super.mouseDragged(mouseX, mouseY, button, dragX, dragY);
    }

    @Override
    public boolean mouseReleased(double mouseX, double mouseY, int button) {
        draggingBar = false;
        return super.mouseReleased(mouseX, mouseY, button);
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (keyCode == 265) { // 위
            setScroll(scroll - 1);
            return true;
        }
        if (keyCode == 264) { // 아래
            setScroll(scroll + 1);
            return true;
        }
        if (keyCode == 266) { // Page Up
            setScroll(scroll - visibleRows);
            return true;
        }
        if (keyCode == 267) { // Page Down
            setScroll(scroll + visibleRows);
            return true;
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
    }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float partialTick) {
        super.render(g, mouseX, mouseY, partialTick);
        g.fill(left - 4, top - 4, left + PANEL_W + 4, top + 28, 0x60000000);
        g.drawCenteredString(font, title, width / 2, top, 0xFF55FFFF);
        g.drawCenteredString(font, data.profile(), width / 2, top + 14, 0xFFFFFFFF);
        int trackH = visibleRows * ROW_H;
        g.enableScissor(left - 4, listTop - 2, left + PANEL_W + 4, listTop + trackH + 2);
        int end = Math.min(data.entries().size(), scroll + visibleRows);
        ShopPayload.Entry hovered = null;
        for (int i = scroll; i < end; i++) {
            ShopPayload.Entry e = data.entries().get(i);
            int y = listTop + (i - scroll) * ROW_H;
            g.renderItem(e.stack(), left + 4, y + 2);
            g.renderItemDecorations(font, e.stack(), left + 4, y + 2);
            g.drawString(font, e.stack().getHoverName(), left + 26, y + 2, 0xFFFFFFFF);
            Component price = Component.translatable("ui.fixercity.price", String.format("%,d", e.price()), e.minGrade());
            g.drawString(font, price, left + 26, y + 12, e.allowed() ? 0xFFE8C35A : 0xFFAA5555);
            if (mouseX >= left + 4 && mouseX < left + 20 && mouseY >= y + 2 && mouseY < y + 18) {
                hovered = e;
            }
        }
        g.disableScissor();
        if (maxScroll() > 0) {
            int bx = barX();
            g.fill(bx, listTop, bx + 6, listTop + trackH, 0xFF202020);
            int thumbH = Math.max(12, trackH * visibleRows / data.entries().size());
            int thumbY = listTop + (trackH - thumbH) * scroll / maxScroll();
            g.fill(bx, thumbY, bx + 6, thumbY + thumbH, draggingBar || overBar(mouseX, mouseY) ? 0xFFE0E0E0 : 0xFFA0A0A0);
            Component pos = Component.literal((scroll + 1) + "-" + end + " / " + data.entries().size());
            g.drawCenteredString(font, pos, width / 2, footerY + 6, 0xFFAAAAAA);
        }
        if (hovered != null) {
            g.renderTooltip(font, hovered.stack(), mouseX, mouseY);
        }
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }
}
