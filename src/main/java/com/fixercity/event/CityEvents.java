package com.fixercity.event;

import com.fixercity.reception.ReceptionManager;
import com.fixercity.request.FixerSavedData;
import com.fixercity.request.RequestManager;
import com.fixercity.request.RequestType;
import com.fixercity.request.Shop;
import com.mojang.brigadier.arguments.StringArgumentType;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.Commands;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundSetSubtitleTextPacket;
import net.minecraft.network.protocol.game.ClientboundSetTitleTextPacket;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerBossEvent;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.BossEvent;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;

/**
 * 도시 이벤트. 마인크래프트 하루~하루 반마다 하나가 무작위로 일어난다. 화면 위 바에 이름과 남은 시간이 보인다.
 */
public final class CityEvents {
    public enum Type {
        /** 뒷골목의 밤: 밤에만. 바깥(하늘이 보이는 곳)에 있으면 청소부가 몰려온다. 처치당 60안. */
        BACKSTREET_NIGHT("backstreet_night", 6000, BossEvent.BossBarColor.PURPLE, 20),
        /** 현상금 사냥 기간: 현상금 의뢰 보수 2배. */
        BOUNTY_RUSH("bounty_rush", 24000, BossEvent.BossBarColor.RED, 15),
        /** 협회 평가 기간: 모든 의뢰 평판 1.5배. */
        ASSOCIATION_REVIEW("association_review", 24000, BossEvent.BossBarColor.BLUE, 15),
        /** 공방 특가: 상점·공방 가격 30% 할인. */
        WORKSHOP_SALE("workshop_sale", 24000, BossEvent.BossBarColor.GREEN, 15),
        /** 조직 습격: 한 플레이어 근처에 조직원 무리가 쳐들어온다. 처치당 40안. */
        SYNDICATE_RAID("syndicate_raid", 6000, BossEvent.BossBarColor.RED, 20),
        /** 뒤틀림 발생: 어딘가에 강력한 뒤틀린 자가 나타난다. 쓰러뜨리면 주변 플레이어가 큰 보상. */
        DISTORTION("distortion", 12000, BossEvent.BossBarColor.WHITE, 15);

        final String id;
        final int duration;
        final BossEvent.BossBarColor color;
        final int weight;

        Type(String id, int duration, BossEvent.BossBarColor color, int weight) {
            this.id = id;
            this.duration = duration;
            this.color = color;
            this.weight = weight;
        }

        public String id() {
            return id;
        }

        public static Type byId(String id) {
            for (Type t : values()) {
                if (t.id.equals(id)) {
                    return t;
                }
            }
            return null;
        }
    }

    /** 이벤트 몹 태그: 값 = 처치 보상(안). */
    public static final String EVENT_TAG = "fixercity_event";
    public static final String DISTORTION_TAG = "fixercity_distortion";
    private static ServerBossEvent bar;
    private static final List<UUID> SPAWNED = new ArrayList<>();

    private CityEvents() {}

    public static Type active(MinecraftServer server) {
        return Type.byId(RequestManager.data(server).eventId);
    }

    public static float ahnMultiplier(MinecraftServer server, RequestType type) {
        return active(server) == Type.BOUNTY_RUSH && type == RequestType.BOUNTY ? 2.0F : 1.0F;
    }

    public static float repMultiplier(MinecraftServer server) {
        return active(server) == Type.ASSOCIATION_REVIEW ? 1.5F : 1.0F;
    }

    public static float priceMultiplier(MinecraftServer server) {
        return active(server) == Type.WORKSHOP_SALE ? 0.7F : 1.0F;
    }

    private static List<ServerPlayer> fieldPlayers(MinecraftServer server) {
        List<ServerPlayer> list = new ArrayList<>();
        for (ServerPlayer p : server.getPlayerList().getPlayers()) {
            if (p.level().dimension() != ReceptionManager.STAGE && !p.isSpectator()) {
                list.add(p);
            }
        }
        return list;
    }

    private static boolean isNight(ServerLevel level) {
        long t = level.getDayTime() % 24000;
        return t >= 13000 && t <= 22500;
    }

