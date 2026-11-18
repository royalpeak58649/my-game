package com.fixercity.request;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.RegisterCommandsEvent;

/** /fixer, /request, /shop, /ahn, /fixeradmin. */
public final class RequestCommands {
    private RequestCommands() {}

    @SubscribeEvent
    public static void onRegisterCommands(RegisterCommandsEvent event) {
        CommandDispatcher<CommandSourceStack> d = event.getDispatcher();

        d.register(Commands.literal("fixer").executes(ctx -> {
            ServerPlayer player = ctx.getSource().getPlayerOrException();
            player.sendSystemMessage(RequestUi.profileLine(player.server, player));
            RequestUi.showStatus(player);
            return 1;
        }));

        d.register(Commands.literal("request")
                .executes(ctx -> {
                    RequestUi.showStatus(ctx.getSource().getPlayerOrException());
                    return 1;
                })
                .then(Commands.literal("accept").then(Commands.argument("id", IntegerArgumentType.integer(1))
                        .executes(ctx -> RequestManager.accept(ctx.getSource().getPlayerOrException(),
                                IntegerArgumentType.getInteger(ctx, "id")) ? 1 : 0)))
                .then(Commands.literal("gui").executes(ctx -> {
                    ServerPlayer player = ctx.getSource().getPlayerOrException();
                    if (!RequestManager.nearBoard(player)) {
                        player.sendSystemMessage(Component.translatable("message.fixercity.need_board").withStyle(ChatFormatting.RED));
                        return 0;
                    }
                    RequestUi.sendBoard(player);
                    return 1;
                }))
                .then(Commands.literal("board").executes(ctx -> {
                    RequestUi.showBoard(ctx.getSource().getPlayerOrException());
                    return 1;
                }))
                .then(Commands.literal("abandon").executes(ctx -> {
                    RequestManager.abandon(ctx.getSource().getPlayerOrException());
                    return 1;
                }))
                .then(Commands.literal("report").executes(ctx -> {
                    ServerPlayer player = ctx.getSource().getPlayerOrException();
                    if (!RequestManager.nearBoard(player)) {
                        player.sendSystemMessage(Component.translatable("message.fixercity.need_board").withStyle(ChatFormatting.RED));
                        return 0;
                    }
                    RequestManager.report(player);
                    return 1;
                })));

        d.register(Commands.literal("shop")
                .executes(ctx -> {
                    Shop.showCategories(ctx.getSource().getPlayerOrException());
                    return 1;
                })
                .then(Commands.literal("gui").then(Commands.argument("category", StringArgumentType.word())
                        .executes(ctx -> {
                            ServerPlayer player = ctx.getSource().getPlayerOrException();
                            String c = StringArgumentType.getString(ctx, "category");
                            if (!Shop.CATEGORIES.contains(c)) {
                                return 0;
                            }
                            if (!RequestManager.nearBoard(player)) {
                                player.sendSystemMessage(Component.translatable("message.fixercity.need_board").withStyle(ChatFormatting.RED));
                                return 0;
                            }
                            Shop.sendShop(player, c);
                            return 1;
                        })))
                .then(Commands.literal("sell").then(Commands.argument("item", StringArgumentType.word())
                        .suggests((ctx, b) -> {
                            b.suggest("all");
                            LootSale.PRICES.keySet().forEach(i -> b.suggest(LootSale.id(i)));
                            return b.buildFuture();
                        })
                        .executes(ctx -> LootSale.sell(ctx.getSource().getPlayerOrException(),
                                StringArgumentType.getString(ctx, "item")) ? 1 : 0)))
                .then(Commands.literal("buy").then(Commands.argument("item", StringArgumentType.word())
                        .executes(ctx -> Shop.buy(ctx.getSource().getPlayerOrException(),
                                StringArgumentType.getString(ctx, "item")) ? 1 : 0)))
                .then(Commands.argument("category", StringArgumentType.word())
                        .suggests((ctx, b) -> {
                            Shop.CATEGORIES.forEach(b::suggest);
                            return b.buildFuture();
                        })
                        .executes(ctx -> {
                            String c = StringArgumentType.getString(ctx, "category");
                            if (!Shop.CATEGORIES.contains(c)) {
                                return 0;
                            }
                            Shop.showCategory(ctx.getSource().getPlayerOrException(), c);
                            return 1;
                        })));

        d.register(Commands.literal("ahn")
                .then(Commands.literal("pay").then(Commands.argument("target", EntityArgument.player())
                        .then(Commands.argument("amount", IntegerArgumentType.integer(1)).executes(ctx -> {
                            ServerPlayer from = ctx.getSource().getPlayerOrException();
                            ServerPlayer to = EntityArgument.getPlayer(ctx, "target");
                            int amount = IntegerArgumentType.getInteger(ctx, "amount");
                            FixerSavedData.Profile p = RequestManager.data(from.server).profile(from.getUUID());
                            if (from == to || p.ahn < amount) {
                                from.sendSystemMessage(Component.translatable("message.fixercity.not_enough_ahn",
                                        String.format("%,d", amount)).withStyle(ChatFormatting.RED));
                                return 0;
                            }
                            RequestManager.addAhn(from.server, from.getUUID(), -amount);
                            RequestManager.addAhn(from.server, to.getUUID(), amount);
                            from.sendSystemMessage(Component.translatable("message.fixercity.paid_to", to.getDisplayName(),
                                    String.format("%,d", amount)).withStyle(ChatFormatting.GREEN));
                            to.sendSystemMessage(Component.translatable("message.fixercity.received_from", from.getDisplayName(),
                                    String.format("%,d", amount)).withStyle(ChatFormatting.GREEN));
                            return 1;
                        })))));

        d.register(Commands.literal("fixeradmin").requires(s -> s.hasPermission(2))
                .then(Commands.literal("rep").then(Commands.argument("target", EntityArgument.player())
                        .then(Commands.argument("amount", IntegerArgumentType.integer()).executes(ctx -> {
                            ServerPlayer target = EntityArgument.getPlayer(ctx, "target");
                            RequestManager.addRep(target.server, target.getUUID(), IntegerArgumentType.getInteger(ctx, "amount"));
                            ctx.getSource().sendSuccess(() -> RequestUi.profileLine(target.server, target), true);
                            return 1;
                        }))))
                .then(Commands.literal("ahn").then(Commands.argument("target", EntityArgument.player())
                        .then(Commands.argument("amount", IntegerArgumentType.integer()).executes(ctx -> {
                            ServerPlayer target = EntityArgument.getPlayer(ctx, "target");
                            RequestManager.addAhn(target.server, target.getUUID(), IntegerArgumentType.getInteger(ctx, "amount"));
                            ctx.getSource().sendSuccess(() -> RequestUi.profileLine(target.server, target), true);
                            return 1;
                        }))))
                .then(Commands.literal("reception").then(Commands.argument("guest", StringArgumentType.word())
                        .suggests((ctx, b) -> {
                            for (com.fixercity.reception.Guest g : com.fixercity.reception.Guest.values()) {
                                b.suggest(g.id());
                            }
                            return b.buildFuture();
                        })
                        .executes(ctx -> {
                            com.fixercity.reception.Guest g = com.fixercity.reception.Guest.byId(StringArgumentType.getString(ctx, "guest"));
                            return g != null && com.fixercity.reception.ReceptionManager.start(ctx.getSource().getPlayerOrException(), g) ? 1 : 0;
                        })))
                .then(Commands.literal("refresh").executes(ctx -> {
                    RequestManager.forceRefresh(ctx.getSource().getServer());
                    ctx.getSource().sendSuccess(() -> Component.translatable("message.fixercity.board_refreshed"), true);
                    return 1;
                })));
    }
}
