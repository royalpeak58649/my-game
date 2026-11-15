package com.fixercity.request;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.RegisterCommandsEvent;

/**
 * /office create|invite|join|leave|kick|list, /oc (사무소 채팅).
 * 사무소 결성 비용 500안. 이름은 한글 가능, 최대 16자.
 */
public final class OfficeCommands {
    public static final int CREATE_COST = 500;
    private static final int MAX_NAME = 16;
    /** 초대받은 플레이어 -> 사무소 이름 (서버 재시작 시 사라짐). */
    private static final Map<UUID, String> INVITES = new HashMap<>();

    private OfficeCommands() {}

    @SubscribeEvent
    public static void onRegisterCommands(RegisterCommandsEvent event) {
        CommandDispatcher<CommandSourceStack> d = event.getDispatcher();
        d.register(Commands.literal("office")
                .executes(ctx -> info(ctx.getSource().getPlayerOrException()))
                .then(Commands.literal("create").then(Commands.argument("name", StringArgumentType.greedyString())
                        .executes(ctx -> create(ctx.getSource().getPlayerOrException(), StringArgumentType.getString(ctx, "name")))))
                .then(Commands.literal("invite").then(Commands.argument("target", EntityArgument.player())
                        .executes(ctx -> invite(ctx.getSource().getPlayerOrException(), EntityArgument.getPlayer(ctx, "target")))))
                .then(Commands.literal("join").then(Commands.argument("name", StringArgumentType.greedyString())
                        .executes(ctx -> join(ctx.getSource().getPlayerOrException(), StringArgumentType.getString(ctx, "name")))))
                .then(Commands.literal("leave").executes(ctx -> leave(ctx.getSource().getPlayerOrException())))
                .then(Commands.literal("kick").then(Commands.argument("target", EntityArgument.player())
                        .executes(ctx -> kick(ctx.getSource().getPlayerOrException(), EntityArgument.getPlayer(ctx, "target")))))
                .then(Commands.literal("list").executes(ctx -> list(ctx.getSource().getPlayerOrException()))));
        d.register(Commands.literal("oc").then(Commands.argument("message", StringArgumentType.greedyString())
                .executes(ctx -> chat(ctx.getSource().getPlayerOrException(), StringArgumentType.getString(ctx, "message")))));
    }

    private static FixerSavedData data(ServerPlayer p) {
        return RequestManager.data(p.server);
    }

    private static void fail(ServerPlayer p, String key, Object... args) {
        p.sendSystemMessage(Component.translatable(key, args).withStyle(ChatFormatting.RED));
    }

    private static void refreshNames(MinecraftServer server, Office office) {
        for (UUID m : office.members) {
            ServerPlayer p = server.getPlayerList().getPlayer(m);
            if (p != null) {
                p.refreshTabListName();
            }
        }
    }

    private static void broadcast(MinecraftServer server, Office office, Component message) {
        for (UUID m : office.members) {
            ServerPlayer p = server.getPlayerList().getPlayer(m);
            if (p != null) {
                p.sendSystemMessage(message);
            }
        }
    }

    private static Component nameOf(MinecraftServer server, UUID uuid) {
        ServerPlayer p = server.getPlayerList().getPlayer(uuid);
        if (p != null) {
            return p.getDisplayName();
        }
        return server.getProfileCache() == null ? Component.literal("?")
                : Component.literal(server.getProfileCache().get(uuid).map(com.mojang.authlib.GameProfile::getName).orElse("?"))
                        .withStyle(ChatFormatting.DARK_GRAY);
    }

    private static int info(ServerPlayer player) {
        Office office = data(player).officeOf(player.getUUID());
        if (office == null) {
            player.sendSystemMessage(Component.translatable("message.fixercity.office_none", CREATE_COST).withStyle(ChatFormatting.GRAY));
            return 0;
        }
        player.sendSystemMessage(Component.translatable("ui.fixercity.office_header", office.name, office.members.size())
                .withStyle(ChatFormatting.DARK_AQUA, ChatFormatting.BOLD));
        for (UUID m : office.members) {
            boolean online = player.server.getPlayerList().getPlayer(m) != null;
            int g = RequestManager.grade(player.server, m);
            player.sendSystemMessage(Component.literal(m.equals(office.leader) ? " ★ " : " · ")
                    .append(Component.literal("[").append(Grades.label(g)).append("] ").withStyle(ChatFormatting.GRAY))
                    .append(nameOf(player.server, m))
                    .append(Component.literal(online ? "" : " (offline)").withStyle(ChatFormatting.DARK_GRAY)));
        }
        return 1;
    }

