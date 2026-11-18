package com.fixercity.reception;

import com.fixercity.FixerCity;
import com.fixercity.registry.ModItems;
import com.fixercity.request.Grades;
import com.fixercity.request.RequestManager;
import com.fixercity.request.Shop;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.NumericTag;
import net.minecraft.nbt.StringTag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.Difficulty;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MobSpawnType;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.AABB;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.entity.EntityJoinLevelEvent;
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;

/**
 * 도서관의 접대 (손님 = L_Ender's Cataclysm 보스).
 * 초대장을 쓰면 근처(8칸) 플레이어와 함께 접대실 차원의 무대로 이동해 그 손님과 싸운다.
 * 손님을 쓰러뜨리면 보상과 손님의 책을 받고 30초 뒤 원래 자리로, 모두 쓰러지면 (= 책이 되면) 실패.
 */
public final class ReceptionManager {
    public static final ResourceKey<Level> STAGE = ResourceKey.create(Registries.DIMENSION, FixerCity.id("reception"));
    public static final String RECEPTION_TAG = "fixercity_reception";
    private static final String RECEPTION_START_TAG = "fixercity_reception_start";
    private static final int MAX_SLOTS = 32;
    private static final int SPACING = 512;
    private static final int ARENA_Y = 100;
    private static final int TIME_LIMIT = 20 * 60 * 20;
    private static final int RETURN_DELAY = 20 * 30;
    /** 인원이 한 명 늘 때마다 손님 체력 배율 +35%. */
    private static final double HEALTH_PER_EXTRA = 0.35;
    private static final Map<Integer, Reception> ACTIVE = new HashMap<>();
    /** 쓰러진 손님 (다음 점검 때 승리 처리). */
    private static final java.util.Set<UUID> FALLEN = new java.util.HashSet<>();

    private ReceptionManager() {}

    public static Reception receptionOf(Player p) {
        for (Reception r : ACTIVE.values()) {
            if (r.isParticipant(p)) {
                return r;
            }
        }
        return null;
    }

    // ================= 시작 =================

    public static boolean start(ServerPlayer leader, Guest guest) {
        MinecraftServer server = leader.server;
        ServerLevel stage = server.getLevel(STAGE);
        if (stage == null) {
            return false;
        }
        if (!guest.available()) {
            leader.sendSystemMessage(Component.translatable("message.fixercity.reception_no_boss_mod").withStyle(ChatFormatting.RED));
            return false;
        }
        if (server.getWorldData().getDifficulty() == Difficulty.PEACEFUL) {
            leader.sendSystemMessage(Component.translatable("message.fixercity.reception_peaceful").withStyle(ChatFormatting.RED));
            return false;
        }
        if (receptionOf(leader) != null || leader.level().dimension() == STAGE) {
            leader.sendSystemMessage(Component.translatable("message.fixercity.reception_busy").withStyle(ChatFormatting.RED));
            return false;
        }
        int slot = -1;
        for (int i = 0; i < MAX_SLOTS - 1; i++) { // 마지막 칸은 CI 점검용
            if (!ACTIVE.containsKey(i)) {
                slot = i;
                break;
            }
        }
        if (slot < 0) {
            leader.sendSystemMessage(Component.translatable("message.fixercity.reception_full").withStyle(ChatFormatting.RED));
            return false;
        }
        BlockPos center = new BlockPos(slot * SPACING, ARENA_Y, 0);
        Reception rec = new Reception(slot, guest, center);
        List<ServerPlayer> party = new ArrayList<>();
        party.add(leader);
        for (ServerPlayer other : leader.serverLevel().getEntitiesOfClass(ServerPlayer.class, leader.getBoundingBox().inflate(8.0),
                p -> p != leader && !p.isSpectator() && receptionOf(p) == null)) {
            party.add(other);
        }
        prepareStage(stage, rec);
        rec.startTime = stage.getGameTime();
        ACTIVE.put(slot, rec); // 손님이 들어오기 전에 등록해야 정리 규칙에 걸리지 않는다
        for (int i = 0; i < party.size(); i++) {
            ServerPlayer p = party.get(i);
            rec.participants.put(p.getUUID(), new Reception.ReturnPoint(p.level().dimension(), p.position(), p.getYRot()));
            p.teleportTo(stage, center.getX() + 0.5 + (i % 4 - 1.5) * 2, ARENA_Y, center.getZ() + 26.5 + (i / 4) * 2, 180F, 0F);
        }
        if (spawnGuest(stage, rec, party.size()) == null) {
            fail(server, stage, rec, "message.fixercity.reception_guest_missing");
            return true;
        }

        Component name = Component.translatable(guest.nameKey()).withStyle(ChatFormatting.GOLD);
        for (ServerPlayer p : party) {
            p.sendSystemMessage(Component.translatable("message.fixercity.reception_start", name,
                    Component.translatable(guest.stageKey())).withStyle(ChatFormatting.YELLOW));
            p.sendSystemMessage(Component.translatable("message.fixercity.reception_rule").withStyle(ChatFormatting.GRAY));
        }
        stage.playSound(null, center, SoundEvents.BELL_BLOCK, SoundSource.HOSTILE, 3.0F, 0.6F);
        return true;
    }

