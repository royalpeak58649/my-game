package com.fixercity.reception;

import com.fixercity.FixerCity;
import com.fixercity.registry.ModItems;
import com.fixercity.request.Grades;
import com.fixercity.request.RequestManager;
import com.fixercity.request.Shop;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MobSpawnType;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;

/**
 * 도서관의 접대.
 * 초대장을 쓰면 근처(8칸) 플레이어와 함께 도서관 차원의 투기장으로 이동해 그 층의 사서와 싸운다.
 * 이기면 보상을 받고 10초 뒤 원래 자리로, 모두 쓰러지면 (= 책이 되면) 실패.
 */
public final class ReceptionManager {
    public static final ResourceKey<Level> LIBRARY = ResourceKey.create(Registries.DIMENSION, FixerCity.id("library"));
    public static final String RECEPTION_TAG = "fixercity_reception";
    private static final int MAX_SLOTS = 32;
    private static final int ARENA_Y = 100;
    private static final int HALF = 15;
    private static final int TIME_LIMIT = 20 * 60 * 15;
    private static final Map<Integer, Reception> ACTIVE = new HashMap<>();

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

    public static boolean start(ServerPlayer leader, LibraryFloor floor) {
        MinecraftServer server = leader.server;
        ServerLevel library = server.getLevel(LIBRARY);
        if (library == null) {
            return false;
        }
        if (receptionOf(leader) != null || leader.level().dimension() == LIBRARY) {
            leader.sendSystemMessage(Component.translatable("message.fixercity.reception_busy").withStyle(ChatFormatting.RED));
            return false;
        }
        int slot = -1;
        for (int i = 0; i < MAX_SLOTS; i++) {
            if (!ACTIVE.containsKey(i)) {
                slot = i;
                break;
            }
        }
        if (slot < 0) {
            leader.sendSystemMessage(Component.translatable("message.fixercity.reception_full").withStyle(ChatFormatting.RED));
            return false;
        }
        BlockPos center = new BlockPos(slot * 512, ARENA_Y, 0);
        Reception rec = new Reception(slot, floor, center);
        List<ServerPlayer> party = new ArrayList<>();
        party.add(leader);
        for (ServerPlayer other : leader.serverLevel().getEntitiesOfClass(ServerPlayer.class, leader.getBoundingBox().inflate(8.0),
                p -> p != leader && !p.isSpectator() && receptionOf(p) == null)) {
            party.add(other);
        }
        buildArena(library, center, floor);
        rec.startTime = library.getGameTime();
        for (int i = 0; i < party.size(); i++) {
            ServerPlayer p = party.get(i);
            rec.participants.put(p.getUUID(), new Reception.ReturnPoint(p.level().dimension(), p.position(), p.getYRot()));
            p.teleportTo(library, center.getX() + 0.5 + (i % 4 - 1.5) * 2, ARENA_Y + 1, center.getZ() + 11.5, 180F, 0F);
            rec.bar.addPlayer(p);
        }
        spawnEnemies(library, rec, party.size());
        ACTIVE.put(slot, rec);

        Component floorName = Component.translatable(floor.floorKey()).withStyle(ChatFormatting.GOLD);
        for (ServerPlayer p : party) {
            p.sendSystemMessage(Component.translatable("message.fixercity.reception_start", floorName).withStyle(ChatFormatting.YELLOW));
            p.sendSystemMessage(Component.translatable("message.fixercity.reception_rule").withStyle(ChatFormatting.GRAY));
        }
        library.playSound(null, center, SoundEvents.BELL_BLOCK, SoundSource.HOSTILE, 3.0F, 0.6F);
        return true;
    }

