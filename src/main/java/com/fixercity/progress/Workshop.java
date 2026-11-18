package com.fixercity.progress;

import com.fixercity.network.WorkshopPayload;
import com.fixercity.request.FixerSavedData;
import com.fixercity.request.RequestManager;
import com.fixercity.request.RequestUi;
import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.neoforge.network.PacketDistributor;

/** 공방: 신체 개조와 무기 강화. 공방 작업대 근처에서만 쓸 수 있다. */
public final class Workshop {
    private record Visit(BlockPos pos, long time) {}

    private static final Map<UUID, Visit> VISITS = new HashMap<>();

    private Workshop() {}

    public static void recordVisit(ServerPlayer player, BlockPos pos) {
        VISITS.put(player.getUUID(), new Visit(pos, player.level().getGameTime()));
    }

    public static boolean near(ServerPlayer player) {
        Visit v = VISITS.get(player.getUUID());
        return v != null && player.level().getGameTime() - v.time() <= 1200 && player.blockPosition().distSqr(v.pos()) <= 64;
    }

    public static void send(ServerPlayer player) {
        FixerSavedData.Profile p = RequestManager.data(player.server).profile(player.getUUID());
        int grade = RequestManager.grade(player.server, player.getUUID());
        float price = com.fixercity.event.CityEvents.priceMultiplier(player.server);
        List<WorkshopPayload.AugEntry> augs = new ArrayList<>();
        for (Augment a : Augment.values()) {
            int lv = p.augments.getOrDefault(a.id(), 0);
            boolean maxed = lv >= Augment.MAX_LEVEL;
            int cost = maxed ? 0 : Math.round(a.cost(lv) * price);
            int req = maxed ? 0 : Augment.requiredGrade(lv);
            augs.add(new WorkshopPayload.AugEntry(a.id(), lv, cost, req, !maxed && grade <= req && p.ahn >= cost));
        }
        ItemStack held = player.getMainHandItem();
        WorkshopPayload.RefineInfo refine;
        if (Progression.refinable(held)) {
            int lv = Progression.refineLevel(held);
            boolean maxed = lv >= Progression.MAX_REFINE;
            int cost = maxed ? 0 : Math.round(Progression.refineCost(lv) * price);
            refine = new WorkshopPayload.RefineInfo(held.getHoverName(), lv, cost, maxed ? 0 : Progression.refineChance(lv),
                    !maxed && p.ahn >= cost);
        } else {
            refine = new WorkshopPayload.RefineInfo(Component.translatable("ui.fixercity.refine_none"), 0, 0, 0, false);
        }
        List<WorkshopPayload.BindEntry> binds = new ArrayList<>();
        boolean blank = player.getInventory().countItem(com.fixercity.registry.ModItems.BLANK_KEY_PAGE.get()) > 0;
        for (com.fixercity.reception.Guest g : com.fixercity.reception.Guest.values()) {
            int books = player.getInventory().countItem(com.fixercity.registry.ModItems.guestBook(g));
            if (books <= 0) {
                continue;
            }
            int cost = Math.round(bindCost(g) * price);
            int req = bindGrade(g);
            binds.add(new WorkshopPayload.BindEntry(g.id(), Component.translatable(g.page().translationKey()), books, cost, req,
                    blank && grade <= req && p.ahn >= cost));
        }
        PacketDistributor.sendToPlayer(player, new WorkshopPayload(RequestUi.profileLine(player.server, player), augs, refine, binds));
    }

    /** 제본 비용: 그 등급 의뢰 보수의 2배. */
    public static int bindCost(com.fixercity.reception.Guest g) {
        return com.fixercity.request.Grades.baseAhn(g.grade()) * 2;
    }

    /** 제본에 필요한 등급: 초대장과 같다 (손님 등급보다 한 단계 아래부터). */
    public static int bindGrade(com.fixercity.reception.Guest g) {
        return Math.min(9, g.grade() + 1);
    }

    /** 손님의 책 1권 + 빈 책장 1장 + 안 -> 손님 책장. 결과 문자열은 메시지 키 꼬리. */
    public static String bind(ServerPlayer player, com.fixercity.reception.Guest g, float price) {
        net.minecraft.world.entity.player.Inventory inv = player.getInventory();
        net.minecraft.world.item.Item book = com.fixercity.registry.ModItems.guestBook(g);
        net.minecraft.world.item.Item blank = com.fixercity.registry.ModItems.BLANK_KEY_PAGE.get();
        if (inv.countItem(book) <= 0) {
            return "no_book";
        }
        if (inv.countItem(blank) <= 0) {
            return "no_blank";
        }
        if (RequestManager.grade(player.server, player.getUUID()) > bindGrade(g)) {
            return "grade";
        }
        int cost = Math.round(bindCost(g) * price);
        FixerSavedData.Profile p = RequestManager.data(player.server).profile(player.getUUID());
        if (p.ahn < cost) {
            return "money";
        }
        RequestManager.addAhn(player.server, player.getUUID(), -cost);
        take(inv, book);
        take(inv, blank);
        ItemStack page = new ItemStack(com.fixercity.registry.ModItems.keyPageItem(g.page()));
        if (!inv.add(page)) {
            player.drop(page, false);
        }
        return "ok";
    }

