package com.fixercity.event;

import com.fixercity.item.FixerArmorItem;
import com.fixercity.item.KeyPageItem;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPageHelper;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.ChatFormatting;
import com.fixercity.kit.FixerKit;
import com.fixercity.registry.ModArmorMaterials;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.core.Holder;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterial;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.PlayerTickEvent;

/** 게임 이벤트: 방어구 세트 효과, 책장 패시브(지속형), 책장 동기화, 명령어. (전투 규칙은 CombatHandler) */
public final class FixerEvents {
    private static final EquipmentSlot[] ARMOR_SLOTS = {
            EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET};

    private FixerEvents() {}

    // ---- 방어구 세트 효과 (1초마다 검사) ----
    @SubscribeEvent
    public static void onPlayerTick(PlayerTickEvent.Post event) {
        Player player = event.getEntity();
        if (player.level().isClientSide() || player.tickCount % 20 != 0) {
            return;
        }
        tickPagePassives(player);
        if (com.fixercity.accessory.AccessoryHelper.has(player, com.fixercity.accessory.Accessory.SEVEN_MONOCLE)) {
            player.removeEffect(MobEffects.BLINDNESS);
            player.removeEffect(MobEffects.DARKNESS);
        }
        if (wearsFullSet(player, ModArmorMaterials.FIXER_SUIT)) {
            player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 50, 0, true, false, true));
        } else if (wearsFullSet(player, ModArmorMaterials.HEAVY_COAT)) {
            player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 50, 0, true, false, true));
        }
    }

    private static void tickPagePassives(Player player) {
        KeyPage page = KeyPageHelper.getPage(player);
        if (page == null) {
            return;
        }
        switch (page.passive()) {
            case SCRAMBLE -> {
                if (player.getHealth() <= player.getMaxHealth() * 0.3F) {
                    player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 50, 1, true, false, true));
                }
            }
            case GUARD -> {
                for (Player ally : player.level().getEntitiesOfClass(Player.class, player.getBoundingBox().inflate(5.0),
                        p -> p != player && p.isAlive() && !p.isSpectator())) {
                    ally.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 50, 0, true, false, true));
                }
            }
            default -> {
            }
        }
    }

    // ---- 책장 동기화: 접속, 리스폰(죽으면 책장을 잃음), 차원 이동, 다른 플레이어가 나를 보기 시작할 때 ----
    @SubscribeEvent
    public static void onLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            KeyPageHelper.refresh(player);
        }
    }

    @SubscribeEvent
    public static void onRespawn(PlayerEvent.PlayerRespawnEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            KeyPageHelper.refresh(player);
        }
    }

    @SubscribeEvent
    public static void onChangeDimension(PlayerEvent.PlayerChangedDimensionEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            KeyPageHelper.refresh(player);
        }
    }

    @SubscribeEvent
    public static void onStartTracking(PlayerEvent.StartTracking event) {
        if (event.getTarget() instanceof Player target && event.getEntity() instanceof ServerPlayer receiver) {
            KeyPageHelper.syncTo(receiver, target);
        }
    }

    private static boolean wearsFullSet(Player player, Holder<ArmorMaterial> material) {
        for (EquipmentSlot slot : ARMOR_SLOTS) {
            ItemStack stack = player.getItemBySlot(slot);
            if (!(stack.getItem() instanceof FixerArmorItem armor) || armor.getMaterial().value() != material.value()) {
                return false;
            }
        }
        return true;
    }

    // ---- /fixerkit <키트> [대상] : 테스트용 키트 지급 (OP 전용) ----
    @SubscribeEvent
    public static void onRegisterCommands(RegisterCommandsEvent event) {
        LiteralArgumentBuilder<CommandSourceStack> root = Commands.literal("fixerkit").requires(s -> s.hasPermission(2));
        for (FixerKit kit : FixerKit.values()) {
            root.then(Commands.literal(kit.id())
                    .executes(ctx -> giveKit(ctx.getSource(), ctx.getSource().getPlayerOrException(), kit))
                    .then(Commands.argument("target", net.minecraft.commands.arguments.EntityArgument.player())
                            .executes(ctx -> giveKit(ctx.getSource(),
                                    net.minecraft.commands.arguments.EntityArgument.getPlayer(ctx, "target"), kit))));
        }
        event.getDispatcher().register(root);

        // /accessory : 장신구 정보, /accessory remove : 장신구 벗기
        event.getDispatcher().register(Commands.literal("accessory")
                .executes(ctx -> showAccessory(ctx.getSource(), ctx.getSource().getPlayerOrException()))
                .then(Commands.literal("remove").executes(ctx -> {
                    ServerPlayer player = ctx.getSource().getPlayerOrException();
                    ItemStack old = com.fixercity.accessory.AccessoryHelper.unequip(player);
                    if (old.isEmpty()) {
                        ctx.getSource().sendFailure(Component.translatable("message.fixercity.no_accessory"));
                        return 0;
                    }
                    if (!player.getInventory().add(old)) {
                        player.drop(old, false);
                    }
                    ctx.getSource().sendSuccess(() -> Component.translatable("message.fixercity.accessory_removed"), false);
                    return 1;
                })));

        // /keypage : 낀 책장 정보, /keypage remove : 책장 벗기
        event.getDispatcher().register(Commands.literal("keypage")
                .executes(ctx -> showPage(ctx.getSource(), ctx.getSource().getPlayerOrException()))
                .then(Commands.literal("remove").executes(ctx -> {
                    ServerPlayer player = ctx.getSource().getPlayerOrException();
                    ItemStack old = KeyPageHelper.unequip(player);
                    if (old.isEmpty()) {
                        ctx.getSource().sendFailure(Component.translatable("message.fixercity.no_page"));
                        return 0;
                    }
                    if (!player.getInventory().add(old)) {
                        player.drop(old, false);
                    }
                    ctx.getSource().sendSuccess(() -> Component.translatable("message.fixercity.page_removed"), false);
                    return 1;
                })));
    }

    private static int showAccessory(CommandSourceStack source, ServerPlayer player) {
        com.fixercity.accessory.Accessory accessory = com.fixercity.accessory.AccessoryHelper.get(player);
        if (accessory == null) {
            source.sendFailure(Component.translatable("message.fixercity.no_accessory"));
            return 0;
        }
        net.minecraft.world.item.Item item = com.fixercity.registry.ModItems.accessoryItem(accessory);
        source.sendSuccess(() -> Component.translatable(item.getDescriptionId()).withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD), false);
        List<Component> lines = new ArrayList<>();
        com.fixercity.item.AccessoryItem.appendInfo(item, lines);
        if (com.fixercity.accessory.AccessoryHelper.isResonant(player)) {
            lines.add(Component.translatable("message.fixercity.resonating").withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD));
        }
        lines.forEach(line -> source.sendSuccess(() -> line, false));
        return 1;
    }

    private static int showPage(CommandSourceStack source, ServerPlayer player) {
        KeyPage page = KeyPageHelper.getPage(player);
        if (page == null) {
            source.sendFailure(Component.translatable("message.fixercity.no_page"));
            return 0;
        }
        source.sendSuccess(() -> Component.translatable(page.translationKey()).withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD), false);
        List<Component> lines = new ArrayList<>();
        KeyPageItem.appendPageInfo(page, lines);
        lines.forEach(line -> source.sendSuccess(() -> line, false));
        return 1;
    }

    public static int giveKit(CommandSourceStack source, ServerPlayer player, FixerKit kit) {
        for (ItemStack stack : kit.createContents()) {
            if (stack.getItem() instanceof ArmorItem armor) {
                EquipmentSlot slot = armor.getEquipmentSlot();
                if (player.getItemBySlot(slot).isEmpty()) {
                    player.setItemSlot(slot, stack);
                    continue;
                }
            }
            if (!player.getInventory().add(stack)) {
                player.drop(stack, false);
            }
        }
        Component kitName = Component.translatable("kit.fixercity." + kit.id());
        source.sendSuccess(() -> Component.translatable("message.fixercity.kit_given", kitName, player.getDisplayName()), true);
        return 1;
    }
}