    /** 책장으로 둘러싸인 31x31 투기장. 층마다 카펫 색이 다르다. */
    public static void buildArena(ServerLevel level, BlockPos c, LibraryFloor floor) {
        // 남은 몹/아이템 정리
        for (Entity e : level.getEntities((Entity) null, new AABB(c).inflate(HALF + 4, 16, HALF + 4), e -> !(e instanceof Player))) {
            e.discard();
        }
        BlockState floorBlock = Blocks.DARK_OAK_PLANKS.defaultBlockState();
        BlockState carpet = floor.carpet().defaultBlockState();
        BlockState shelf = Blocks.BOOKSHELF.defaultBlockState();
        BlockState pillar = Blocks.STRIPPED_DARK_OAK_LOG.defaultBlockState();
        BlockState air = Blocks.AIR.defaultBlockState();
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (int dx = -HALF - 1; dx <= HALF + 1; dx++) {
            for (int dz = -HALF - 1; dz <= HALF + 1; dz++) {
                boolean wall = Math.abs(dx) == HALF + 1 || Math.abs(dz) == HALF + 1;
                level.setBlock(pos.set(c.getX() + dx, ARENA_Y - 1, c.getZ() + dz), floorBlock, 2);
                for (int y = 0; y <= 9; y++) {
                    BlockState s;
                    if (y == 9) {
                        s = (Math.floorMod(dx, 5) == 0 && Math.floorMod(dz, 5) == 0) ? Blocks.GLOWSTONE.defaultBlockState()
                                : Blocks.DARK_OAK_PLANKS.defaultBlockState();
                    } else if (wall) {
                        s = Math.floorMod(dx + dz, 6) == 0 ? pillar : shelf;
                    } else if (y == 0) {
                        boolean ring = Math.max(Math.abs(dx), Math.abs(dz)) == 10 || dx == 0 || dz == 0;
                        s = ring ? carpet : air;
                    } else {
                        s = air;
                    }
                    level.setBlock(pos.set(c.getX() + dx, ARENA_Y + y, c.getZ() + dz), s, 2);
                }
            }
        }
        // 네 모서리 촛대
        int[][] corners = {{-12, -12}, {12, -12}, {-12, 12}, {12, 12}};
        for (int[] k : corners) {
            level.setBlock(pos.set(c.getX() + k[0], ARENA_Y, c.getZ() + k[1]), Blocks.BOOKSHELF.defaultBlockState(), 2);
            level.setBlock(pos.set(c.getX() + k[0], ARENA_Y + 1, c.getZ() + k[1]), Blocks.LANTERN.defaultBlockState(), 2);
        }
    }

    private static void setBase(Mob mob, net.minecraft.core.Holder<Attribute> attr, double value) {
        AttributeInstance inst = mob.getAttribute(attr);
        if (inst != null) {
            inst.setBaseValue(value);
        }
    }

