package com.fixercity.client;

import com.fixercity.network.BoardPayload;
import java.util.List;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.util.FormattedCharSequence;

/** 의뢰 게시판 화면. 버튼은 서버 명령어를 보내고, 서버가 새 데이터를 보내면 화면이 갱신된다. */
public class RequestBoardScreen extends Screen {
    private static final int PANEL_W = 320;
    private static final int ROW_H = 24;
    private BoardPayload data;
    private int left;
    private int top;
    private int listTop;

    public RequestBoardScreen(BoardPayload data) {
        super(Component.translatable("block.fixercity.request_board"));
        this.data = data;
    }

    public void update(BoardPayload data) {
        this.data = data;
        rebuildWidgets();
    }

    private void command(String command) {
        if (minecraft != null && minecraft.player != null) {
            minecraft.player.connection.sendCommand(command);
        }
    }

    /** 명령을 보내고 화면 데이터를 다시 요청한다. */
    private void act(String command) {
        command(command);
        command("request gui");
    }

    @Override
    protected void init() {
        left = (width - PANEL_W) / 2;
        int rows = data.entries().size();
        int activeH = data.activeState() > 0 ? 44 : 0;
        int total = 34 + activeH + rows * ROW_H + 30;
        top = Math.max(8, (height - total) / 2);
        int y = top + 34;

        if (data.activeState() > 0) {
            int bx = left + PANEL_W - 4;
            Button abandon = Button.builder(Component.translatable("ui.fixercity.abandon"), b -> act("request abandon"))
                    .bounds(bx - 50, y, 50, 18).build();
            addRenderableWidget(abandon);
            if (data.activeState() == 2) {
                addRenderableWidget(Button.builder(Component.translatable("ui.fixercity.report"), b -> act("request report"))
                        .bounds(bx - 104, y, 50, 18).build());
            }
            y += activeH;
        }

        listTop = y;
        for (BoardPayload.Entry e : data.entries()) {
            Button accept = Button.builder(Component.translatable("ui.fixercity.accept"), b -> act("request accept " + e.id()))
                    .bounds(left + 4, y + 2, 44, 18).build();
            accept.active = e.allowed();
            addRenderableWidget(accept);
            y += ROW_H;
        }

        y += 6;
        addRenderableWidget(Button.builder(Component.translatable("ui.fixercity.shop"), b -> command("shop gui supplies"))
                .bounds(left + 4, y, 120, 20).build());
        addRenderableWidget(Button.builder(Component.translatable("gui.done"), b -> onClose())
                .bounds(left + PANEL_W - 84, y, 80, 20).build());
    }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float partialTick) {
        super.render(g, mouseX, mouseY, partialTick);
        int bottom = listTop + data.entries().size() * ROW_H + 30;
        g.fill(left - 4, top - 4, left + PANEL_W + 4, top + 28, 0x60000000);
        g.drawCenteredString(font, title, width / 2, top, 0xFFE8C35A);
        g.drawCenteredString(font, data.profile(), width / 2, top + 14, 0xFFFFFFFF);

        if (data.activeState() > 0) {
            int y = top + 34;
            g.drawString(font, Component.translatable("ui.fixercity.current").append(data.activeTitle()), left + 4, y + 1, 0xFFFFFF55);
            List<FormattedCharSequence> lines = font.split(data.activeDetail(), PANEL_W - 8);
            for (int i = 0; i < Math.min(2, lines.size()); i++) {
                g.drawString(font, lines.get(i), left + 4, y + 20 + i * 10, 0xFF55FFFF);
            }
        }

        if (data.entries().isEmpty()) {
            g.drawString(font, Component.translatable("ui.fixercity.no_requests"), left + 4, listTop + 4, 0xFFAAAAAA);
        }
        for (int i = 0; i < data.entries().size(); i++) {
            BoardPayload.Entry e = data.entries().get(i);
            int y = listTop + i * ROW_H;
            g.drawString(font, font.substrByWidth(e.title(), PANEL_W - 56).getString(), left + 54, y + 3, 0xFFFFFFFF);
            g.drawString(font, e.rewards(), left + 54, y + 13, 0xFFAAAAAA);
            if (mouseX >= left && mouseX <= left + PANEL_W && mouseY >= y && mouseY < y + ROW_H && mouseX > left + 50) {
                g.renderTooltip(font, font.split(e.objective().copy().append("\n").append(e.rewards()), 240), mouseX, mouseY);
            }
        }
        g.drawString(font, Component.translatable("ui.fixercity.board_hint"), left + 4, bottom + 2, 0xFF777777);
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }
}
