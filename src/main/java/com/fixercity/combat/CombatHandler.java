package com.fixercity.combat;

import com.fixercity.effect.ExposedEffect;
import com.fixercity.item.DaggerItem;
import com.fixercity.item.HasDamageKind;
import com.fixercity.item.RevolverItem;
import com.fixercity.keypage.DamageKind;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPageHelper;
import com.fixercity.keypage.KeyPages;
import com.fixercity.keypage.Resist;
import com.fixercity.registry.ModAttachments;
import com.fixercity.registry.ModEffects;
import net.minecraft.ChatFormatting;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.damagesource.DamageTypes;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.monster.Spider;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.AbstractArrow;
import net.minecraft.world.item.AxeItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.MaceItem;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.TridentItem;
import net.minecraft.world.phys.Vec3;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent;

/**
 * 원작식 전투 규칙.
 * 1) 물리 공격을 참격/관통/타격으로 분류한다.
 * 2) 책장(플레이어) 또는 기본 내성(몹)에 따라 체력 피해와 흐트러짐 피해에 배율을 곱한다.
 * 3) 흐트러짐 게이지가 0이 되면 3초간 흐트러지고, 그동안 받는 피해가 2배가 된다.
 * 4) 책장 패시브와 단검 백스탭을 처리한다.
 */
public final class CombatHandler {
    private static final float STAGGERED_DAMAGE_MULTIPLIER = 2.0F;
    private static final float BLUNT_STAGGER_BONUS = 1.25F;

    private CombatHandler() {}

    @SubscribeEvent
    public static void onIncomingDamage(LivingIncomingDamageEvent event) {
        LivingEntity target = event.getEntity();
        if (!(target.level() instanceof ServerLevel level)) {
            return;
        }
        DamageSource source = event.getSource();
        LivingEntity attacker = source.getEntity() instanceof LivingEntity l ? l : null;
        long now = level.getGameTime();
        float base = event.getAmount();
        float amount = base;
        float staggerBonus = 1.0F;
        DamageKind kind = classify(source, attacker);

        // ---- 공격자 쪽 (책장 패시브, 백스탭) ----
        if (attacker instanceof Player player && kind != null) {
            KeyPage page = KeyPageHelper.getPage(player);
            CombatData attackerData = player.getData(ModAttachments.COMBAT);
            if (page != null) {
                switch (page.passive()) {
                    case DISCIPLINE -> amount *= 1.1F;
                    case FIRST_STRIKE -> {
                        if (now - attackerData.lastDealt > CombatData.REGEN_DELAY) {
                            amount *= 2.0F;
                            staggerBonus *= 2.0F;
                            level.sendParticles(ParticleTypes.ENCHANTED_HIT, target.getX(), target.getY() + target.getBbHeight() * 0.6,
                                    target.getZ(), 12, 0.3, 0.3, 0.3, 0.2);
                        }
                    }
                    case BLAZE -> target.igniteForSeconds(3.0F);
                    case ANALYSIS -> {
                        target.addEffect(new MobEffectInstance(ModEffects.EXPOSED, 100, 0), player);
                        target.addEffect(new MobEffectInstance(MobEffects.GLOWING, 100, 0), player);
                    }
                    case MARKSMAN -> {
                        if (player.getMainHandItem().getItem() instanceof RevolverItem) {
                            amount *= 1.3F;
                        }
                    }
                    case BLEED -> {
                        if (kind == DamageKind.SLASH) {
                            MobEffectInstance current = target.getEffect(ModEffects.BLEED);
                            int stacks = current == null ? 0 : Math.min(current.getAmplifier() + 1, 4);
                            target.addEffect(new MobEffectInstance(ModEffects.BLEED, 100, stacks), player);
                        }
                    }
                    default -> {
                    }
                }
            }
            attackerData.lastDealt = now;

            if (isBackstab(player, target, source)) {
                amount *= DaggerItem.BACKSTAB_MULTIPLIER;
                level.sendParticles(ParticleTypes.DAMAGE_INDICATOR, target.getX(), target.getY() + target.getBbHeight() * 0.7,
                        target.getZ(), 6, 0.2, 0.2, 0.2, 0.1);
                level.playSound(null, target.getX(), target.getY(), target.getZ(),
                        SoundEvents.PLAYER_ATTACK_CRIT, SoundSource.PLAYERS, 1.0F, 0.7F);
            }
        }

        // ---- 방어자 쪽 ----
        KeyPage targetPage = KeyPageHelper.getPage(target);
        if (targetPage != null && targetPage.passive() == com.fixercity.keypage.KeyPagePassive.BLAZE
                && source.is(DamageTypeTags.IS_FIRE)) {
            amount *= 0.5F;
        }
        if (target.hasEffect(ModEffects.EXPOSED)) {
            amount *= ExposedEffect.DAMAGE_MULTIPLIER;
        }

        CombatData data = target.getData(ModAttachments.COMBAT);
        if (kind != null) {
            Resist hpResist = targetPage != null ? targetPage.hpResist(kind) : MobResistances.of(target, kind);
            Resist staggerResist = targetPage != null ? targetPage.staggerResist(kind) : MobResistances.of(target, kind);
            amount *= hpResist.multiplier();
            if (data.isStaggered(now)) {
                amount *= STAGGERED_DAMAGE_MULTIPLIER;
            }

            // 무적 시간 중인 공격은 흐트러짐 피해를 주지 않는다 (연타 남용 방지)
            if (target.invulnerableTime <= 10) {
                float max = staggerMax(target);
                float staggerDamage = base * staggerResist.multiplier() * staggerBonus
                        * (kind == DamageKind.BLUNT ? BLUNT_STAGGER_BONUS : 1.0F);
                boolean broke = data.damage(now, max, staggerDamage);
                if (broke) {
                    onStaggered(level, target);
                }
                sendFeedback(attacker, target, kind, hpResist, data.current(now, max), max, broke);
            }
        }

        event.setAmount(amount);
    }

