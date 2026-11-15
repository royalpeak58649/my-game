package com.fixercity.request;

import com.fixercity.registry.ModItems;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MobSpawnType;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.memory.MemoryModuleType;
import net.minecraft.world.entity.ai.memory.WalkTarget;
import net.minecraft.world.entity.npc.Villager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.entity.ChestBlockEntity;
import net.minecraft.world.level.levelgen.Heightmap;

/** 호위 · 방어 · 회수 · 순찰 의뢰의 현장 처리. RequestManager가 1초마다 tick을 부른다. */
public final class RequestMissions {
    public static final String DEFENSE_TAG = "fixercity_defense";
    public static final String ESCORT_TAG = "fixercity_escort";
    private static final int WAVES = 3;

    private RequestMissions() {}

    private static ServerLevel levelOf(MinecraftServer server, Request r) {
        return server.getLevel(ResourceKey.create(Registries.DIMENSION, ResourceLocation.parse(r.dimension)));
    }

    private static int surfaceY(ServerLevel level, int x, int z) {
        return level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
    }

    /** 수락 직후: 호위 의뢰는 게시판 옆에 의뢰인을 세운다. */
    public static void onAccept(ServerPlayer player, Request r, BlockPos board) {
        if (r.type != RequestType.ESCORT) {
            return;
        }
        ServerLevel level = player.serverLevel();
        Villager villager = EntityType.VILLAGER.create(level);
        if (villager == null) {
            return;
        }
        villager.moveTo(board.getX() + 0.5, board.getY() + 1, board.getZ() + 1.5, 0F, 0F);
        villager.setCustomName(Component.translatable("escort.fixercity.client").withStyle(ChatFormatting.AQUA));
        villager.setCustomNameVisible(true);
        villager.setPersistenceRequired();
        villager.addEffect(new MobEffectInstance(MobEffects.GLOWING, MobEffectInstance.INFINITE_DURATION, 0, false, false));
        villager.getPersistentData().putInt(ESCORT_TAG, r.id);
        level.addFreshEntity(villager);
        r.escortEntity = villager.getUUID();
    }

    /** ACTIVE 의뢰마다 1초에 한 번. */
    public static void tick(MinecraftServer server, Request r) {
        switch (r.type) {
            case ESCORT -> tickEscort(server, r);
            case DEFENSE -> tickDefense(server, r);
            case RETRIEVAL -> tickRetrieval(server, r);
            case PATROL -> tickPatrol(server, r);
            default -> {
            }
        }
    }

    private static ServerPlayer nearestMember(MinecraftServer server, Request r, Level level, double x, double z, double maxDist) {
        ServerPlayer best = null;
        double bestD = maxDist * maxDist;
        for (UUID m : r.members) {
            ServerPlayer p = server.getPlayerList().getPlayer(m);
            if (p == null || p.level() != level || p.isSpectator()) {
                continue;
            }
            double dx = p.getX() - x;
            double dz = p.getZ() - z;
            double d = dx * dx + dz * dz;
            if (d < bestD) {
                bestD = d;
                best = p;
            }
        }
        return best;
    }

    // ---- 호위 ----
    private static void tickEscort(MinecraftServer server, Request r) {
        ServerLevel level = levelOf(server, r);
        if (level == null || r.escortEntity == null) {
            return;
        }
        Entity e = level.getEntity(r.escortEntity);
        if (!(e instanceof Villager villager) || !villager.isAlive()) {
            return; // 청크가 안 불러졌을 수 있음. 죽음은 onDeath에서 처리.
        }
        double dx = villager.getX() - (r.pos.getX() + 0.5);
        double dz = villager.getZ() - (r.pos.getZ() + 0.5);
        if (dx * dx + dz * dz <= 36) {
            villager.removeEffect(MobEffects.GLOWING);
            villager.getPersistentData().remove(ESCORT_TAG);
            villager.setCustomName(Component.translatable("escort.fixercity.thanks").withStyle(ChatFormatting.GREEN));
            RequestManager.complete(server, r);
            return;
        }
        ServerPlayer leader = nearestMember(server, r, level, villager.getX(), villager.getZ(), 32);
        if (leader != null && villager.distanceToSqr(leader) > 9) {
            villager.getBrain().setMemory(MemoryModuleType.WALK_TARGET, new WalkTarget(leader, 0.75F, 2));
        }
    }

