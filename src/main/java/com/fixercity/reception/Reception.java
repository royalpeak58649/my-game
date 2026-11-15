package com.fixercity.reception;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.server.level.ServerBossEvent;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.BossEvent;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/** 진행 중인 접대 하나 (메모리에만 있다). */
public class Reception {
    public record ReturnPoint(ResourceKey<Level> dimension, Vec3 pos, float yaw) {}

    public static class BossState {
        public long nextSkillAt;
        public final Map<BossSkill, Long> ready = new HashMap<>();
        public BossSkill pending;
        public long pendingAt;
        public UUID pendingTarget;
        public boolean enraged;
        public int weaponIndex;
    }

    public final int slot;
    public final LibraryFloor floor;
    public final BlockPos center;
    public final Map<UUID, ReturnPoint> participants = new LinkedHashMap<>();
    public final Set<UUID> enemies = new LinkedHashSet<>();
    public final Map<UUID, BossState> bosses = new HashMap<>();
    public final ServerBossEvent bar;
    public long startTime;
    public long endAt = -1;
    public long emptySince = -1;
    public boolean victory;

    public Reception(int slot, LibraryFloor floor, BlockPos center) {
        this.slot = slot;
        this.floor = floor;
        this.center = center;
        this.bar = new ServerBossEvent(Component.translatable(floor.librarianKey()), floor.barColor(), BossEvent.BossBarOverlay.NOTCHED_10);
    }

    public boolean isParticipant(Player p) {
        return participants.containsKey(p.getUUID());
    }

    public boolean isInside(Player p) {
        if (p.level().dimension() != ReceptionManager.LIBRARY) {
            return false;
        }
        double dx = p.getX() - (center.getX() + 0.5);
        double dz = p.getZ() - (center.getZ() + 0.5);
        return dx * dx + dz * dz <= 26 * 26;
    }

    /** 살아 있는 적 (사서, 보조 사서). */
    public List<Mob> livingEnemies(ServerLevel level) {
        List<Mob> list = new ArrayList<>();
        for (UUID id : enemies) {
            Entity e = level.getEntity(id);
            if (e instanceof Mob mob && mob.isAlive()) {
                list.add(mob);
            }
        }
        return list;
    }
}