    /** 피해 유형 판정. 물리 공격이 아니면 null (불, 낙하, 마법 등은 내성 무시). */
    public static DamageKind classify(DamageSource source, LivingEntity attacker) {
        if (source.is(DamageTypeTags.IS_EXPLOSION)) {
            return DamageKind.BLUNT;
        }
        if (source.is(DamageTypeTags.IS_FIRE) || source.is(DamageTypeTags.IS_FALL)) {
            return null;
        }
        Entity direct = source.getDirectEntity();
        if (direct instanceof AbstractArrow) {
            return DamageKind.PIERCE;
        }
        boolean melee = source.is(DamageTypes.PLAYER_ATTACK) || source.is(DamageTypes.MOB_ATTACK)
                || source.is(DamageTypes.MOB_ATTACK_NO_AGGRO);
        if (!melee || attacker == null) {
            return null;
        }
        Item weapon = attacker.getMainHandItem().getItem();
        if (weapon instanceof HasDamageKind kinded) {
            return kinded.damageKind();
        }
        if (weapon instanceof SwordItem || weapon instanceof AxeItem) {
            return DamageKind.SLASH;
        }
        if (weapon instanceof TridentItem) {
            return DamageKind.PIERCE;
        }
        if (weapon instanceof MaceItem) {
            return DamageKind.BLUNT;
        }
        if (attacker instanceof Spider) {
            return DamageKind.PIERCE;
        }
        return DamageKind.BLUNT;
    }

    public static float staggerMax(LivingEntity entity) {
        if (entity instanceof Player) {
            KeyPage page = KeyPageHelper.getPage(entity);
            return page != null ? page.stagger() : KeyPages.BARE_STAGGER;
        }
        return Math.max(10.0F, entity.getMaxHealth() * 0.8F);
    }

    private static boolean isBackstab(Player player, LivingEntity target, DamageSource source) {
        if (source.getDirectEntity() != player || !(player.getMainHandItem().getItem() instanceof DaggerItem)) {
            return false;
        }
        Vec3 toAttacker = new Vec3(player.getX() - target.getX(), 0, player.getZ() - target.getZ());
        if (toAttacker.lengthSqr() < 1.0E-4) {
            return false;
        }
        Vec3 facing = Vec3.directionFromRotation(0, target.getYHeadRot());
        return toAttacker.normalize().dot(facing) < -0.35;
    }

    private static void onStaggered(ServerLevel level, LivingEntity target) {
        int duration = CombatData.STAGGER_DURATION;
        target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, duration, 4, false, false, true));
        target.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, duration, 1, false, false, true));
        if (target instanceof Mob mob) {
            mob.getNavigation().stop();
        }
        level.sendParticles(ParticleTypes.ELECTRIC_SPARK, target.getX(), target.getY() + target.getBbHeight() + 0.3,
                target.getZ(), 20, 0.4, 0.2, 0.4, 0.1);
        level.playSound(null, target.getX(), target.getY(), target.getZ(),
                SoundEvents.ZOMBIE_ATTACK_IRON_DOOR, SoundSource.HOSTILE, 0.8F, 1.3F);
        if (target instanceof Player player) {
            player.displayClientMessage(Component.translatable("message.fixercity.you_staggered")
                    .withStyle(ChatFormatting.RED, ChatFormatting.BOLD), true);
        }
    }

    /** 액션바에 내성/흐트러짐 게이지 표시. 공격한 플레이어와 맞은 플레이어 양쪽에. */
    private static void sendFeedback(LivingEntity attacker, LivingEntity target, DamageKind kind, Resist resist,
            float stagger, float max, boolean broke) {
        if (attacker instanceof Player player && player != target) {
            MutableComponent msg = Component.empty()
                    .append(Component.translatable(kind.translationKey()).withStyle(kind.color()))
                    .append(Component.literal(" "))
                    .append(Component.translatable(resist.translationKey()).withStyle(resist.color()))
                    .append(Component.literal("  "));
            if (broke) {
                msg.append(Component.translatable("message.fixercity.staggered").withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD));
            } else {
                msg.append(Component.translatable("message.fixercity.stagger_label").withStyle(ChatFormatting.GRAY))
                        .append(Component.literal(" ")).append(gauge(stagger, max));
            }
            player.displayClientMessage(msg, true);
        }
        if (target instanceof Player victim && !broke) {
            victim.displayClientMessage(Component.translatable("message.fixercity.stagger_label").withStyle(ChatFormatting.GRAY)
                    .append(Component.literal(" ")).append(gauge(stagger, max))
                    .append(Component.literal(String.format(" %d/%d", Math.round(stagger), Math.round(max)))
                            .withStyle(ChatFormatting.GRAY)), true);
        }
    }

    private static Component gauge(float value, float max) {
        int filled = Math.round(10 * Math.max(0, value) / Math.max(1, max));
        return Component.literal("▮".repeat(filled)).withStyle(ChatFormatting.YELLOW)
                .append(Component.literal("▯".repeat(10 - filled)).withStyle(ChatFormatting.DARK_GRAY));
    }
}