    private static int create(ServerPlayer player, String rawName) {
        String name = rawName.trim();
        FixerSavedData data = data(player);
        if (data.officeOf(player.getUUID()) != null) {
            fail(player, "message.fixercity.office_already");
            return 0;
        }
        if (name.isEmpty() || name.length() > MAX_NAME) {
            fail(player, "message.fixercity.office_bad_name", MAX_NAME);
            return 0;
        }
        if (data.officeNamed(name) != null) {
            fail(player, "message.fixercity.office_taken");
            return 0;
        }
        FixerSavedData.Profile profile = data.profile(player.getUUID());
        if (profile.ahn < CREATE_COST) {
            fail(player, "message.fixercity.not_enough_ahn", String.format("%,d", CREATE_COST));
            return 0;
        }
        profile.ahn -= CREATE_COST;
        Office office = new Office();
        office.name = name;
        office.leader = player.getUUID();
        office.members.add(player.getUUID());
        data.offices.add(office);
        data.setDirty();
        player.server.getPlayerList().broadcastSystemMessage(Component.translatable("message.fixercity.office_created",
                player.getDisplayName(), name).withStyle(ChatFormatting.DARK_AQUA), false);
        refreshNames(player.server, office);
        return 1;
    }

    private static int invite(ServerPlayer player, ServerPlayer target) {
        FixerSavedData data = data(player);
        Office office = data.officeOf(player.getUUID());
        if (office == null || !office.leader.equals(player.getUUID())) {
            fail(player, "message.fixercity.office_not_leader");
            return 0;
        }
        if (data.officeOf(target.getUUID()) != null) {
            fail(player, "message.fixercity.office_target_has");
            return 0;
        }
        INVITES.put(target.getUUID(), office.name);
        player.sendSystemMessage(Component.translatable("message.fixercity.office_invited", target.getDisplayName())
                .withStyle(ChatFormatting.GREEN));
        target.sendSystemMessage(Component.translatable("message.fixercity.office_invite", player.getDisplayName(), office.name)
                .withStyle(ChatFormatting.DARK_AQUA)
                .append(" ").append(RequestUi.button("ui.fixercity.office_join", "/office join " + office.name,
                        ChatFormatting.GREEN, Component.literal(office.name))));
        return 1;
    }

    private static int join(ServerPlayer player, String rawName) {
        String name = rawName.trim();
        FixerSavedData data = data(player);
        String invited = INVITES.get(player.getUUID());
        Office office = data.officeNamed(name);
        if (office == null || invited == null || !invited.equalsIgnoreCase(name)) {
            fail(player, "message.fixercity.office_no_invite");
            return 0;
        }
        if (data.officeOf(player.getUUID()) != null) {
            fail(player, "message.fixercity.office_already");
            return 0;
        }
        INVITES.remove(player.getUUID());
        office.members.add(player.getUUID());
        data.setDirty();
        broadcast(player.server, office, Component.translatable("message.fixercity.office_joined", player.getDisplayName(), office.name)
                .withStyle(ChatFormatting.DARK_AQUA));
        refreshNames(player.server, office);
        return 1;
    }

    private static int leave(ServerPlayer player) {
        FixerSavedData data = data(player);
        Office office = data.officeOf(player.getUUID());
        if (office == null) {
            fail(player, "message.fixercity.office_none", CREATE_COST);
            return 0;
        }
        broadcast(player.server, office, Component.translatable("message.fixercity.office_left", player.getDisplayName(), office.name)
                .withStyle(ChatFormatting.GRAY));
        office.members.remove(player.getUUID());
        if (office.members.isEmpty()) {
            data.offices.remove(office);
        } else if (office.leader.equals(player.getUUID())) {
            office.leader = office.members.get(0);
            broadcast(player.server, office, Component.translatable("message.fixercity.office_new_leader",
                    nameOf(player.server, office.leader)).withStyle(ChatFormatting.DARK_AQUA));
        }
        data.setDirty();
        player.refreshTabListName();
        refreshNames(player.server, office);
        return 1;
    }

    private static int kick(ServerPlayer player, ServerPlayer target) {
        FixerSavedData data = data(player);
        Office office = data.officeOf(player.getUUID());
        if (office == null || !office.leader.equals(player.getUUID()) || target == player || !office.members.contains(target.getUUID())) {
            fail(player, "message.fixercity.office_not_leader");
            return 0;
        }
        office.members.remove(target.getUUID());
        data.setDirty();
        broadcast(player.server, office, Component.translatable("message.fixercity.office_kicked", target.getDisplayName())
                .withStyle(ChatFormatting.GRAY));
        target.sendSystemMessage(Component.translatable("message.fixercity.office_kicked", target.getDisplayName()).withStyle(ChatFormatting.RED));
        target.refreshTabListName();
        return 1;
    }

    private static int list(ServerPlayer player) {
        FixerSavedData data = data(player);
        player.sendSystemMessage(Component.translatable("ui.fixercity.office_list", data.offices.size()).withStyle(ChatFormatting.DARK_AQUA));
        for (Office o : data.offices) {
            player.sendSystemMessage(Component.literal(" · " + o.name + " (" + o.members.size() + ")").withStyle(ChatFormatting.WHITE));
        }
        return 1;
    }

    private static int chat(ServerPlayer player, String message) {
        Office office = data(player).officeOf(player.getUUID());
        if (office == null) {
            fail(player, "message.fixercity.office_none", CREATE_COST);
            return 0;
        }
        broadcast(player.server, office, Component.literal("[" + office.name + "] ").withStyle(ChatFormatting.DARK_AQUA)
                .append(player.getDisplayName()).append(Component.literal(": " + message).withStyle(ChatFormatting.WHITE)));
        return 1;
    }
}