    public static void spawnEnemies(ServerLevel level, Reception rec, int partySize) {
        LibraryFloor f = rec.floor;
        double scale = 1.0 + 0.5 * (partySize - 1);
        for (int i = 0; i < f.bossCount(); i++) {
            Mob boss = f.bossType().create(level);
            if (boss == null) {
                continue;
            }
            double x = rec.center.getX() + 0.5 + (i * 4 - (f.bossCount() - 1) * 2);
            boss.moveTo(x, ARENA_Y + 1, rec.center.getZ() - 9.5, 0F, 0F);
            boss.finalizeSpawn(level, level.getCurrentDifficultyAt(rec.center), MobSpawnType.EVENT, null);
            List<Item> weapons = f.weapons();
            if (!weapons.isEmpty()) {
                boss.setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(weapons.get(0)));
            }
            boss.setDropChance(EquipmentSlot.MAINHAND, 0F);
            setBase(boss, Attributes.MAX_HEALTH, f.health() * scale);
            setBase(boss, Attributes.ATTACK_DAMAGE, f.attack());
            setBase(boss, Attributes.ARMOR, 6);
            setBase(boss, Attributes.KNOCKBACK_RESISTANCE, 0.7);
            setBase(boss, Attributes.FOLLOW_RANGE, 48);
            boss.setHealth(boss.getMaxHealth());
            Component name = f.bossCount() > 1
                    ? Component.translatable(f.librarianKey()).append(Component.literal(i == 0 ? " A" : " B"))
                    : Component.translatable(f.librarianKey());
            boss.setCustomName(name.copy().withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD));
            boss.setCustomNameVisible(true);
            prepare(boss, rec);
            level.addFreshEntity(boss);
            rec.enemies.add(boss.getUUID());
            Reception.BossState state = new Reception.BossState();
            state.nextSkillAt = level.getGameTime() + 60;
            rec.bosses.put(boss.getUUID(), state);
        }
        for (int i = 0; i < f.assistants(); i++) {
            spawnAssistant(level, rec, rec.center.getX() + 0.5 + (i == 0 ? 5 : -5), rec.center.getZ() - 7.5);
        }
    }

    private static void prepare(Mob mob, Reception rec) {
        mob.setPersistenceRequired();
        mob.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, MobEffectInstance.INFINITE_DURATION, 0, false, false));
        mob.getPersistentData().putInt(RECEPTION_TAG, rec.slot);
        mob.getPersistentData().putString(RequestManager.PAGE_TAG, rec.floor.resistPage());
    }

    /** 보조 사서 (층의 사서를 돕는 졸개). */
    public static void spawnAssistant(ServerLevel level, Reception rec, double x, double z) {
        Mob mob = EntityType.VINDICATOR.create(level);
        if (mob == null) {
            return;
        }
        mob.moveTo(x, ARENA_Y + 1, z, 0F, 0F);
        mob.finalizeSpawn(level, level.getCurrentDifficultyAt(rec.center), MobSpawnType.EVENT, null);
        mob.setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(ModItems.FIXER_LONGSWORD.get()));
        mob.setDropChance(EquipmentSlot.MAINHAND, 0F);
        setBase(mob, Attributes.MAX_HEALTH, 30 + (9 - rec.floor.grade()) * 8);
        setBase(mob, Attributes.ATTACK_DAMAGE, 2 + (9 - rec.floor.grade()) / 2.0);
        mob.setHealth(mob.getMaxHealth());
        mob.setCustomName(Component.translatable("librarian.fixercity.assistant", Component.translatable(rec.floor.floorKey()))
                .withStyle(ChatFormatting.YELLOW));
        prepare(mob, rec);
        level.addFreshEntity(mob);
        rec.enemies.add(mob.getUUID());
    }

    // ================= 진행 =================

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        if (ACTIVE.isEmpty()) {
            return;
        }
        MinecraftServer server = event.getServer();
        ServerLevel library = server.getLevel(LIBRARY);
        if (library == null) {
            return;
        }
        long now = library.getGameTime();
        for (Reception rec : new ArrayList<>(ACTIVE.values())) {
            if (rec.endAt >= 0) {
                if (now >= rec.endAt) {
                    finish(server, rec);
                }
                continue;
            }
            if (now % 5 == 0) {
                for (Map.Entry<UUID, Reception.BossState> e : rec.bosses.entrySet()) {
                    if (library.getEntity(e.getKey()) instanceof Mob boss && boss.isAlive()) {
                        bossTick(library, rec, boss, e.getValue(), now);
                    }
                }
            }
            if (now % 20 == 0) {
                slowTick(server, library, rec, now);
            }
        }
    }

    private static Player nearestInside(ServerLevel level, Reception rec, Mob from) {
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

    private static void bossTick(ServerLevel level, Reception rec, Mob boss, Reception.BossState st, long now) {
        Player target = nearestInside(level, rec, boss);
        if (target == null) {
            return;
        }
        if (boss.getTarget() != target) {
            boss.setTarget(target);
        }
        // 감정 격화: 체력 50% 아래
        if (!st.enraged && boss.getHealth() < boss.getMaxHealth() * 0.5F) {
            st.enraged = true;
            boss.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, MobEffectInstance.INFINITE_DURATION, 0, false, true));
            boss.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, MobEffectInstance.INFINITE_DURATION, 0, false, true));
            level.sendParticles(net.minecraft.core.particles.ParticleTypes.FLAME, boss.getX(), boss.getY() + 1, boss.getZ(), 40, 0.6, 1, 0.6, 0.05);
            level.playSound(null, boss.getX(), boss.getY(), boss.getZ(), SoundEvents.RAVAGER_ROAR, SoundSource.HOSTILE, 1.5F, 0.8F);
            broadcastInside(level, rec, Component.translatable("message.fixercity.reception_enraged", boss.getDisplayName())
                    .withStyle(ChatFormatting.RED, ChatFormatting.BOLD));
        }
        float atk = (float) (rec.floor.attack() * (st.enraged ? 1.25 : 1.0));
        if (st.pending != null) {
            if (now >= st.pendingAt) {
                Entity pt = st.pendingTarget == null ? null : level.getEntity(st.pendingTarget);
                st.pending.perform(level, boss, pt instanceof Player p && p.isAlive() ? p : target, atk, rec);
                st.pending = null;
                st.nextSkillAt = now + (st.enraged ? 25 : 40);
            }
            return;
        }
        if (now < st.nextSkillAt) {
            return;
        }
        List<BossSkill> skills = new ArrayList<>(rec.floor.skills());
        Collections.shuffle(skills, new java.util.Random(now ^ boss.getId()));
        double dist = Math.sqrt(boss.distanceToSqr(target));
        for (BossSkill s : skills) {
            if (st.ready.getOrDefault(s, 0L) <= now && dist <= s.range()) {
                st.pending = s;
                st.pendingAt = now + BossSkill.WINDUP;
                st.pendingTarget = target.getUUID();
                st.ready.put(s, now + Math.round(s.cooldown() * (st.enraged ? 0.6 : 1.0)));
                List<Item> weapons = rec.floor.weapons();
                if (weapons.size() > 1) {
                    st.weaponIndex = (st.weaponIndex + 1) % weapons.size();
                    boss.setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(weapons.get(st.weaponIndex)));
                }
                s.telegraph(level, boss);
                for (Player p : level.players()) {
                    if (rec.isParticipant(p) && rec.isInside(p)) {
                        p.displayClientMessage(Component.translatable("message.fixercity.boss_skill", boss.getDisplayName(),
                                Component.translatable(s.key()).withStyle(ChatFormatting.RED)), true);
                    }
                }
                return;
            }
        }
    }

    private static void broadcastInside(ServerLevel level, Reception rec, Component msg) {
        for (Player p : level.players()) {
            if (rec.isParticipant(p)) {
                p.sendSystemMessage(msg);
            }
        }
    }

    private static void slowTick(MinecraftServer server, ServerLevel level, Reception rec, long now) {
        // 보스바: 사서 전체 체력
        float hp = 0;
        float max = 0;
        List<Mob> alive = rec.livingEnemies(level);
        for (Mob m : alive) {
            if (rec.bosses.containsKey(m.getUUID())) {
                hp += m.getHealth();
                max += m.getMaxHealth();
            }
        }
        rec.bar.setProgress(max <= 0 ? 0 : Math.max(0, Math.min(1, hp / max)));

        int inside = 0;
        for (UUID id : rec.participants.keySet()) {
            ServerPlayer p = server.getPlayerList().getPlayer(id);
            if (p != null && rec.isInside(p) && p.isAlive()) {
                inside++;
                rec.bar.addPlayer(p);
            } else if (p != null) {
                rec.bar.removePlayer(p);
            }
        }

        if (inside == 0) {
            // 아무도 안에 없으면 (모두 쓰러짐 = 책이 됨) 5초 뒤 실패. 이때는 청크가 내려갈 수 있어 적 수를 세지 않는다.
            if (rec.emptySince < 0) {
                rec.emptySince = now;
            } else if (now - rec.emptySince >= 100) {
                fail(server, level, rec, "message.fixercity.reception_failed");
            }
            return;
        }
        rec.emptySince = -1;
        rec.enemies.removeIf(id -> !(level.getEntity(id) instanceof Mob m && m.isAlive()));
        if (rec.enemies.isEmpty()) {
            victory(server, level, rec, now);
            return;
        }
        if (now - rec.startTime > TIME_LIMIT) {
            fail(server, level, rec, "message.fixercity.reception_timeout");
        }
    }

    // ================= 결과 =================

    private static void victory(MinecraftServer server, ServerLevel level, Reception rec, long now) {
        rec.victory = true;
        rec.endAt = now + 200;
        rec.bar.setName(Component.translatable("message.fixercity.reception_clear_bar"));
        rec.bar.setProgress(0);
        int g = rec.floor.grade();
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
            }
        }
        // 전리품: 참가자 수 + 1개
        List<ItemStack> pool = Shop.rewardPool(g);
        BlockPos c = rec.center;
        for (int i = 0; i < rec.participants.size() + 1 && !pool.isEmpty(); i++) {
            ItemStack stack = pool.get(level.random.nextInt(pool.size())).copy();
            level.addFreshEntity(new ItemEntity(level, c.getX() + 0.5, ARENA_Y + 1.5, c.getZ() + 0.5, stack));
        }
        level.playSound(null, c, SoundEvents.UI_TOAST_CHALLENGE_COMPLETE, SoundSource.PLAYERS, 2.0F, 1.0F);
        server.getPlayerList().broadcastSystemMessage(Component.translatable("message.fixercity.reception_clear_broadcast",
                net.minecraft.network.chat.ComponentUtils.formatList(names, Component.literal(", ")),
                Component.translatable(rec.floor.floorKey())).withStyle(ChatFormatting.GOLD), false);
    }

    private static void fail(MinecraftServer server, ServerLevel level, Reception rec, String key) {
        for (Mob m : rec.livingEnemies(level)) {
            m.discard();
        }
        for (UUID id : rec.participants.keySet()) {
            ServerPlayer p = server.getPlayerList().getPlayer(id);
            if (p != null) {
                p.sendSystemMessage(Component.translatable(key, Component.translatable(rec.floor.floorKey())).withStyle(ChatFormatting.DARK_RED));
            }
        }
        finish(server, rec);
    }

    /** 끝: 투기장 안에 남은 참가자를 원래 자리로 돌려보내고 정리. */
    private static void finish(MinecraftServer server, Reception rec) {
        for (Map.Entry<UUID, Reception.ReturnPoint> e : rec.participants.entrySet()) {
            ServerPlayer p = server.getPlayerList().getPlayer(e.getKey());
            if (p != null && rec.isInside(p)) {
                sendBack(server, p, e.getValue());
            }
        }
        rec.bar.removeAllPlayers();
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

    /** 접대 중이 아닌데 도서관에 남아 있으면 (서버 재시작 등) 스폰으로 보낸다. */
    @SubscribeEvent
    public static void onLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.getEntity() instanceof ServerPlayer p && p.level().dimension() == LIBRARY && receptionOf(p) == null) {
            sendBack(p.server, p, null);
        }
    }

    public static int activeCount() {
        return ACTIVE.size();
    }

    // ================= CI 점검 =================

    /** 모든 층의 투기장을 짓고 사서를 소환해 기술을 한 번씩 써 본 뒤 치운다. */
    public static void smoke(MinecraftServer server, org.slf4j.Logger log) {
        ServerLevel library = server.getLevel(LIBRARY);
        if (library == null) {
            log.error("fixercity smoke: library dimension is missing");
            return;
        }
        for (LibraryFloor floor : LibraryFloor.values()) {
            BlockPos center = new BlockPos((MAX_SLOTS - 1) * 512, ARENA_Y, 0);
            Reception rec = new Reception(MAX_SLOTS - 1, floor, center);
            buildArena(library, center, floor);
            spawnEnemies(library, rec, 2);
            List<Mob> enemies = rec.livingEnemies(library);
            if (enemies.size() < floor.bossCount()) {
                log.error("fixercity smoke: floor {} spawned {} enemies", floor.id(), enemies.size());
                continue;
            }
            Mob boss = enemies.get(0);
            Mob dummy = enemies.get(enemies.size() - 1);
            for (BossSkill s : floor.skills()) {
                s.telegraph(library, boss);
                s.perform(library, boss, dummy, floor.attack(), rec);
            }
            for (Mob m : rec.livingEnemies(library)) {
                m.discard();
            }
        }
        if (Shop.rewardPool(1).isEmpty() || Shop.rewardPool(8).isEmpty()) {
            log.error("fixercity smoke: empty reception reward pool");
        }
        log.info("fixercity smoke: library receptions OK ({} floors)", LibraryFloor.values().length);
    }
}