    // ---- 방어 ----
    private static void tickDefense(MinecraftServer server, Request r) {
        ServerLevel level = levelOf(server, r);
        if (level == null || r.started) {
            return;
        }
        ServerPlayer p = nearestMember(server, r, level, r.pos.getX() + 0.5, r.pos.getZ() + 0.5, 12);
        if (p != null) {
            r.started = true;
            r.wave = 1;
            RequestManager.notifyMembers(server, r, Component.translatable("message.fixercity.defense_start")
                    .withStyle(ChatFormatting.RED, ChatFormatting.BOLD));
            spawnWave(level, r, p);
        }
    }

    private static EntityType<? extends Mob> waveMob(RandomSource random, int grade) {
        if (grade >= 7) {
            return random.nextBoolean() ? EntityType.ZOMBIE : EntityType.SKELETON;
        }
        if (grade >= 5) {
            return switch (random.nextInt(4)) {
                case 0 -> EntityType.VINDICATOR;
                case 1 -> EntityType.PILLAGER;
                case 2 -> EntityType.SKELETON;
                default -> EntityType.ZOMBIE;
            };
        }
        return switch (random.nextInt(5)) {
            case 0 -> EntityType.VINDICATOR;
            case 1 -> EntityType.PILLAGER;
            case 2 -> EntityType.WITCH;
            case 3 -> EntityType.WITHER_SKELETON;
            default -> EntityType.VINDICATOR;
        };
    }

    private static void spawnWave(ServerLevel level, Request r, ServerPlayer target) {
        RandomSource random = level.random;
        int count = 2 + r.wave + (9 - r.grade) / 2;
        int spawned = 0;
        for (int i = 0; i < count; i++) {
            double a = random.nextDouble() * Math.PI * 2;
            int x = r.pos.getX() + (int) (Math.cos(a) * (8 + random.nextInt(5)));
            int z = r.pos.getZ() + (int) (Math.sin(a) * (8 + random.nextInt(5)));
            Mob mob = spawnTagged(level, waveMob(random, r.grade), x, z, DEFENSE_TAG, r.id, r.grade);
            if (mob != null) {
                mob.setTarget(target);
                spawned++;
            }
        }
        r.remaining = spawned;
        RequestManager.data(level.getServer()).setDirty();
        RequestManager.notifyMembers(level.getServer(), r, Component.translatable("message.fixercity.defense_wave", r.wave, WAVES, spawned)
                .withStyle(ChatFormatting.RED));
        level.playSound(null, r.pos, SoundEvents.RAID_HORN.value(), SoundSource.HOSTILE, 4.0F, 1.0F);
    }

