package com.fixercity.event;

import com.fixercity.item.DaggerItem;
import com.fixercity.item.FixerArmorItem;
import com.fixercity.kit.FixerKit;
import com.fixercity.registry.ModArmorMaterials;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.core.Holder;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterial;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.Vec3;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent;
import net.neoforged.neoforge.event.tick.PlayerTickEvent;

/** 게임 이벤트: 단검 백스탭, 방어구 세트 효과, /fixerkit 명령어. */
public final class FixerEvents {
    private static final EquipmentSlot[] ARMOR_SLOTS = {
            EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET};

    private FixerEvents() {}

    // ---- 단검 백스탭 ----
    @SubscribeEvent
    public static void onIncomingDamage(LivingIncomingDamageEvent event) {
        if (!(event.getSource().getDirectEntity() instanceof Player player)) {
            return;
        }
        if (!(player.getMainHandItem().getItem() instanceof DaggerItem)) {
            return;
        }
        LivingEntity target = event.getEntity();
        Vec3 toAttacker = new Vec3(player.getX() - target.getX(), 0, player.getZ() - target.getZ());
        Vec3 facing = Vec3.directionFromRotation(0, target.getYHeadRot());
        if (toAttacker.lengthSqr() < 1.0E-4) {
            return;
        }
        // 공격자가 대상의 시선 반대편(뒤쪽 약 110도)에 있으면 백스탭
        if (toAttacker.normalize().dot(facing) < -0.35) {
            event.setAmount(event.getAmount() * DaggerItem.BACKSTAB_MULTIPLIER);
            if (target.level() instanceof ServerLevel level) {
                level.sendParticles(ParticleTypes.DAMAGE_INDICATOR, target.getX(), target.getY() + target.getBbHeight() * 0.7,
                        target.getZ(), 6, 0.2, 0.2, 0.2, 0.1);
                level.playSound(null, target.getX(), target.getY(), target.getZ(),
                        SoundEvents.PLAYER_ATTACK_CRIT, SoundSource.PLAYERS, 1.0F, 0.7F);
            }
        }
    }

    // ---- 방어구 세트 효과 (1초마다 검사) ----
    @SubscribeEvent
    public static void onPlayerTick(PlayerTickEvent.Post event) {
        Player player = event.getEntity();
        if (player.level().isClientSide() || player.tickCount % 20 != 0) {
            return;
        }
        if (wearsFullSet(player, ModArmorMaterials.FIXER_SUIT)) {
            player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 50, 0, true, false, true));
        } else if (wearsFullSet(player, ModArmorMaterials.HEAVY_COAT)) {
            player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 50, 0, true, false, true));
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