    // ================= 진행 =================

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        MinecraftServer server = event.getServer();
        long now = server.overworld().getGameTime();
        if (now % 20 != 0) {
            return;
        }
        FixerSavedData data = RequestManager.data(server);
        if (data.nextEventAt == 0) {
            data.nextEventAt = now + 12000;
            data.setDirty();
        }
        Type type = active(server);
        if (type != null) {
            if (now >= data.eventEnd) {
                end(server, "message.fixercity.event_ended");
                return;
            }
            ensureBar(server, type);
            bar.setProgress(Math.max(0, Math.min(1, (data.eventEnd - now) / (float) type.duration)));
            for (ServerPlayer p : server.getPlayerList().getPlayers()) {
                bar.addPlayer(p);
            }
            tickEvent(server, type, now);
        } else if (now >= data.nextEventAt && !fieldPlayers(server).isEmpty()) {
            Type pick = pick(server, server.overworld().random);
            if (pick != null) {
                start(server, pick);
            }
        }
    }

    private static Type pick(MinecraftServer server, RandomSource random) {
        List<Type> pool = new ArrayList<>();
        int total = 0;
        for (Type t : Type.values()) {
            if (t == Type.BACKSTREET_NIGHT && !isNight(server.overworld())) {
                continue;
            }
            pool.add(t);
            total += t.weight;
        }
        int roll = random.nextInt(Math.max(1, total));
        for (Type t : pool) {
            roll -= t.weight;
            if (roll < 0) {
                return t;
            }
        }
        return null;
    }

    private static void ensureBar(MinecraftServer server, Type type) {
        if (bar == null) {
            bar = new ServerBossEvent(Component.translatable("event.fixercity." + type.id).withStyle(ChatFormatting.BOLD),
                    type.color, BossEvent.BossBarOverlay.PROGRESS);
        }
    }

    public static void start(MinecraftServer server, Type type) {
        if (active(server) != null) {
            end(server, "message.fixercity.event_ended");
        }
        FixerSavedData data = RequestManager.data(server);
        long now = server.overworld().getGameTime();
        data.eventId = type.id;
        data.eventEnd = now + type.duration;
        data.setDirty();
        SPAWNED.clear();
        ensureBar(server, type);

        Component title = Component.translatable("event.fixercity." + type.id).withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD);
        Component desc = Component.translatable("event.fixercity." + type.id + ".desc");
        for (ServerPlayer p : server.getPlayerList().getPlayers()) {
            p.connection.send(new ClientboundSetSubtitleTextPacket(desc));
            p.connection.send(new ClientboundSetTitleTextPacket(title));
            p.sendSystemMessage(Component.translatable("message.fixercity.event_started", title, desc).withStyle(ChatFormatting.YELLOW));
            p.level().playSound(null, p.blockPosition(), SoundEvents.BELL_BLOCK, SoundSource.AMBIENT, 1.0F, 0.7F);
        }

        List<ServerPlayer> field = fieldPlayers(server);
        if (field.isEmpty()) {
            return;
        }
        RandomSource random = server.overworld().random;
        ServerPlayer focus = field.get(random.nextInt(field.size()));
        ServerLevel level = focus.serverLevel();
        switch (type) {
            case SYNDICATE_RAID -> {
                BlockPos at = offset(random, focus.blockPosition(), 25, 40);
                data.eventPos = at.asLong();
                int count = 6 + field.size() * 2;
                for (int i = 0; i < count; i++) {
                    EntityType<? extends Mob> t = random.nextInt(3) == 0 ? EntityType.PILLAGER : EntityType.VINDICATOR;
                    Mob mob = spawn(level, t, offset(random, at, 0, 6), 40, Component.translatable("event.fixercity.raider"));
                    if (mob != null) {
                        mob.setTarget(focus);
                    }
                }
                broadcast(server, Component.translatable("message.fixercity.raid_at", focus.getDisplayName(), at.getX(), at.getZ())
                        .withStyle(ChatFormatting.RED));
            }
            case DISTORTION -> {
                BlockPos at = offset(random, focus.blockPosition(), 80, 150);
                data.eventPos = at.asLong();
                Mob mob = spawn(level, EntityType.RAVAGER, at, 0, Component.translatable("event.fixercity.distorted")
                        .withStyle(ChatFormatting.DARK_PURPLE, ChatFormatting.BOLD));
                if (mob != null) {
                    AttributeInstance hp = mob.getAttribute(Attributes.MAX_HEALTH);
                    if (hp != null) {
                        hp.setBaseValue(300 + 100 * (field.size() - 1));
                    }
                    mob.setHealth(mob.getMaxHealth());
                    mob.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, MobEffectInstance.INFINITE_DURATION, 0, false, false));
                    mob.getPersistentData().putBoolean(DISTORTION_TAG, true);
                }
                broadcast(server, Component.translatable("message.fixercity.distortion_at", at.getX(), at.getZ())
                        .withStyle(ChatFormatting.DARK_PURPLE));
            }
            default -> {
            }
        }
    }

    private static BlockPos offset(RandomSource random, BlockPos origin, int min, int max) {
        double a = random.nextDouble() * Math.PI * 2;
        int d = min + (max > min ? random.nextInt(max - min) : 0);
        return new BlockPos(origin.getX() + (int) (Math.cos(a) * d), origin.getY(), origin.getZ() + (int) (Math.sin(a) * d));
    }

    private static Mob spawn(ServerLevel level, EntityType<? extends Mob> type, BlockPos at, int reward, Component name) {
        Mob mob = com.fixercity.request.RequestMissions.spawnTagged(level, type, at.getX(), at.getZ(), EVENT_TAG, reward, 6);
        if (mob != null) {
            mob.setCustomName(name);
            mob.setCustomNameVisible(true);
            mob.addEffect(new MobEffectInstance(MobEffects.GLOWING, MobEffectInstance.INFINITE_DURATION, 0, false, false));
            SPAWNED.add(mob.getUUID());
        }
        return mob;
    }

    private static void tickEvent(MinecraftServer server, Type type, long now) {
        if (type == Type.BACKSTREET_NIGHT && now % 200 == 0) {
            for (ServerPlayer p : fieldPlayers(server)) {
                ServerLevel level = p.serverLevel();
                if (p.isCreative() || !level.canSeeSky(p.blockPosition())) {
                    continue;
                }
                int near = level.getEntitiesOfClass(Mob.class, p.getBoundingBox().inflate(32),
                        m -> m.getPersistentData().contains(EVENT_TAG)).size();
                if (near < 3) {
                    Mob mob = spawn(level, EntityType.VINDICATOR, offset(level.random, p.blockPosition(), 16, 24), 60,
                            Component.translatable("event.fixercity.sweeper").withStyle(ChatFormatting.DARK_GRAY));
                    if (mob != null) {
                        mob.setTarget(p);
                        mob.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, MobEffectInstance.INFINITE_DURATION, 0, false, false));
                    }
                }
            }
        }
        if (type == Type.SYNDICATE_RAID && now % 100 == 0 && !SPAWNED.isEmpty()) {
            boolean anyAlive = false;
            for (ServerLevel level : server.getAllLevels()) {
                for (UUID id : SPAWNED) {
                    if (level.getEntity(id) instanceof LivingEntity l && l.isAlive()) {
                        anyAlive = true;
                    }
                }
            }
            if (!anyAlive) {
                end(server, "message.fixercity.raid_repelled");
            }
        }
    }

    public static void end(MinecraftServer server, String messageKey) {
        FixerSavedData data = RequestManager.data(server);
        Type type = active(server);
        long now = server.overworld().getGameTime();
        data.eventId = "";
        data.nextEventAt = now + 24000 + server.overworld().random.nextInt(12000);
        data.setDirty();
        if (bar != null) {
            bar.removeAllPlayers();
            bar = null;
        }
        // 남은 청소부·습격대 정리 (뒤틀린 자는 남아 있으면 사라진다)
        for (ServerLevel level : server.getAllLevels()) {
            for (UUID id : SPAWNED) {
                Entity e = level.getEntity(id);
                if (e != null) {
                    e.discard();
                }
            }
        }
        SPAWNED.clear();
        if (type != null) {
            broadcast(server, Component.translatable(messageKey, Component.translatable("event.fixercity." + type.id))
                    .withStyle(ChatFormatting.GRAY));
        }
    }

    private static void broadcast(MinecraftServer server, Component msg) {
        server.getPlayerList().broadcastSystemMessage(msg, false);
    }

    @SubscribeEvent
    public static void onDeath(LivingDeathEvent event) {
        LivingEntity dead = event.getEntity();
        if (!(dead.level() instanceof ServerLevel level) || !dead.getPersistentData().contains(EVENT_TAG)) {
            return;
        }
        MinecraftServer server = level.getServer();
        int reward = dead.getPersistentData().getInt(EVENT_TAG);
        if (reward > 0 && event.getSource().getEntity() instanceof ServerPlayer killer) {
            RequestManager.addAhn(server, killer.getUUID(), reward);
            killer.displayClientMessage(Component.translatable("message.fixercity.event_bounty", reward).withStyle(ChatFormatting.GOLD), true);
        }
        if (dead.getPersistentData().getBoolean(DISTORTION_TAG)) {
            List<Player> near = level.getEntitiesOfClass(Player.class, dead.getBoundingBox().inflate(32), Player::isAlive);
            int share = near.isEmpty() ? 0 : 1500 / near.size();
            for (Player p : near) {
                RequestManager.addAhn(server, p.getUUID(), share);
                RequestManager.addRep(server, p.getUUID(), 150);
            }
            List<ItemStack> pool = Shop.rewardPool(4);
            for (int i = 0; i < 2 && !pool.isEmpty(); i++) {
                level.addFreshEntity(new ItemEntity(level, dead.getX(), dead.getY() + 1, dead.getZ(), pool.get(level.random.nextInt(pool.size())).copy()));
            }
            broadcast(server, Component.translatable("message.fixercity.distortion_down", share).withStyle(ChatFormatting.GOLD));
            SPAWNED.remove(dead.getUUID());
            end(server, "message.fixercity.event_ended");
        }
    }

    @SubscribeEvent
    public static void onRegisterCommands(RegisterCommandsEvent event) {
        event.getDispatcher().register(Commands.literal("event").executes(ctx -> {
            MinecraftServer server = ctx.getSource().getServer();
            Type type = active(server);
            if (type == null) {
                ctx.getSource().sendSuccess(() -> Component.translatable("message.fixercity.no_event").withStyle(ChatFormatting.GRAY), false);
            } else {
                long left = RequestManager.data(server).eventEnd - server.overworld().getGameTime();
                ctx.getSource().sendSuccess(() -> Component.translatable("message.fixercity.event_status",
                        Component.translatable("event.fixercity." + type.id), Component.translatable("event.fixercity." + type.id + ".desc"),
                        left / 1200).withStyle(ChatFormatting.YELLOW), false);
            }
            return 1;
        }));
        event.getDispatcher().register(Commands.literal("fixeradmin").requires(s -> s.hasPermission(2))
                .then(Commands.literal("event").then(Commands.argument("type", StringArgumentType.word())
                        .suggests((ctx, b) -> {
                            for (Type t : Type.values()) {
                                b.suggest(t.id);
                            }
                            b.suggest("stop");
                            return b.buildFuture();
                        })
                        .executes(ctx -> {
                            String id = StringArgumentType.getString(ctx, "type");
                            MinecraftServer server = ctx.getSource().getServer();
                            if (id.equals("stop")) {
                                end(server, "message.fixercity.event_ended");
                                return 1;
                            }
                            Type t = Type.byId(id);
                            if (t == null) {
                                return 0;
                            }
                            start(server, t);
                            return 1;
                        }))));
    }

    /** CI 점검: 모든 이벤트를 시작·종료해 본다 (플레이어 없이). */
    public static void smoke(MinecraftServer server, org.slf4j.Logger log) {
        for (Type t : Type.values()) {
            start(server, t);
            tickEvent(server, t, 200);
            end(server, "message.fixercity.event_ended");
        }
        RequestManager.data(server).nextEventAt = 0;
        log.info("fixercity smoke: city events OK");
    }
}