    /** 남은 몹·아이템을 치우고 손님의 무대를 짓는다. */
    private static void prepareStage(ServerLevel level, Reception rec) {
        clearEntities(level, rec);
        rec.guest.stage().build(level, rec.center);
    }

    private static void clearEntities(ServerLevel level, Reception rec) {
        AABB box = new AABB(rec.center).inflate(Stage.WALL + 6, Stage.CEILING + Stage.DEPTH, Stage.WALL + 6);
        for (Entity e : level.getEntities((Entity) null, box, e -> !(e instanceof Player))) {
            e.discard();
        }
    }

    /** 손님을 무대에 들인다. 실패하면 null. */
    public static LivingEntity spawnGuest(ServerLevel level, Reception rec, int partySize) {
        Guest g = rec.guest;
        EntityType<?> type = g.entityType().orElse(null);
        if (type == null) {
            return null;
        }
        Entity created = type.create(level);
        if (!(created instanceof LivingEntity boss)) {
            if (created != null) {
                created.discard();
            }
            return null;
        }
        double x = rec.center.getX() + 0.5;
        double y = g.aquatic() ? ARENA_Y - 7 : ARENA_Y;
        double z = g.aquatic() ? rec.center.getZ() + 0.5 : rec.center.getZ() - 17.5;
        boss.moveTo(x, y, z, 0F, 0F);
        boss.setYHeadRot(0F);
        if (boss instanceof Mob mob) {
            mob.finalizeSpawn(level, level.getCurrentDifficultyAt(rec.center), MobSpawnType.EVENT, null);
            mob.setPersistenceRequired();
        }
        AttributeInstance maxHealth = boss.getAttribute(Attributes.MAX_HEALTH);
        if (maxHealth != null && partySize > 1) {
            maxHealth.setBaseValue(maxHealth.getBaseValue() * (1.0 + HEALTH_PER_EXTRA * (partySize - 1)));
        }
        boss.setHealth(boss.getMaxHealth());
        boss.getPersistentData().putInt(RECEPTION_TAG, rec.slot);
        boss.getPersistentData().putLong(RECEPTION_START_TAG, rec.startTime);
        // 손님은 자기 책장의 내성을 쓴다
        boss.getPersistentData().putString(RequestManager.PAGE_TAG, g.page().id());
        GuestAwakening.awaken(boss);
        if (!level.addFreshEntity(boss)) {
            return null;
        }
        rec.boss = boss.getUUID();
        return boss;
    }

