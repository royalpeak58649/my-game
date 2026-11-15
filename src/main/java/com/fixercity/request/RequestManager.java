package com.fixercity.request;

import com.fixercity.accessory.Accessory;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPages;
import com.fixercity.registry.ModItems;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
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
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MobSpawnType;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.levelgen.Heightmap;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;

/** 의뢰·평판·돈의 규칙과 이벤트 처리. */
public final class RequestManager {
    public static final int POOL_SIZE = 6;
    /** 게시판의 열린 의뢰는 마인크래프트 하루마다 새로 바뀐다. */
    public static final int REFRESH_TICKS = 24000;
    private static final double TEAM_RADIUS = 8.0;
    private static final int BOARD_VISIT_TICKS = 1200;
    public static final String BOUNTY_TAG = "fixercity_bounty";
    public static final String PAGE_TAG = "fixercity_page";

    private record BoardVisit(BlockPos pos, ResourceKey<Level> dimension, long time) {}

    private static final Map<UUID, BoardVisit> VISITS = new HashMap<>();

    private RequestManager() {}

    // ================= 평판 / 돈 =================

    public static FixerSavedData data(MinecraftServer server) {
        return FixerSavedData.get(server);
    }

    public static int grade(MinecraftServer server, UUID uuid) {
        return Grades.gradeFor(data(server).profile(uuid).rep);
    }

    public static void addAhn(MinecraftServer server, UUID uuid, int delta) {
        FixerSavedData data = data(server);
        FixerSavedData.Profile p = data.profile(uuid);
        p.ahn = Math.max(0, p.ahn + delta);
        data.setDirty();
    }