    private static void take(net.minecraft.world.entity.player.Inventory inv, net.minecraft.world.item.Item item) {
        for (int i = 0; i < inv.getContainerSize(); i++) {
            ItemStack s = inv.getItem(i);
            if (s.is(item)) {
                s.shrink(1);
                inv.setChanged();
                return;
            }
        }
    }

    @SubscribeEvent
    public static void onRegisterCommands(RegisterCommandsEvent event) {
        CommandDispatcher<CommandSourceStack> d = event.getDispatcher();
        d.register(Commands.literal("workshop")
                .then(Commands.literal("gui").executes(ctx -> {
                    ServerPlayer p = ctx.getSource().getPlayerOrException();
                    if (!near(p)) {
                        p.sendSystemMessage(Component.translatable("message.fixercity.need_workshop").withStyle(ChatFormatting.RED));
                        return 0;
                    }
                    send(p);
                    return 1;
                }))
                .then(Commands.literal("augment").then(Commands.argument("id", StringArgumentType.word()).executes(ctx -> {
                    ServerPlayer p = ctx.getSource().getPlayerOrException();
                    Augment a = Augment.byId(StringArgumentType.getString(ctx, "id"));
                    if (a == null || !near(p)) {
                        p.sendSystemMessage(Component.translatable("message.fixercity.need_workshop").withStyle(ChatFormatting.RED));
                        return 0;
                    }
                    String result = Progression.augment(p, a, com.fixercity.event.CityEvents.priceMultiplier(p.server));
                    if (result.equals("ok")) {
                        int lv = RequestManager.data(p.server).profile(p.getUUID()).augments.getOrDefault(a.id(), 0);
                        p.sendSystemMessage(Component.translatable("message.fixercity.augmented", Component.translatable(a.nameKey()), lv)
                                .withStyle(ChatFormatting.GREEN));
                        p.level().playSound(null, p.blockPosition(), SoundEvents.SMITHING_TABLE_USE, SoundSource.PLAYERS, 1.0F, 0.8F);
                    } else {
                        p.sendSystemMessage(Component.translatable("message.fixercity.workshop_" + result).withStyle(ChatFormatting.RED));
                    }
                    return 1;
                })))
                .then(Commands.literal("bind").then(Commands.argument("guest", StringArgumentType.word()).executes(ctx -> {
                    ServerPlayer p = ctx.getSource().getPlayerOrException();
                    com.fixercity.reception.Guest g = com.fixercity.reception.Guest.byId(StringArgumentType.getString(ctx, "guest"));
                    if (g == null || !near(p)) {
                        p.sendSystemMessage(Component.translatable("message.fixercity.need_workshop").withStyle(ChatFormatting.RED));
                        return 0;
                    }
                    String result = bind(p, g, com.fixercity.event.CityEvents.priceMultiplier(p.server));
                    if (result.equals("ok")) {
                        p.sendSystemMessage(Component.translatable("message.fixercity.page_bound",
                                Component.translatable(g.page().translationKey()).withStyle(ChatFormatting.GOLD)).withStyle(ChatFormatting.GREEN));
                        p.level().playSound(null, p.blockPosition(), SoundEvents.BOOK_PAGE_TURN, SoundSource.PLAYERS, 1.0F, 0.6F);
                        p.level().playSound(null, p.blockPosition(), SoundEvents.ENCHANTMENT_TABLE_USE, SoundSource.PLAYERS, 1.0F, 1.0F);
                    } else {
                        p.sendSystemMessage(Component.translatable("message.fixercity.bind_" + result).withStyle(ChatFormatting.RED));
                    }
                    return 1;
                })))
                .then(Commands.literal("refine").executes(ctx -> {
                    ServerPlayer p = ctx.getSource().getPlayerOrException();
                    if (!near(p)) {
                        p.sendSystemMessage(Component.translatable("message.fixercity.need_workshop").withStyle(ChatFormatting.RED));
                        return 0;
                    }
                    String result = Progression.refine(p, com.fixercity.event.CityEvents.priceMultiplier(p.server));
                    switch (result) {
                        case "ok" -> {
                            p.sendSystemMessage(Component.translatable("message.fixercity.refined", p.getMainHandItem().getHoverName(),
                                    Progression.refineLevel(p.getMainHandItem())).withStyle(ChatFormatting.GREEN));
                            p.level().playSound(null, p.blockPosition(), SoundEvents.ANVIL_USE, SoundSource.PLAYERS, 1.0F, 1.2F);
                        }
                        case "fail" -> {
                            p.sendSystemMessage(Component.translatable("message.fixercity.refine_failed").withStyle(ChatFormatting.RED));
                            p.level().playSound(null, p.blockPosition(), SoundEvents.ANVIL_BREAK, SoundSource.PLAYERS, 1.0F, 1.0F);
                        }
                        default -> p.sendSystemMessage(Component.translatable("message.fixercity.workshop_" + result).withStyle(ChatFormatting.RED));
                    }
                    return 1;
                })));
    }
}