    /** 의뢰 등급만큼 강화된 몹을 지면에 소환하고 태그를 붙인다. */
    static Mob spawnTagged(ServerLevel level, EntityType<? extends Mob> type, int x, int z, String tag, int id, int grade) {
        Mob mob = type.create(level);
        if (mob == null) {
            return null;
        }
        int y = surfaceY(level, x, z);
        mob.moveTo(x + 0.5, y, z + 0.5, level.random.nextFloat() * 360F, 0F);
        mob.finalizeSpawn(level, level.getCurrentDifficultyAt(new BlockPos(x, y, z)), MobSpawnType.EVENT, null);
        double tier = Math.max(0, 9 - grade);
        AttributeInstance hp = mob.getAttribute(Attributes.MAX_HEALTH);
        if (hp != null) {
            hp.setBaseValue(hp.getBaseValue() * (1.0 + tier * 0.25));
        }
        mob.setHealth(mob.getMaxHealth());
        mob.setPersistenceRequired();
        mob.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, MobEffectInstance.INFINITE_DURATION, 0, false, false));
        mob.getPersistentData().putInt(tag, id);
        level.addFreshEntity(mob);
        return mob;
    }

    // ---- 회수 ----
    private static void tickRetrieval(MinecraftServer server, Request r) {
        ServerLevel level = levelOf(server, r);
        if (level == null || r.started) {
            return;
        }
        ServerPlayer p = nearestMember(server, r, level, r.pos.getX() + 0.5, r.pos.getZ() + 0.5, 32);
        if (p == null) {
            return;
        }
        r.started = true;
        int x = r.pos.getX();
        int z = r.pos.getZ();
        BlockPos chestPos = new BlockPos(x, surfaceY(level, x, z), z);
        level.setBlock(chestPos, Blocks.CHEST.defaultBlockState(), 3);
        if (level.getBlockEntity(chestPos) instanceof ChestBlockEntity chest) {
            chest.setItem(13, new ItemStack(ModItems.BRIEFCASE.get()));
        }
        r.pos = chestPos;
        RandomSource random = level.random;
        int guards = 2 + (9 - r.grade) / 2;
        for (int i = 0; i < guards; i++) {
            double a = random.nextDouble() * Math.PI * 2;
            spawnTagged(level, r.grade >= 7 ? EntityType.ZOMBIE : EntityType.VINDICATOR,
                    x + (int) (Math.cos(a) * 4), z + (int) (Math.sin(a) * 4), DEFENSE_TAG, -1, r.grade);
        }
        RequestManager.data(server).setDirty();
        RequestManager.notifyMembers(server, r, Component.translatable("message.fixercity.retrieval_found",
                chestPos.getX(), chestPos.getY(), chestPos.getZ()).withStyle(ChatFormatting.YELLOW));
    }

    /** 인벤토리에서 서류 가방 하나를 가져간다. */
    public static boolean takeBriefcase(ServerPlayer player) {
        for (int i = 0; i < player.getInventory().getContainerSize(); i++) {
            ItemStack s = player.getInventory().getItem(i);
            if (s.is(ModItems.BRIEFCASE.get())) {
                s.shrink(1);
                return true;
            }
        }
        return false;
    }

    // ---- 순찰 ----
    private static void tickPatrol(MinecraftServer server, Request r) {
        ServerLevel level = levelOf(server, r);
        if (level == null || r.waypoints.isEmpty() || r.progress >= r.waypoints.size()) {
            return;
        }
        BlockPos next = r.waypoints.get(r.progress);
        if (nearestMember(server, r, level, next.getX() + 0.5, next.getZ() + 0.5, 6) != null) {
            r.progress++;
            RequestManager.data(server).setDirty();
            if (r.progress >= r.count) {
                RequestManager.complete(server, r);
            } else {
                BlockPos after = r.waypoints.get(r.progress);
                RequestManager.notifyMembers(server, r, Component.translatable("message.fixercity.patrol_next",
                        r.progress, r.count, after.getX(), after.getZ()).withStyle(ChatFormatting.YELLOW));
            }
        }
    }

    // ---- 죽음 ----
    /** 방어 습격대나 호위 의뢰인의 죽음이면 처리하고 true. */
    public static boolean onDeath(MinecraftServer server, FixerSavedData data, LivingEntity dead) {
        if (dead.getPersistentData().contains(ESCORT_TAG)) {
            Request r = data.find(dead.getPersistentData().getInt(ESCORT_TAG));
            if (r != null && r.state == Request.State.ACTIVE) {
                RequestManager.notifyMembers(server, r, Component.translatable("message.fixercity.escort_died").withStyle(ChatFormatting.RED));
                r.escortEntity = null;
                RequestManager.fail(server, r);
            }
            return true;
        }
        if (dead.getPersistentData().contains(DEFENSE_TAG)) {
            Request r = data.find(dead.getPersistentData().getInt(DEFENSE_TAG));
            if (r != null && r.state == Request.State.ACTIVE && r.type == RequestType.DEFENSE) {
                r.remaining = Math.max(0, r.remaining - 1);
                data.setDirty();
                if (r.remaining == 0) {
                    if (r.wave >= WAVES) {
                        RequestManager.complete(server, r);
                    } else {
                        r.wave++;
                        ServerLevel level = levelOf(server, r);
                        Player target = level == null ? null
                                : nearestMember(server, r, level, r.pos.getX() + 0.5, r.pos.getZ() + 0.5, 64);
                        if (level != null && target instanceof ServerPlayer sp) {
                            spawnWave(level, r, sp);
                        }
                    }
                }
            }
            return true;
        }
        return false;
    }

    /** 실패/포기 시 정리: 의뢰인 제거. */
    public static void cleanup(MinecraftServer server, Request r) {
        if (r.escortEntity == null) {
            return;
        }
        ServerLevel level = levelOf(server, r);
        if (level != null) {
            Entity e = level.getEntity(r.escortEntity);
            if (e != null) {
                e.discard();
            }
        }
    }
}