    public static void addRep(MinecraftServer server, UUID uuid, int delta) {
        FixerSavedData data = data(server);
        FixerSavedData.Profile p = data.profile(uuid);
        int before = Grades.gradeFor(p.rep);
        p.rep = Math.max(0, p.rep + delta);
        int after = Grades.gradeFor(p.rep);
        data.setDirty();
        ServerPlayer player = server.getPlayerList().getPlayer(uuid);
        if (after != before && player != null) {
            if (after < before) {
                String key = after == Grades.COLOR ? "message.fixercity.promoted_color" : "message.fixercity.promoted";
                server.getPlayerList().broadcastSystemMessage(Component.translatable(key,
                        player.getDisplayName(), Grades.label(after)).withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD), false);
                player.level().playSound(null, player.getX(), player.getY(), player.getZ(),
                        SoundEvents.PLAYER_LEVELUP, SoundSource.PLAYERS, 1.0F, 1.0F);
            } else {
                player.sendSystemMessage(Component.translatable("message.fixercity.demoted", Grades.label(after)).withStyle(ChatFormatting.RED));
            }
            player.refreshDisplayName();
            player.refreshTabListName();
        }
    }

    // ================= 게시판 =================

    public static void recordBoardVisit(ServerPlayer player, BlockPos pos) {
        VISITS.put(player.getUUID(), new BoardVisit(pos, player.level().dimension(), player.level().getGameTime()));
    }

    /** 최근 1분 안에 게시판을 열었고 지금도 게시판 근처(8칸)에 있는지. */
    public static boolean nearBoard(ServerPlayer player) {
        BoardVisit v = VISITS.get(player.getUUID());
        return v != null && v.dimension() == player.level().dimension()
                && player.level().getGameTime() - v.time() <= BOARD_VISIT_TICKS
                && player.blockPosition().distSqr(v.pos()) <= 64;
    }

    public static BlockPos lastBoard(ServerPlayer player) {
        BoardVisit v = VISITS.get(player.getUUID());
        return v == null ? player.blockPosition() : v.pos();
    }

    /** 게시판을 열 때: 하루가 지났으면 열린 의뢰 교체, 부족하면 채운다. */
    public static void refillPool(ServerPlayer opener, BlockPos boardPos) {
        MinecraftServer server = opener.server;
        FixerSavedData data = data(server);
        long now = opener.level().getGameTime();
        if (now - data.lastFill > REFRESH_TICKS) {
            data.requests.removeIf(r -> r.state == Request.State.OPEN);
            data.lastFill = now;
        }
        RandomSource random = opener.getRandom();
        int g = grade(server, opener.getUUID());
        int open = data.open().size();
        for (int i = open; i < POOL_SIZE; i++) {
            int[] spread = {g + 1, g, g, g - 1};
            int requestGrade = Math.max(1, Math.min(9, spread[random.nextInt(spread.length)]));
            Request r = RequestGenerator.generate(random, data.nextId++, requestGrade, boardPos,
                    opener.level().dimension().location().toString());
            data.requests.add(r);
        }
        data.setDirty();
    }

    public static void forceRefresh(MinecraftServer server) {
        FixerSavedData data = data(server);
        data.requests.removeIf(r -> r.state == Request.State.OPEN);
        data.lastFill = 0;
        data.setDirty();
    }

    // ================= 수락 / 포기 / 보고 =================

    public static boolean accept(ServerPlayer player, int id) {
        MinecraftServer server = player.server;
        FixerSavedData data = data(server);
        if (!nearBoard(player)) {
            player.sendSystemMessage(Component.translatable("message.fixercity.need_board").withStyle(ChatFormatting.RED));
            return false;
        }
        if (data.activeFor(player.getUUID()) != null) {
            player.sendSystemMessage(Component.translatable("message.fixercity.already_active").withStyle(ChatFormatting.RED));
            return false;
        }
        Request r = data.find(id);
        if (r == null || r.state != Request.State.OPEN) {
            player.sendSystemMessage(Component.translatable("message.fixercity.request_gone").withStyle(ChatFormatting.RED));
            return false;
        }
        int g = grade(server, player.getUUID());
        if (r.grade < g - 1) {
            player.sendSystemMessage(Component.translatable("message.fixercity.grade_too_low", g - 1).withStyle(ChatFormatting.RED));
            return false;
        }
        // 게시판 근처에 있는, 의뢰가 없는 플레이어들이 함께 팀이 된다
        r.members.clear();
        r.members.add(player.getUUID());
        for (ServerPlayer other : player.serverLevel().getEntitiesOfClass(ServerPlayer.class,
                player.getBoundingBox().inflate(TEAM_RADIUS), p -> p != player && !p.isSpectator())) {
            if (data.activeFor(other.getUUID()) == null) {
                r.members.add(other.getUUID());
            }
        }
        // 같은 사무소원은 어디에 있든 (접속 중이면) 함께 참여
        Office office = data.officeOf(player.getUUID());
        if (office != null) {
            for (UUID m : office.members) {
                if (!r.members.contains(m) && server.getPlayerList().getPlayer(m) != null && data.activeFor(m) == null) {
                    r.members.add(m);
                }
            }
        }
        r.state = Request.State.ACTIVE;
        r.progress = 0;
        r.deadline = player.level().getGameTime() + r.type.duration();
        RequestMissions.onAccept(player, r, lastBoard(player));
        data.setDirty();

        List<Component> names = new ArrayList<>();
        for (UUID m : r.members) {
            ServerPlayer mp = server.getPlayerList().getPlayer(m);
            if (mp != null) {
                names.add(mp.getDisplayName());
            }
        }
        notifyMembers(server, r, Component.translatable("message.fixercity.accepted", RequestUi.title(r),
                net.minecraft.network.chat.ComponentUtils.formatList(names, Component.literal(", "))).withStyle(ChatFormatting.GREEN));
        notifyMembers(server, r, RequestUi.objective(r));
        player.level().playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.BOOK_PAGE_TURN, SoundSource.PLAYERS, 1.0F, 1.0F);
        return true;
    }

    public static void abandon(ServerPlayer player) {
        MinecraftServer server = player.server;
        FixerSavedData data = data(server);
        Request r = data.activeFor(player.getUUID());
        if (r == null) {
            player.sendSystemMessage(Component.translatable("message.fixercity.no_request").withStyle(ChatFormatting.RED));
            return;
        }
        fail(server, r, "message.fixercity.abandoned");
    }

    /** 게시판에서 보고: 끝난 의뢰는 보수 지급, 납품 의뢰는 인벤토리에서 물건을 넘긴다. */
    public static void report(ServerPlayer player) {
        MinecraftServer server = player.server;
        FixerSavedData data = data(server);
        Request r = data.activeFor(player.getUUID());
        if (r == null) {
            return;
        }
        if (r.state == Request.State.ACTIVE && r.type == RequestType.DELIVERY) {
            Item item = BuiltInRegistries.ITEM.get(ResourceLocation.parse(r.target));
            int have = player.getInventory().countItem(item);
            if (have < r.count) {
                player.sendSystemMessage(Component.translatable("message.fixercity.not_enough_items", have, r.count)
                        .withStyle(ChatFormatting.RED));
                return;
            }
            int left = r.count;
            for (int i = 0; i < player.getInventory().getContainerSize() && left > 0; i++) {
                ItemStack s = player.getInventory().getItem(i);
                if (s.is(item)) {
                    int n = Math.min(left, s.getCount());
                    s.shrink(n);
                    left -= n;
                }
            }
            r.progress = r.count;
            r.state = Request.State.DONE;
        }
        if (r.state == Request.State.ACTIVE && r.type == RequestType.RETRIEVAL) {
            if (!RequestMissions.takeBriefcase(player)) {
                player.sendSystemMessage(Component.translatable("message.fixercity.no_briefcase").withStyle(ChatFormatting.RED));
                return;
            }
            r.state = Request.State.DONE;
        }
        if (r.state == Request.State.DONE) {
            payout(server, r);
        }
    }

    /** 게시판을 열 때 끝난 의뢰가 있으면 자동 보고. */
    public static void reportIfDone(ServerPlayer player) {
        Request r = data(player.server).activeFor(player.getUUID());
        if (r != null && r.state == Request.State.DONE) {
            payout(player.server, r);
        }
    }

    private static void payout(MinecraftServer server, Request r) {
        FixerSavedData data = data(server);
        int totalAhn = Math.round(r.rewardAhn * com.fixercity.event.CityEvents.ahnMultiplier(server, r.type));
        int rep = Math.round(r.rewardRep * com.fixercity.event.CityEvents.repMultiplier(server));
        int share = Math.max(1, totalAhn / Math.max(1, r.members.size()));
        for (UUID m : r.members) {
            addAhn(server, m, share);
            addRep(server, m, rep);
        }
        data.requests.remove(r);
        data.setDirty();
        notifyMembers(server, r, Component.translatable("message.fixercity.paid", RequestUi.title(r), share, rep)
                .withStyle(ChatFormatting.GOLD));
        for (UUID m : r.members) {
            ServerPlayer p = server.getPlayerList().getPlayer(m);
            if (p != null) {
                p.level().playSound(null, p.getX(), p.getY(), p.getZ(), SoundEvents.EXPERIENCE_ORB_PICKUP, SoundSource.PLAYERS, 1.0F, 0.8F);
            }
        }
    }

    private static void fail(MinecraftServer server, Request r, String messageKey) {
        FixerSavedData data = data(server);
        int penalty = Math.max(5, r.rewardRep / 2);
        for (UUID m : r.members) {
            addRep(server, m, -penalty);
        }
        removeBounty(server, r);
        RequestMissions.cleanup(server, r);
        data.requests.remove(r);
        data.setDirty();
        notifyMembers(server, r, Component.translatable(messageKey, RequestUi.title(r), penalty).withStyle(ChatFormatting.RED));
    }

    public static void fail(MinecraftServer server, Request r) {
        fail(server, r, "message.fixercity.mission_failed");
    }

    static void complete(MinecraftServer server, Request r) {
        r.state = Request.State.DONE;
        r.progress = r.count;
        data(server).setDirty();
        notifyMembers(server, r, Component.translatable("message.fixercity.objective_done", RequestUi.title(r))
                .withStyle(ChatFormatting.GREEN, ChatFormatting.BOLD));
    }

    public static void notifyMembers(MinecraftServer server, Request r, Component message) {
        for (UUID m : r.members) {
            ServerPlayer p = server.getPlayerList().getPlayer(m);
            if (p != null) {
                p.sendSystemMessage(message);
            }
        }
    }

    // ================= 이벤트 =================

    @SubscribeEvent
    public static void onDeath(LivingDeathEvent event) {
        LivingEntity dead = event.getEntity();
        if (!(dead.level() instanceof ServerLevel level)) {
            return;
        }
        MinecraftServer server = level.getServer();
        FixerSavedData data = data(server);

        // 현상범 처치 (누가 잡든 완료)
        if (dead.getPersistentData().contains(BOUNTY_TAG)) {
            Request r = data.find(dead.getPersistentData().getInt(BOUNTY_TAG));
            String faction = dead.getPersistentData().getString(PAGE_TAG);
            dropBountyLoot(level, dead, faction);
            if (r != null && r.state == Request.State.ACTIVE) {
                complete(server, r);
            }
            return;
        }

        // 방어 습격대 / 호위 의뢰인
        if (RequestMissions.onDeath(server, data, dead)) {
            return;
        }

        // 해결사 사망: 평판 5% 감소
        if (dead instanceof ServerPlayer player) {
            FixerSavedData.Profile p = data.profile(player.getUUID());
            int loss = Math.min(p.rep, Math.max(5, p.rep / 20));
            if (loss > 0) {
                addRep(server, player.getUUID(), -loss);
                player.sendSystemMessage(Component.translatable("message.fixercity.death_penalty", loss).withStyle(ChatFormatting.DARK_RED));
            }
            return;
        }

        // 토벌 진행
        if (event.getSource().getEntity() instanceof ServerPlayer killer) {
            Request r = data.activeFor(killer.getUUID());
            if (r != null && r.state == Request.State.ACTIVE && r.type == RequestType.EXTERMINATION
                    && BuiltInRegistries.ENTITY_TYPE.getKey(dead.getType()).toString().equals(r.target)) {
                r.progress++;
                data.setDirty();
                if (r.progress >= r.count) {
                    complete(server, r);
                } else {
                    for (UUID m : r.members) {
                        ServerPlayer p = server.getPlayerList().getPlayer(m);
                        if (p != null) {
                            p.displayClientMessage(Component.translatable("message.fixercity.progress",
                                    dead.getType().getDescription(), r.progress, r.count).withStyle(ChatFormatting.YELLOW), true);
                        }
                    }
                }
            }
        }
    }

    @SubscribeEvent
    public static void onServerTick(ServerTickEvent.Post event) {
        MinecraftServer server = event.getServer();
        long tick = server.overworld().getGameTime();
        if (tick % 20 != 0) {
            return;
        }
        FixerSavedData data = data(server);
        for (Iterator<Request> it = new ArrayList<>(data.requests).iterator(); it.hasNext(); ) {
            Request r = it.next();
            if (r.state != Request.State.ACTIVE) {
                continue;
            }
            if (tick > r.deadline) {
                fail(server, r, "message.fixercity.expired");
                continue;
            }
            RequestMissions.tick(server, r);
            if (r.state != Request.State.ACTIVE) {
                continue;
            }
            if (r.type == RequestType.INVESTIGATION || (r.type == RequestType.BOUNTY && !r.bountySpawned)) {
                ServerLevel level = server.getLevel(ResourceKey.create(Registries.DIMENSION, ResourceLocation.parse(r.dimension)));
                if (level == null) {
                    continue;
                }
                for (UUID m : r.members) {
                    ServerPlayer p = server.getPlayerList().getPlayer(m);
                    if (p == null || p.level() != level) {
                        continue;
                    }
                    double dx = p.getX() - (r.pos.getX() + 0.5);
                    double dz = p.getZ() - (r.pos.getZ() + 0.5);
                    double dist2 = dx * dx + dz * dz;
                    if (r.type == RequestType.INVESTIGATION && dist2 <= 36) {
                        complete(server, r);
                        break;
                    }
                    if (r.type == RequestType.BOUNTY && dist2 <= 64 * 64) {
                        spawnBounty(level, r);
                        break;
                    }
                }
            }
        }
    }

    @SubscribeEvent
    public static void onNameFormat(PlayerEvent.NameFormat event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            event.setDisplayname(gradeTag(player).append(event.getDisplayname()));
        }
    }

    @SubscribeEvent
    public static void onTabListNameFormat(PlayerEvent.TabListNameFormat event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            net.minecraft.network.chat.MutableComponent name = gradeTag(player);
            Office office = data(player.server).officeOf(player.getUUID());
            if (office != null) {
                name.append(Component.literal("[" + office.name + "] ").withStyle(ChatFormatting.DARK_AQUA));
            }
            event.setDisplayName(name.append(player.getName().copy().withStyle(ChatFormatting.WHITE)));
        }
    }

    /** "[7급] " 또는 금색 "[특색] " 접두사. */
    public static net.minecraft.network.chat.MutableComponent gradeTag(ServerPlayer player) {
        int g = grade(player.server, player.getUUID());
        return Component.literal("[").append(Grades.label(g)).append("] ")
                .withStyle(g == Grades.COLOR ? ChatFormatting.GOLD : ChatFormatting.GRAY);
    }

    @SubscribeEvent
    public static void onLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            data(player.server).profile(player.getUUID());
            player.refreshDisplayName();
            player.refreshTabListName();
        }
    }

    // ================= 현상범 =================

    private static void spawnBounty(ServerLevel level, Request r) {
        String faction = r.target;
        EntityType<? extends Mob> type = switch (faction) {
            case "rat" -> EntityType.ZOMBIE;
            case "thumb", "full_stop" -> EntityType.PILLAGER;
            default -> EntityType.VINDICATOR;
        };
        Mob mob = type.create(level);
        if (mob == null) {
            return;
        }
        int x = r.pos.getX();
        int z = r.pos.getZ();
        int y = level.getHeight(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, x, z);
        BlockPos spawnPos = new BlockPos(x, y, z);
        mob.moveTo(x + 0.5, y, z + 0.5, level.random.nextFloat() * 360F, 0F);
        mob.finalizeSpawn(level, level.getCurrentDifficultyAt(spawnPos), MobSpawnType.EVENT, null);

        Item weapon = factionWeapon(faction);
        if (weapon != null && !"thumb".equals(faction) && !"full_stop".equals(faction)) {
            mob.setItemSlot(EquipmentSlot.MAINHAND, new ItemStack(weapon));
            mob.setDropChance(EquipmentSlot.MAINHAND, 0.0F);
        }
        double tier = 9 - r.grade;
        AttributeInstance hp = mob.getAttribute(Attributes.MAX_HEALTH);
        if (hp != null) {
            hp.setBaseValue(hp.getBaseValue() * (1.5 + tier * 0.6));
        }
        AttributeInstance dmg = mob.getAttribute(Attributes.ATTACK_DAMAGE);
        if (dmg != null) {
            dmg.setBaseValue(dmg.getBaseValue() * (1.0 + tier * 0.2));
        }
        mob.setHealth(mob.getMaxHealth());
        mob.setPersistenceRequired();
        mob.setCustomName(Component.translatable("bounty.fixercity." + faction).withStyle(ChatFormatting.RED));
        mob.setCustomNameVisible(true);
        mob.addEffect(new MobEffectInstance(MobEffects.GLOWING, MobEffectInstance.INFINITE_DURATION, 0, false, false));
        mob.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, MobEffectInstance.INFINITE_DURATION, 0, false, false));
        mob.getPersistentData().putInt(BOUNTY_TAG, r.id);
        mob.getPersistentData().putString(PAGE_TAG, faction);
        level.addFreshEntity(mob);

        r.bountySpawned = true;
        r.bountyEntity = mob.getUUID();
        r.pos = spawnPos;
        data(level.getServer()).setDirty();
        notifyMembers(level.getServer(), r, Component.translatable("message.fixercity.bounty_spotted",
                Component.translatable("bounty.fixercity." + faction)).withStyle(ChatFormatting.RED, ChatFormatting.BOLD));
    }

    private static void removeBounty(MinecraftServer server, Request r) {
        if (r.bountyEntity == null) {
            return;
        }
        ServerLevel level = server.getLevel(ResourceKey.create(Registries.DIMENSION, ResourceLocation.parse(r.dimension)));
        if (level != null) {
            Entity e = level.getEntity(r.bountyEntity);
            if (e != null) {
                e.discard();
            }
        }
    }

    public static Item factionWeapon(String faction) {
        return switch (faction) {
            case "rat" -> ModItems.RUSTY_PIPE.get();
            case "office_fixer" -> ModItems.FIXER_LONGSWORD.get();
            case "zwei" -> ModItems.ZWEI_GREATSWORD.get();
            case "shi" -> ModItems.SHI_BLADE.get();
            case "liu" -> ModItems.LIU_GAUNTLET.get();
            case "seven" -> ModItems.SEVEN_CANE.get();
            case "thumb" -> ModItems.THUMB_RIFLE.get();
            case "kurokumo" -> ModItems.KUROKUMO_BLADE.get();
            case "yun" -> ModItems.YUN_MACHETE.get();
            case "hook" -> ModItems.HOOK_BLADE.get();
            case "streetlight" -> ModItems.STREETLIGHT_STAFF.get();
            case "molar" -> ModItems.MOLAR_HAMMER.get();
            case "full_stop" -> ModItems.FULL_STOP_RIFLE.get();
            case "dawn" -> ModItems.DAWN_SWORD.get();
            case "gaze" -> ModItems.GAZE_RAPIER.get();
            case "wedge" -> ModItems.WEDGE_SPEAR.get();
            case "workshop" -> ModItems.WORKSHOP_HALBERD.get();
            case "jeong" -> ModItems.JEONG_TWIN_BLADES.get();
            case "w_corp" -> ModItems.W_CORP_BATON.get();
            case "warp" -> ModItems.WARP_BLADE.get();
            case "smiling" -> ModItems.SMILING_MAW.get();
            case "index" -> ModItems.INDEX_BLADE.get();
            case "philip" -> ModItems.PHILIP_SWORD.get();
            default -> null;
        };
    }

    /** 현상범 전리품: 35% 책장, 30% 조직 무기, 25% 장신구 (각각 따로 굴림) + 탄환. */
    private static void dropBountyLoot(ServerLevel level, LivingEntity dead, String faction) {
        RandomSource random = level.random;
        List<ItemStack> drops = new ArrayList<>();
        KeyPage page = KeyPages.byId(faction);
        if (page != null && random.nextFloat() < 0.35F) {
            drops.add(new ItemStack(ModItems.keyPageItem(page)));
        }
        Item weapon = factionWeapon(faction);
        if (weapon != null && random.nextFloat() < 0.30F) {
            drops.add(new ItemStack(weapon));
        }
        for (Accessory a : Accessory.values()) {
            if (a.resonancePage().equals(faction) && random.nextFloat() < 0.25F) {
                drops.add(new ItemStack(ModItems.accessoryItem(a)));
            }
        }
        drops.add(new ItemStack(ModItems.FIXER_BULLET.get(), 2 + random.nextInt(5)));
        for (ItemStack stack : drops) {
            level.addFreshEntity(new ItemEntity(level, dead.getX(), dead.getY() + 0.5, dead.getZ(), stack));
        }
    }

    /** 이 생물이 현상범이면 그 조직 책장 id (내성 계산용). */
    public static String bountyPage(LivingEntity entity) {
        return entity instanceof Player ? "" : entity.getPersistentData().getString(PAGE_TAG);
    }
}
