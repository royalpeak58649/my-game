package com.fixercity.client;

import com.fixercity.network.BoardPayload;
import com.fixercity.network.ShopPayload;
import com.fixercity.network.StaggerSyncPayload;
import net.minecraft.client.Minecraft;

/** 클라이언트 전용 패킷 처리. 서버에서는 절대 불리지 않는다. */
public final class ClientPayloads {
    // ---- HUD 상태 ----
    public static float ownCurrent = -1;
    public static float ownMax = -1;
    public static boolean ownStaggered;
    public static int targetId = -1;
    public static float targetCurrent;
    public static float targetMax;
    public static boolean targetStaggered;
    public static long targetTime;

    private ClientPayloads() {}

    public static void stagger(StaggerSyncPayload p) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null) {
            return;
        }
        if (p.entityId() == mc.player.getId()) {
            ownCurrent = p.current();
            ownMax = p.max();
            ownStaggered = p.staggered();
        } else {
            targetId = p.entityId();
            targetCurrent = p.current();
            targetMax = p.max();
            targetStaggered = p.staggered();
            targetTime = System.currentTimeMillis();
        }
    }

    public static void board(BoardPayload p) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.screen instanceof RequestBoardScreen screen) {
            screen.update(p);
        } else {
            mc.setScreen(new RequestBoardScreen(p));
        }
    }

    public static void workshop(com.fixercity.network.WorkshopPayload p) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.screen instanceof WorkshopScreen screen) {
            screen.update(p);
        } else {
            mc.setScreen(new WorkshopScreen(p));
        }
    }

    public static void shop(ShopPayload p) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.screen instanceof ShopScreen screen) {
            screen.update(p);
        } else {
            mc.setScreen(new ShopScreen(p));
        }
    }
}
