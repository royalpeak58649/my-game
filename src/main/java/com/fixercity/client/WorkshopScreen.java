package com.fixercity.client;

import com.fixercity.network.WorkshopPayload;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** 공방 화면: 위는 신체 개조 5종, 가운데는 손에 든 무기 강화, 아래는 손님의 책으로 책장 제본. */
public class WorkshopScreen extends Screen {
    private static final int PANEL_W = 320;
    private static final int ROW_H = 24;
    private WorkshopPayload data;
    private int left;
    private int top;

    public WorkshopScreen(WorkshopPayload data) {
        super(Component.translatable("block.fixercity.workshop"));
        this.data = data;
    }

    public void update(WorkshopPayload data) {
        this.data = data;
        rebuildWidgets();
    }

    private void act(String command) {
        if (minecraft != null && minecraft.player != null) {
            minecraft.player.connection.sendCommand(command);
            minecraft.player.connection.sendCommand("workshop gui");
        }
    }

    @Override
    protected void init() {
        left = (width - PANEL_W) / 2;
        int total = 34 + data.augments().size() * ROW_H + 60 + 30 + Math.max(1, data.binds().size()) * ROW_H + 26;
        top = Math.max(8, (height - total) / 2);
        int y = top + 34;
        for (WorkshopPayload.AugEntry a : data.augments()) {
            Button b = Button.builder(Component.translatable("ui.fixercity.augment"), btn -> act("workshop augment " + a.id()))
                    .bounds(left + PANEL_W - 64, y + 2, 60, 18).build();
            b.active = a.allowed();
            addRenderableWidget(b);
            y += ROW_H;
        }
        y += 30;
        Button refine = Button.builder(Component.translatable("ui.fixercity.refine"), btn -> act("workshop refine"))
                .bounds(left + PANEL_W - 64, y + 2, 60, 18).build();
        refine.active = data.refine().allowed();
        addRenderableWidget(refine);
        y += 30 + 30;
        for (WorkshopPayload.BindEntry e : data.binds()) {
            Button b = Button.builder(Component.translatable("ui.fixercity.bind"), btn -> act("workshop bind " + e.guest()))
                    .bounds(left + PANEL_W - 64, y + 2, 60, 18).build();
            b.active = e.allowed();
            addRenderableWidget(b);
            y += ROW_H;
        }
        if (data.binds().isEmpty()) {
            y += ROW_H;
        }
        addRenderableWidget(Button.builder(Component.translatable("gui.done"), btn -> onClose())
                .bounds(left + PANEL_W - 84, y + 4, 80, 20).build());
    }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float partialTick) {
        super.render(g, mouseX, mouseY, partialTick);
        g.fill(left - 4, top - 4, left + PANEL_W + 4, top + 28, 0x60000000);
        g.drawCenteredString(font, title, width / 2, top, 0xFFE0A83A);
        g.drawCenteredString(font, data.profile(), width / 2, top + 14, 0xFFFFFFFF);
        int y = top + 34;
        for (WorkshopPayload.AugEntry a : data.augments()) {
            String stars = "■".repeat(a.level()) + "□".repeat(Math.max(0, 5 - a.level()));
            g.drawString(font, Component.translatable("augment.fixercity." + a.id()).append(" " + stars), left + 4, y + 2, 0xFFFFFFFF);
            Component info = a.level() >= 5 ? Component.translatable("ui.fixercity.augment_max")
                    : Component.translatable("ui.fixercity.augment_cost", String.format("%,d", a.cost()), a.requiredGrade());
            g.drawString(font, Component.translatable("augment.fixercity." + a.id() + ".desc").append(" · ").append(info),
                    left + 4, y + 13, a.allowed() ? 0xFFAAAAAA : 0xFF886666);
            y += ROW_H;
        }
        g.drawString(font, Component.translatable("ui.fixercity.refine_header"), left + 4, y + 10, 0xFFE0A83A);
        y += 30;
        WorkshopPayload.RefineInfo r = data.refine();
        g.drawString(font, r.itemName().copy().append(r.level() > 0 ? " +" + r.level() : ""), left + 4, y + 2, 0xFFFFFFFF);
        Component info = r.level() >= 5 ? Component.translatable("ui.fixercity.augment_max")
                : Component.translatable("ui.fixercity.refine_cost", String.format("%,d", r.cost()), r.chance());
        g.drawString(font, info, left + 4, y + 13, r.allowed() ? 0xFFAAAAAA : 0xFF886666);
        y += 30;
        g.drawString(font, Component.translatable("ui.fixercity.bind_header"), left + 4, y + 10, 0xFFE0A83A);
        y += 30;
        if (data.binds().isEmpty()) {
            g.drawString(font, Component.translatable("ui.fixercity.bind_none"), left + 4, y + 6, 0xFF888888);
        }
        for (WorkshopPayload.BindEntry e : data.binds()) {
            g.drawString(font, e.page().copy().append(" (" + e.books() + ")"), left + 4, y + 2, 0xFFFFFFFF);
            g.drawString(font, Component.translatable("ui.fixercity.bind_cost", String.format("%,d", e.cost()), e.requiredGrade()),
                    left + 4, y + 13, e.allowed() ? 0xFFAAAAAA : 0xFF886666);
            y += ROW_H;
        }
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }
}
