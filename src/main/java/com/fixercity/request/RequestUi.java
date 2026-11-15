package com.fixercity.request;

import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.ClickEvent;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.HoverEvent;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.network.chat.Style;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;

/** 채팅 기반 의뢰 화면. 대괄호 버튼을 클릭하면 명령어가 실행된다. */
public final class RequestUi {
    private RequestUi() {}

    public static MutableComponent button(String key, String command, ChatFormatting color, Component hover) {
        return Component.literal("[").append(Component.translatable(key)).append("]").withStyle(Style.EMPTY
                .withColor(color).withBold(true)
                .withClickEvent(new ClickEvent(ClickEvent.Action.RUN_COMMAND, command))
                .withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, hover)));
    }

    /** 의뢰 한 줄 제목: "[7급] 토벌: 좀비 12마리". */
    public static MutableComponent title(Request r) {
        MutableComponent grade = Component.literal("[" + r.grade + "급] ").withStyle(gradeColor(r.grade));
        MutableComponent body = switch (r.type) {
            case EXTERMINATION -> Component.translatable("request.fixercity.extermination",
                    BuiltInRegistries.ENTITY_TYPE.get(ResourceLocation.parse(r.target)).getDescription(), r.count);
            case DELIVERY -> Component.translatable("request.fixercity.delivery",
                    new ItemStack(BuiltInRegistries.ITEM.get(ResourceLocation.parse(r.target))).getHoverName(), r.count);
            case BOUNTY -> Component.translatable("request.fixercity.bounty", Component.translatable("bounty.fixercity." + r.target));
            case INVESTIGATION -> Component.translatable("request.fixercity.investigation");
        };
        return grade.append(body.withStyle(ChatFormatting.WHITE));
    }

    /** 목표/진행 상황 설명. */
    public static MutableComponent objective(Request r) {
        MutableComponent c = switch (r.type) {
            case EXTERMINATION -> Component.translatable("objective.fixercity.extermination", r.progress, r.count);
            case DELIVERY -> Component.translatable("objective.fixercity.delivery", r.count);
            case BOUNTY -> r.bountySpawned
                    ? Component.translatable("objective.fixercity.bounty_spawned", r.pos.getX(), r.pos.getY(), r.pos.getZ())
                    : Component.translatable("objective.fixercity.bounty", r.pos.getX(), r.pos.getZ());
            case INVESTIGATION -> Component.translatable("objective.fixercity.investigation", r.pos.getX(), r.pos.getZ());
        };
        if (r.state == Request.State.DONE) {
            c = Component.translatable("objective.fixercity.report");
        }
        return Component.literal("  ▶ ").append(c).withStyle(ChatFormatting.AQUA);
    }

    public static MutableComponent rewards(Request r) {
        return Component.translatable("request.fixercity.rewards", String.format("%,d", r.rewardAhn), r.rewardRep,
                String.format("%.1f", r.type.duration() / 24000.0)).withStyle(ChatFormatting.GRAY);
    }

    public static ChatFormatting gradeColor(int grade) {
        if (grade >= 8) return ChatFormatting.GRAY;
        if (grade >= 6) return ChatFormatting.GREEN;
        if (grade >= 4) return ChatFormatting.AQUA;
        if (grade >= 2) return ChatFormatting.LIGHT_PURPLE;
        return ChatFormatting.GOLD;
    }

    public static MutableComponent profileLine(MinecraftServer server, ServerPlayer player) {
        FixerSavedData.Profile p = RequestManager.data(server).profile(player.getUUID());
        int g = Grades.gradeFor(p.rep);
        int next = Grades.nextThreshold(g);
        return Component.translatable("ui.fixercity.profile",
                Grades.label(g).withStyle(gradeColor(g), ChatFormatting.BOLD),
                p.rep, next < 0 ? "-" : String.valueOf(next), String.format("%,d", p.ahn)).withStyle(ChatFormatting.GRAY);
    }

    /** 게시판을 우클릭했을 때. */
    public static void showBoard(ServerPlayer player) {
        MinecraftServer server = player.server;
        FixerSavedData data = RequestManager.data(server);
        player.sendSystemMessage(Component.translatable("ui.fixercity.board_header").withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD));
        player.sendSystemMessage(profileLine(server, player));

        Request active = data.activeFor(player.getUUID());
        if (active != null) {
            player.sendSystemMessage(Component.translatable("ui.fixercity.current").withStyle(ChatFormatting.YELLOW)
                    .append(title(active)));
            player.sendSystemMessage(objective(active));
            MutableComponent buttons = Component.literal("  ");
            if (active.state == Request.State.DONE || active.type == RequestType.DELIVERY) {
                buttons.append(button("ui.fixercity.report", "/request report", ChatFormatting.GREEN,
                        Component.translatable("ui.fixercity.report_hover"))).append(" ");
            }
            buttons.append(button("ui.fixercity.abandon", "/request abandon", ChatFormatting.RED,
                    Component.translatable("ui.fixercity.abandon_hover")));
            player.sendSystemMessage(buttons);
        }

        int g = Grades.gradeFor(data.profile(player.getUUID()).rep);
        List<Request> open = data.open();
        open.sort((a, b) -> Integer.compare(b.grade, a.grade));
        for (Request r : open) {
            boolean allowed = r.grade >= g - 1 && active == null;
            MutableComponent line = Component.literal(" ");
            if (allowed) {
                line.append(button("ui.fixercity.accept", "/request accept " + r.id, ChatFormatting.GREEN,
                        objective(r).append("\n").append(rewards(r))));
            } else {
                line.append(Component.literal("[ - ]").withStyle(ChatFormatting.DARK_GRAY));
            }
            line.append(" ").append(title(r)).append(Component.literal(" · ").withStyle(ChatFormatting.DARK_GRAY))
                    .append(Component.translatable("request.fixercity.short_reward", String.format("%,d", r.rewardAhn), r.rewardRep)
                            .withStyle(ChatFormatting.YELLOW));
            player.sendSystemMessage(line);
        }
        player.sendSystemMessage(Component.literal(" ").append(button("ui.fixercity.shop", "/shop", ChatFormatting.AQUA,
                Component.translatable("ui.fixercity.shop_hover"))).append(Component.literal("  "))
                .append(Component.translatable("ui.fixercity.board_hint").withStyle(ChatFormatting.DARK_GRAY)));
    }

    /** /request: 현재 의뢰 상태. */
    public static void showStatus(ServerPlayer player) {
        Request r = RequestManager.data(player.server).activeFor(player.getUUID());
        if (r == null) {
            player.sendSystemMessage(Component.translatable("message.fixercity.no_request").withStyle(ChatFormatting.GRAY));
            return;
        }
        long left = Math.max(0, r.deadline - player.level().getGameTime());
        player.sendSystemMessage(title(r));
        player.sendSystemMessage(objective(r));
        player.sendSystemMessage(rewards(r).append(Component.translatable("ui.fixercity.time_left",
                String.format("%.1f", left / 24000.0)).withStyle(ChatFormatting.GRAY)));
    }
}
