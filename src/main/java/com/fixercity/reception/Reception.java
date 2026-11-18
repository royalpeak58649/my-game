package com.fixercity.reception;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.core.BlockPos;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/** 진행 중인 접대 하나 (메모리에만 있다). */
public class Reception {
    public record ReturnPoint(ResourceKey<Level> dimension, Vec3 pos, float yaw) {}

    public final int slot;
    public final Guest guest;
    public final BlockPos center;
    public final Map<UUID, ReturnPoint> participants = new LinkedHashMap<>();
    public UUID boss;
    public long startTime;
    public long endAt = -1;
    public long emptySince = -1;
    public boolean victory;

    public Reception(int slot, Guest guest, BlockPos center) {
        this.slot = slot;
        this.guest = guest;
        this.center = center;
    }

    public boolean isParticipant(Player p) {
        return participants.containsKey(p.getUUID());
    }

    /** 무대 안 (벽 안쪽, 천장 아래, 물웅덩이 바닥 위). */
    public boolean isInside(Entity e) {
        if (e.level().dimension() != ReceptionManager.STAGE) {
            return false;
        }
        double dx = e.getX() - (center.getX() + 0.5);
        double dz = e.getZ() - (center.getZ() + 0.5);
        double dy = e.getY() - center.getY();
        return dx * dx + dz * dz <= (Stage.WALL + 0.5) * (Stage.WALL + 0.5) && dy >= -Stage.DEPTH && dy <= Stage.CEILING + 1;
    }

    /** 이 접대의 땅 범위 안인지 (높이 무관): 접대실 차원의 엔티티 정리에 쓴다. */
    public boolean inArea(double x, double z) {
        return Math.abs(x - center.getX()) <= Stage.WALL + 8 && Math.abs(z - center.getZ()) <= Stage.WALL + 8;
    }
}
