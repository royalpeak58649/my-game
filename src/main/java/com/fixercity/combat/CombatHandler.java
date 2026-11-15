package com.fixercity.combat;

import com.fixercity.accessory.Accessory;
import com.fixercity.accessory.AccessoryHelper;
import com.fixercity.effect.ExposedEffect;
import com.fixercity.item.DaggerItem;
import com.fixercity.item.HasDamageKind;
import com.fixercity.item.GunItem;
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

        // 행운의 동전: 물리 피해 회피
        float dodge = AccessoryHelper.value(target, Accessory.LUCKY_COIN, 0.10F, 0.18F, 0.0F);
        if (kind != null && dodge > 0 && level.getRandom().nextFloat() < dodge) {
            event.setCanceled(true);
            level.sendParticles(ParticleTypes.CLOUD, target.getX(), target.getY() + 1.0, target.getZ(), 6, 0.3, 0.3, 0.3, 0.02);
            level.playSound(null, target.getX(), target.getY(), target.getZ(), SoundEvents.PLAYER_ATTACK_NODAMAGE, SoundSource.PLAYERS, 1.0F, 1.6F);
            if (target instanceof Player p) {
                p.displayClientMessage(Component.translatable("message.fixercity.dodged").withStyle(ChatFormatting.GREEN), true);
            }
            return;
        }
        // 리우 화염 부적 (공명 시 화염 면역)
        if (source.is(DamageTypeTags.IS_FIRE) && AccessoryHelper.has(target, Accessory.LIU_TALISMAN)) {
            if (AccessoryHelper.isResonant(target)) {
                event.setCanceled(true);
                target.clearFire();
                return;
            }
            amount *= 0.5F;
        }

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
                        if (player.getMainHandItem().getItem() instanceof GunItem) {
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

        // ---- 공격자 장신구 ----
        if (attacker instanceof Player player && kind != null) {
            CombatData targetData = target.getData(ModAttachments.COMBAT);
            if (targetData.isStaggered(now)) {
                amount *= AccessoryHelper.value(player, Accessory.SHI_TASSEL, 1.3F, 1.5F, 1.0F);
            }
            if (target.isOnFire()) {
                amount *= AccessoryHelper.value(player, Accessory.LIU_TALISMAN, 1.15F, 1.25F, 1.0F);
            }
            if (target.hasEffect(ModEffects.EXPOSED)) {
                amount *= AccessoryHelper.value(player, Accessory.SEVEN_MONOCLE, 1.1F, 1.2F, 1.0F);
            }
            float heal = AccessoryHelper.value(player, Accessory.KUROKUMO_KNOT, 1.0F, 2.0F, 0.0F);
            CombatData attackerData = player.getData(ModAttachments.COMBAT);
            if (heal > 0 && target.hasEffect(ModEffects.BLEED) && now - attackerData.lastLifesteal >= 20) {
                attackerData.lastLifesteal = now;
                player.heal(heal);
            }
        }

        // ---- 방어자 쪽 ----
        KeyPage targetPage = KeyPageHelper.getPage(target);
        if (targetPage != null && targetPage.passive() == com.fixercity.keypage.KeyPagePassive.BLAZE
                && source.is(DamageTypeTags.IS_FIRE)) {
            amount *= 0.5F;
        }
        MobEffectInstance exposed = target.getEffect(ModEffects.EXPOSED);
        if (exposed != null) {
            amount *= ExposedEffect.multiplier(exposed.getAmplifier());
        }

        CombatData data = dataFor(target);

        // 츠바이 수호 태세: 물리 피해 감소 + 근접 공격자 반격 (넉백, 흐트러짐 피해)
        if (kind != null && data.isGuarding(now)) {
            amount *= data.guardEmpowered ? 0.25F : 0.4F;
            staggerBonus *= 0.5F;
            if (attacker != null && source.getDirectEntity() == attacker && attacker.distanceToSqr(target) < 25) {
                addStagger(attacker, base * (data.guardEmpowered ? 2.0F : 1.0F));
                attacker.knockback(0.8, target.getX() - attacker.getX(), target.getZ() - attacker.getZ());
                level.playSound(null, target.getX(), target.getY(), target.getZ(),
                        SoundEvents.SHIELD_BLOCK, SoundSource.PLAYERS, 1.0F, 0.9F);
            }
        }
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
                sendFeedback(attacker, target, kind, hpResist, broke);
                if (target instanceof net.minecraft.server.level.ServerPlayer victim) {
                    syncStagger(victim, victim);
                }
                if (attacker instanceof net.minecraft.server.level.ServerPlayer viewer && attacker != target) {
                    syncStagger(viewer, target);
                }
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

    /** 개체의 전투 데이터 (장신구에 따른 회복 수치를 반영해서). */
    public static CombatData dataFor(LivingEntity entity) {
        CombatData data = entity.getData(ModAttachments.COMBAT);
        data.regenDelay = Math.round(AccessoryHelper.value(entity, Accessory.OFFICE_BADGE, 60, 40, CombatData.REGEN_DELAY));
        data.regenRate = AccessoryHelper.value(entity, Accessory.OFFICE_BADGE, 0.1F, 0.15F, 0.1F);
        return data;
    }

    /** 기술 등에서 체력 피해와 별개로 흐트러짐 피해를 직접 준다. */
    public static void addStagger(LivingEntity target, float amount) {
        if (!(target.level() instanceof ServerLevel level) || amount <= 0) {
            return;
        }
        float max = staggerMax(target);
        if (dataFor(target).damage(level.getGameTime(), max, amount)) {
            onStaggered(level, target);
        }
        if (target instanceof net.minecraft.server.level.ServerPlayer victim) {
            syncStagger(victim, victim);
        }
    }

    public static boolean isStaggered(LivingEntity target) {
        return target.getData(ModAttachments.COMBAT).isStaggered(target.level().getGameTime());
    }

    public static float staggerMax(LivingEntity entity) {
        if (entity instanceof Player) {
            KeyPage page = KeyPageHelper.getPage(entity);
            float bonus = AccessoryHelper.value(entity, Accessory.ZWEI_ARMBAND, 4.0F, 8.0F, 0.0F);
            return (page != null ? page.stagger() : KeyPages.BARE_STAGGER) + bonus;
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

    /** 흐트러짐 게이지를 viewer의 HUD로 보낸다 (자기 자신 또는 공격 대상). */
    public static void syncStagger(net.minecraft.server.level.ServerPlayer viewer, LivingEntity entity) {
        long now = entity.level().getGameTime();
        float max = staggerMax(entity);
        CombatData data = dataFor(entity);
        float current = data.current(now, max);
        boolean staggered = data.isStaggered(now);
        if (viewer == entity) {
            data.lastSentStagger = current;
            data.lastSentMax = max;
            data.lastSentStaggered = staggered;
        }
        net.neoforged.neoforge.network.PacketDistributor.sendToPlayer(viewer,
                new com.fixercity.network.StaggerSyncPayload(entity.getId(), current, max, staggered));
    }

    /** 플레이어 자신의 게이지가 바뀌었으면 (회복 등) HUD로 보낸다. FixerEvents에서 10틱마다 호출. */
    public static void syncOwnIfChanged(net.minecraft.server.level.ServerPlayer player) {
        long now = player.level().getGameTime();
        float max = staggerMax(player);
        CombatData data = dataFor(player);
        float current = data.current(now, max);
        boolean staggered = data.isStaggered(now);
        if (Math.abs(current - data.lastSentStagger) >= 0.5F || max != data.lastSentMax || staggered != data.lastSentStaggered) {
            syncStagger(player, player);
        }
    }

    /** 액션바: 공격한 플레이어에게 피해 유형과 상대 내성 (게이지는 HUD). */
    private static void sendFeedback(LivingEntity attacker, LivingEntity target, DamageKind kind, Resist resist, boolean broke) {
        if (attacker instanceof Player player && player != target) {
            MutableComponent msg = Component.empty()
                    .append(Component.translatable(kind.translationKey()).withStyle(kind.color()))
                    .append(Component.literal(" "))
                    .append(Component.translatable(resist.translationKey()).withStyle(resist.color()))
                    .append(Component.literal("  "));
            if (broke) {
                msg.append(Component.translatable("message.fixercity.staggered").withStyle(ChatFormatting.GOLD, ChatFormatting.BOLD));
            }
            player.displayClientMessage(msg, true);
        }
    }
}
