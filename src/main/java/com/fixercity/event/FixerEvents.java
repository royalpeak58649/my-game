package com.fixercity.event;

import com.fixercity.item.FixerArmorItem;
import com.fixercity.item.KeyPageItem;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPageHelper;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.ChatFormatting;
import com.fixercity.kit.FixerKit;
import com.fixercity.request.FixerSavedData;
import net.neoforged.bus.api.EventPriority;
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent;
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
    /** 10틱마다 내 흐트러짐 게이지를 HUD에 동기화 (회복 표시). */
    @SubscribeEvent
    public static void onPlayerTickHud(PlayerTickEvent.Post event) {
        if (event.getEntity() instanceof ServerPlayer player && player.tickCount % 10 == 0) {
            com.fixercity.combat.CombatHandler.syncOwnIfChanged(player);
        }
    }

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
            case BOND -> {
                for (Player ally : player.level().getEntitiesOfClass(Player.class, player.getBoundingBox().inflate(6.0),
                        p -> p != player && p.isAlive() && !p.isSpectator())) {
                    if (!ally.hasEffect(MobEffects.REGENERATION)) {
                        ally.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 100, 0, true, false, true));
                    }
                }
            }
            case DAWN -> {
                if (player.tickCount % 80 == 0 && player.getHealth() < player.getMaxHealth()) {
                    player.heal(1.0F);
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
            // 처음 접속: 무작위 키트 5개를 보관함에 넣어 준다 (중복 가능). 하나씩 꺼내 쓴다.
            FixerSavedData data = FixerSavedData.get(player.server);
            FixerSavedData.Profile profile = data.profile(player.getUUID());
            if (!profile.kitGiven) {
                profile.kitGiven = true;
                for (int i = 0; i < STARTING_KITS; i++) {
                    profile.storedKits.add(FixerKit.random(player.getRandom()).id());
                }
                data.setDirty();
                player.sendSystemMessage(Component.translatable("message.fixercity.welcome").withStyle(ChatFormatting.YELLOW));
                player.sendSystemMessage(Component.translatable("message.fixercity.welcome_hint").withStyle(ChatFormatting.GRAY));
                showKitStorage(player);
            } else if (!profile.storedKits.isEmpty() && player.getInventory().isEmpty()) {
                // 빈손으로 접속했고 남은 키트가 있으면 알려준다
                showKitStorage(player);
            }
        }
    }

    /**
     * 죽으면 장비를 전부 잃는다: 인벤토리, 갑옷, 손에 든 것 모두 떨어지지 않고 사라진다.
     * (책장과 장신구는 몸에 붙어 있어 리스폰 때 자동으로 사라진다. 돈·평판·엔더 상자는 남는다.)
     * keepInventory 규칙과 상관없이 적용된다.
     */
    @SubscribeEvent(priority = EventPriority.LOWEST)
    public static void onPlayerDeath(LivingDeathEvent event) {
        if (event.isCanceled() || !(event.getEntity() instanceof ServerPlayer player)) {
            return;
        }
        if (player.isSpectator() || player.getAbilities().instabuild) {
            return;
        }
        player.getInventory().clearContent();
        player.sendSystemMessage(Component.translatable("message.fixercity.lost_everything").withStyle(ChatFormatting.DARK_RED));
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

    @SubscribeEvent
    public static void onRespawnKitHint(PlayerEvent.PlayerRespawnEvent event) {
        if (!event.isEndConquered() && event.getEntity() instanceof ServerPlayer player) {
            showKitStorage(player);
        }
    }

    // ---- 키트 보관함 ----
    public static final int STARTING_KITS = 5;

    /** /kit : 보관함의 키트 목록과 [꺼내기] 버튼. */
    public static void showKitStorage(ServerPlayer player) {
        FixerSavedData.Profile profile = FixerSavedData.get(player.server).profile(player.getUUID());
        player.sendSystemMessage(Component.translatable("ui.fixercity.kit_header", profile.storedKits.size())
                .withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD));
        if (profile.storedKits.isEmpty()) {
            player.sendSystemMessage(Component.translatable("ui.fixercity.kit_empty").withStyle(ChatFormatting.GRAY));
            return;
        }
        for (int i = 0; i < profile.storedKits.size(); i++) {
            String id = profile.storedKits.get(i);
            player.sendSystemMessage(Component.literal(" ")
                    .append(com.fixercity.request.RequestUi.button("ui.fixercity.kit_use", "/kit use " + (i + 1),
                            ChatFormatting.GREEN, Component.translatable("kit.fixercity." + id + ".desc")))
                    .append(" ")
                    .append(Component.translatable("kit.fixercity." + id).withStyle(ChatFormatting.WHITE))
                    .append(Component.literal(" - ").withStyle(ChatFormatting.DARK_GRAY))
                    .append(Component.translatable("kit.fixercity." + id + ".desc").withStyle(ChatFormatting.GRAY)));
        }
    }

    /** 보관함에서 index번째(1부터) 키트를 꺼내 바로 장비한다. */
    public static int useStoredKit(ServerPlayer player, int index) {
        FixerSavedData data = FixerSavedData.get(player.server);
        FixerSavedData.Profile profile = data.profile(player.getUUID());
        if (index < 1 || index > profile.storedKits.size()) {
            player.sendSystemMessage(Component.translatable("ui.fixercity.kit_empty").withStyle(ChatFormatting.RED));
            return 0;
        }
        String id = profile.storedKits.remove(index - 1);
        data.setDirty();
        for (FixerKit kit : FixerKit.values()) {
            if (kit.id().equals(id)) {
                equipKit(player, kit);
                player.sendSystemMessage(Component.translatable("message.fixercity.kit_opened",
                        Component.translatable("kit.fixercity." + id).withStyle(ChatFormatting.GOLD),
                        profile.storedKits.size()).withStyle(ChatFormatting.GREEN));
                player.level().playSound(null, player.getX(), player.getY(), player.getZ(),
                        net.minecraft.sounds.SoundEvents.ARMOR_EQUIP_GENERIC.value(), net.minecraft.sounds.SoundSource.PLAYERS, 1.0F, 1.0F);
                return 1;
            }
        }
        return 0;
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

        // /kit : 키트 보관함, /kit use <번호> : 꺼내 쓰기
        event.getDispatcher().register(Commands.literal("kit")
                .executes(ctx -> {
                    showKitStorage(ctx.getSource().getPlayerOrException());
                    return 1;
                })
                .then(Commands.literal("use").then(Commands.argument("index",
                        com.mojang.brigadier.arguments.IntegerArgumentType.integer(1))
                        .executes(ctx -> useStoredKit(ctx.getSource().getPlayerOrException(),
                                com.mojang.brigadier.arguments.IntegerArgumentType.getInteger(ctx, "index"))))));

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
        equipKit(player, kit);
        Component kitName = Component.translatable("kit.fixercity." + kit.id());
        source.sendSuccess(() -> Component.translatable("message.fixercity.kit_given", kitName, player.getDisplayName()), true);
        return 1;
    }

    /** 키트 지급: 갑옷은 빈 칸에 입히고, 책장·장신구는 비어 있으면 바로 장착, 나머지는 인벤토리로. */
    public static void equipKit(ServerPlayer player, FixerKit kit) {
        for (ItemStack stack : kit.createContents()) {
            if (stack.getItem() instanceof KeyPageItem pageItem && KeyPageHelper.getPage(player) == null) {
                KeyPageHelper.equip(player, pageItem.page());
                continue;
            }
            if (stack.getItem() instanceof com.fixercity.item.AccessoryItem accessoryItem
                    && com.fixercity.accessory.AccessoryHelper.get(player) == null) {
                com.fixercity.accessory.AccessoryHelper.equip(player, accessoryItem.accessory());
                continue;
            }
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
    }
}