    // ================= 진행 =================

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        if (ACTIVE.isEmpty()) {
            return;
        }
        MinecraftServer server = event.getServer();
        ServerLevel stage = server.getLevel(STAGE);
        if (stage == null) {
            return;
        }
        long now = stage.getGameTime();
        if (now % 20 != 0) {
            return;
        }
        for (Reception rec : new ArrayList<>(ACTIVE.values())) {
            if (rec.endAt >= 0) {
                if (now >= rec.endAt) {
                    finish(server, stage, rec);
                }
                continue;
            }
            check(server, stage, rec, now);
        }
    }

    private static Player nearestInside(ServerLevel level, Reception rec, Entity from) {
        Player best = null;
        double bestD = Double.MAX_VALUE;
        for (Player p : level.players()) {
            if (rec.isParticipant(p) && rec.isInside(p) && p.isAlive() && !p.isSpectator()) {
                double d = p.distanceToSqr(from);
                if (d < bestD) {
                    bestD = d;
                    best = p;
                }
            }
        }
        return best;
    }

    private static void check(MinecraftServer server, ServerLevel level, Reception rec, long now) {
        int inside = 0;
        for (UUID id : rec.participants.keySet()) {
            ServerPlayer p = server.getPlayerList().getPlayer(id);
            if (p != null && rec.isInside(p) && p.isAlive()) {
                inside++;
            }
        }
        if (rec.boss != null && FALLEN.remove(rec.boss)) {
            // 쓰러졌다가 (불사의 토템 등으로) 다시 일어난 경우는 승리가 아니다
            if (!(level.getEntity(rec.boss) instanceof LivingEntity b) || !b.isAlive()) {
                victory(server, level, rec, now);
                return;
            }
        }
        if (inside == 0) {
            // 아무도 안에 없으면 (모두 쓰러짐 = 책이 됨) 5초 뒤 실패. 이때는 청크가 내려갈 수 있어 손님을 찾지 않는다.
            if (rec.emptySince < 0) {
                rec.emptySince = now;
            } else if (now - rec.emptySince >= 100) {
                fail(server, level, rec, "message.fixercity.reception_failed");
            }
            return;
        }
        rec.emptySince = -1;
        Entity boss = rec.boss == null ? null : level.getEntity(rec.boss);
        if (!(boss instanceof LivingEntity living) || living.isRemoved()) {
            // 쓰러지지 않고 사라졌다 (명령어 등)
            fail(server, level, rec, "message.fixercity.reception_guest_left");
            return;
        }
        if (living.isAlive()) {
            // 무대 밖으로 나가면 제자리로
            if (!rec.isInside(living)) {
                double y = rec.guest.aquatic() ? ARENA_Y - 7 : ARENA_Y;
                living.teleportTo(rec.center.getX() + 0.5, y, rec.center.getZ() - (rec.guest.aquatic() ? -0.5 : 17.5));
            }
            if (living instanceof Mob mob) {
                LivingEntity target = mob.getTarget();
                if (!(target instanceof Player tp) || !tp.isAlive() || !rec.isParticipant(tp) || !rec.isInside(tp)) {
                    Player next = nearestInside(level, rec, mob);
                    if (next != null) {
                        mob.setTarget(next);
                    }
                }
            }
        }
        if (now - rec.startTime > TIME_LIMIT) {
            fail(server, level, rec, "message.fixercity.reception_timeout");
        }
    }

    @SubscribeEvent
    public static void onDeath(LivingDeathEvent event) {
        LivingEntity dead = event.getEntity();
        if (dead.level().isClientSide() || !dead.getPersistentData().contains(RECEPTION_TAG)) {
            return;
        }
        Reception rec = ACTIVE.get(dead.getPersistentData().getInt(RECEPTION_TAG));
        if (rec != null && dead.getUUID().equals(rec.boss) && rec.endAt < 0) {
            FALLEN.add(rec.boss);
        }
    }

    // ================= 결과 =================

    private static void victory(MinecraftServer server, ServerLevel level, Reception rec, long now) {
        rec.victory = true;
        rec.endAt = now + RETURN_DELAY;
        int g = rec.guest.grade();
        int ahn = Grades.baseAhn(g) * 3;
        int rep = Grades.baseRep(g) * 2;
        List<Component> names = new ArrayList<>();
        for (UUID id : rec.participants.keySet()) {
            RequestManager.addAhn(server, id, ahn);
            RequestManager.addRep(server, id, rep);
            ServerPlayer p = server.getPlayerList().getPlayer(id);
            if (p != null) {
                names.add(p.getDisplayName());
                p.sendSystemMessage(Component.translatable("message.fixercity.reception_reward", String.format("%,d", ahn), rep)
                        .withStyle(ChatFormatting.GOLD));
                // 손님의 책: 참가자마다 한 권 (공방에서 빈 책장과 함께 제본하면 손님 책장이 된다)
                ItemStack book = new ItemStack(ModItems.guestBook(rec.guest));
                if (!p.getInventory().add(book)) {
                    p.drop(book, false);
                }
                p.sendSystemMessage(Component.translatable("message.fixercity.reception_book",
                        Component.translatable(ModItems.guestBook(rec.guest).getDescriptionId()).withStyle(ChatFormatting.LIGHT_PURPLE))
                        .withStyle(ChatFormatting.GRAY));
                p.sendSystemMessage(Component.translatable("message.fixercity.reception_return", RETURN_DELAY / 20)
                        .withStyle(ChatFormatting.GRAY));
            }
        }
        // 전리품: 참가자 수 + 1개
        List<ItemStack> pool = Shop.rewardPool(g);
        BlockPos c = rec.center;
        for (int i = 0; i < rec.participants.size() + 1 && !pool.isEmpty(); i++) {
            ItemStack stack = pool.get(level.random.nextInt(pool.size())).copy();
            level.addFreshEntity(new ItemEntity(level, c.getX() + 0.5, ARENA_Y + 1.5, c.getZ() + 8.5, stack));
        }
        level.playSound(null, c, SoundEvents.UI_TOAST_CHALLENGE_COMPLETE, SoundSource.PLAYERS, 2.0F, 1.0F);
        server.getPlayerList().broadcastSystemMessage(Component.translatable("message.fixercity.reception_clear_broadcast",
                net.minecraft.network.chat.ComponentUtils.formatList(names, Component.literal(", ")),
                Component.translatable(rec.guest.nameKey())).withStyle(ChatFormatting.GOLD), false);
    }

    private static void fail(MinecraftServer server, ServerLevel level, Reception rec, String key) {
        Entity boss = rec.boss == null ? null : level.getEntity(rec.boss);
        if (boss != null) {
            boss.discard();
        }
        for (UUID id : rec.participants.keySet()) {
            ServerPlayer p = server.getPlayerList().getPlayer(id);
            if (p != null) {
                p.sendSystemMessage(Component.translatable(key, Component.translatable(rec.guest.nameKey())).withStyle(ChatFormatting.DARK_RED));
            }
        }
        finish(server, level, rec);
    }

    /** 끝: 무대 안에 남은 참가자를 원래 자리로 돌려보내고, 남은 졸개·투사체를 치운다. */
    private static void finish(MinecraftServer server, ServerLevel level, Reception rec) {
        for (Map.Entry<UUID, Reception.ReturnPoint> e : rec.participants.entrySet()) {
            ServerPlayer p = server.getPlayerList().getPlayer(e.getKey());
            if (p != null && rec.isInside(p)) {
                sendBack(server, p, e.getValue());
            }
        }
        clearEntities(level, rec);
        if (rec.boss != null) {
            FALLEN.remove(rec.boss);
        }
        ACTIVE.remove(rec.slot);
    }

    private static void sendBack(MinecraftServer server, ServerPlayer p, Reception.ReturnPoint rp) {
        ServerLevel dest = rp == null ? null : server.getLevel(rp.dimension());
        if (dest == null) {
            dest = server.overworld();
            BlockPos s = dest.getSharedSpawnPos();
            p.teleportTo(dest, s.getX() + 0.5, s.getY(), s.getZ() + 0.5, p.getYRot(), 0F);
            return;
        }
        p.teleportTo(dest, rp.pos().x, rp.pos().y, rp.pos().z, rp.yaw(), 0F);
    }

    /**
     * 지난 접대의 찌꺼기 정리. 모두 쓰러져 실패하면 무대 청크가 내려가서 손님을 치우지 못하고 저장된다.
     * 그런 손님·졸개·아이템이 나중에 다시 불러와질 때 여기서 없앤다:
     * 접대 태그가 붙은 손님은 지금 그 자리에서 진행 중인 같은 접대의 것만, 그 밖의 것은 진행 중인 무대 범위 안에서만 남긴다.
     */
    @SubscribeEvent
    public static void onEntityJoin(EntityJoinLevelEvent event) {
        Entity e = event.getEntity();
        if (e instanceof Player || event.getLevel().dimension() != STAGE) {
            return;
        }
        if (e.getPersistentData().contains(RECEPTION_TAG)) {
            Reception rec = ACTIVE.get(e.getPersistentData().getInt(RECEPTION_TAG));
            if (rec == null || rec.startTime != e.getPersistentData().getLong(RECEPTION_START_TAG)) {
                event.setCanceled(true);
            }
            return;
        }
        for (Reception rec : ACTIVE.values()) {
            if (rec.inArea(e.getX(), e.getZ())) {
                return;
            }
        }
        event.setCanceled(true);
    }

    /** 접대 중이 아닌데 접대실에 남아 있으면 (서버 재시작 등) 스폰으로 보낸다. */
    @SubscribeEvent
    public static void onLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.getEntity() instanceof ServerPlayer p && p.level().dimension() == STAGE && receptionOf(p) == null) {
            sendBack(p.server, p, null);
        }
    }

    public static int activeCount() {
        return ACTIVE.size();
    }

    // ================= CI 점검 =================

    /**
     * 모든 무대를 지어 보고, 보스 모드가 있으면 손님을 하나씩 들여 본 뒤 치운다.
     * 손님의 저장 데이터(NBT) 중 짧은 값은 로그로 남겨, 깨어나게 하는 값 등을 확인할 수 있게 한다.
     */
    public static void smoke(MinecraftServer server, org.slf4j.Logger log) {
        ServerLevel stage = server.getLevel(STAGE);
        if (stage == null) {
            log.error("fixercity smoke: reception dimension is missing");
            return;
        }
        BlockPos center = new BlockPos((MAX_SLOTS - 1) * SPACING, ARENA_Y, 0);
        for (Stage s : Stage.values()) {
            s.build(stage, center);
        }
        if (!Guest.bossModLoaded()) {
            log.info("fixercity smoke: library receptions OK ({} stages, boss mod not installed)", Stage.values().length);
            return;
        }
        List<String> ids = new ArrayList<>();
        for (net.minecraft.resources.ResourceLocation id : BuiltInRegistries.ENTITY_TYPE.keySet()) {
            if (id.getNamespace().equals(Guest.BOSS_MOD)) {
                ids.add(id.getPath());
            }
        }
        java.util.Collections.sort(ids);
        log.info("fixercity smoke: {} entities: {}", Guest.BOSS_MOD, ids);
        int ok = 0;
        for (Guest g : Guest.values()) {
            if (!g.available()) {
                log.error("fixercity smoke: guest {} has no entity {}", g.id(), g.entityId());
                continue;
            }
            Reception rec = new Reception(MAX_SLOTS - 1, g, center);
            rec.startTime = stage.getGameTime() + g.ordinal();
            prepareStage(stage, rec);
            ACTIVE.put(rec.slot, rec);
            LivingEntity boss = spawnGuest(stage, rec, 2);
            if (boss == null || !boss.isAlive()) {
                log.error("fixercity smoke: guest {} could not be spawned", g.id());
            } else {
                CompoundTag tag = new CompoundTag();
                boss.saveWithoutId(tag);
                StringBuilder sb = new StringBuilder();
                for (String key : tag.getAllKeys()) {
                    net.minecraft.nbt.Tag t = tag.get(key);
                    if (t instanceof NumericTag || (t instanceof StringTag st && st.getAsString().length() < 40)) {
                        sb.append(key).append('=').append(t.getAsString()).append(' ');
                    }
                }
                log.info("fixercity smoke: guest {} hp={} nbt: {}", g.id(), boss.getMaxHealth(), sb.toString().trim());
                ok++;
            }
            ACTIVE.remove(rec.slot);
            clearEntities(stage, rec);
            // 끝난 접대의 손님이 다시 들어오면 막혀야 한다
            if (boss != null) {
                Entity stale = g.entityType().get().create(stage);
                if (stale != null) {
                    stale.moveTo(center.getX() + 0.5, ARENA_Y, center.getZ() + 0.5, 0F, 0F);
                    stale.getPersistentData().putInt(RECEPTION_TAG, rec.slot);
                    stale.getPersistentData().putLong(RECEPTION_START_TAG, rec.startTime);
                    if (stage.addFreshEntity(stale)) {
                        log.error("fixercity smoke: stale guest from a finished reception was not removed");
                        stale.discard();
                    }
                }
            }
        }
        if (Shop.rewardPool(1).isEmpty() || Shop.rewardPool(8).isEmpty()) {
            log.error("fixercity smoke: empty reception reward pool");
        }
        log.info("fixercity smoke: library receptions OK ({} stages, {}/{} guests)", Stage.values().length, ok, Guest.values().length);
    }
}
