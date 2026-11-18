package com.fixercity.combat;

import com.fixercity.keypage.DamageKind;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPageHelper;
import com.fixercity.keypage.KeyPagePassive;
import com.fixercity.registry.ModAttachments;
import java.util.EnumSet;
import java.util.Set;
import net.minecraft.ChatFormatting;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LightningBolt;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent;

/**
 * 접대 손님(L_Ender's Cataclysm 보스) 책장의 패시브.
 * 수치와 효과는 이 모드의 오리지널이고, 이름만 각 보스의 싸움 방식에서 따왔다.
 */
public final class BossPassives {
    private static final Set<KeyPagePassive> HANDLED = EnumSet.range(KeyPagePassive.AMETHYST_SHELL, KeyPagePassive.HERALD_LASER);

    private BossPassives() {}

    public static boolean handles(KeyPagePassive p) {
        return p != null && HANDLED.contains(p);
    }

    private static KeyPagePassive passive(LivingEntity e) {
        KeyPage page = KeyPageHelper.getPage(e);
        return page == null ? null : page.passive();
    }

    // ---------------------------------------------------------------- 공격

    /** 공격 쪽 배율. [0] 피해 배율, [1] 흐트러짐 배율, [2] 더하는 피해, [3] 더하는 흐트러짐. */
    public static float[] onAttack(ServerLevel level, Player player, LivingEntity target, DamageKind kind, KeyPagePassive p) {
        float[] r = {1.0F, 1.0F, 0.0F, 0.0F};
        CombatData d = player.getData(ModAttachments.COMBAT);
        long now = level.getGameTime();
        switch (p) {
            case TRACKING -> {
                // 같은 대상을 계속 때리면 피해 +5%씩 (최대 +25%), 대상을 바꾸면 처음부터
                if (target.getUUID().equals(d.guestTarget)) {
                    d.guestCounter = Math.min(5, d.guestCounter + 1);
                } else {
                    d.guestTarget = target.getUUID();
                    d.guestCounter = 0;
                }
                r[0] *= 1.0F + 0.05F * d.guestCounter;
            }
            case VIPER_GAZE -> target.addEffect(new MobEffectInstance(MobEffects.POISON, 60, 0), player);
            case VOID_FIST -> {
                if (kind == DamageKind.BLUNT) {
                    r[1] *= 1.4F;
                }
            }
            case LAVA_HEART -> {
                if (target.isOnFire()) {
                    r[0] *= 1.2F;
                }
            }
            case DESERT_KING -> {
                float mine = player.getHealth() / player.getMaxHealth();
                float theirs = target.getHealth() / Math.max(1.0F, target.getMaxHealth());
                if (mine > theirs) {
                    r[0] *= 1.2F;
                }
            }
            case VOID_RUNE -> {
                // 10초마다 한 번, 대상 주변 3칸의 다른 적에게 공허 폭발 (이번 피해의 절반)
                if (now >= d.guestReadyAt) {
                    d.guestReadyAt = now + 200;
                    float splash = (float) player.getAttributeValue(net.minecraft.world.entity.ai.attributes.Attributes.ATTACK_DAMAGE) * 0.5F;
                    for (LivingEntity other : level.getEntitiesOfClass(LivingEntity.class, target.getBoundingBox().inflate(3.0),
                            e -> e != target && e != player && e.isAlive() && e instanceof Enemy)) {
                        other.hurt(player.damageSources().indirectMagic(player, player), Math.max(2.0F, splash));
                    }
                    level.sendParticles(ParticleTypes.REVERSE_PORTAL, target.getX(), target.getY() + 1.0, target.getZ(), 40, 1.5, 0.5, 1.5, 0.05);
                    level.playSound(null, target.getX(), target.getY(), target.getZ(), SoundEvents.ENDERMAN_TELEPORT, SoundSource.PLAYERS, 1.0F, 0.5F);
                }
            }
            case GRUDGE -> {
                // 잃은 체력 10%마다 피해 +4% (최대 +36%)
                float lost = 1.0F - player.getHealth() / player.getMaxHealth();
                r[0] *= 1.0F + 0.04F * Math.min(9, (int) (lost * 10));
            }
            case ABYSSAL_HUNTER -> {
                if (player.isInWater() || target.isInWater()) {
                    r[0] *= 1.3F;
                }
            }
            case STORM_CHAIN -> {
                // 네 번째 공격마다 번개 사슬: 피해 +6, 흐트러짐 +6
                if (++d.guestCounter >= 4) {
                    d.guestCounter = 0;
                    r[2] += 6.0F;
                    r[3] += 6.0F;
                    LightningBolt bolt = EntityType.LIGHTNING_BOLT.create(level);
                    if (bolt != null) {
                        bolt.moveTo(Vec3.atBottomCenterOf(target.blockPosition()));
                        bolt.setVisualOnly(true);
                        level.addFreshEntity(bolt);
                    }
                }
            }
            case HELLFIRE -> {
                if (target.isOnFire()) {
                    r[3] += 4.0F;
                }
                target.igniteForSeconds(4.0F);
                if (player.getHealth() <= player.getMaxHealth() / 3.0F) {
                    r[0] *= 1.25F;
                    level.sendParticles(ParticleTypes.SOUL_FIRE_FLAME, target.getX(), target.getY() + 1.0, target.getZ(), 10, 0.3, 0.4, 0.3, 0.02);
                }
            }
            case HERALD_LASER -> {
                // 때릴 때마다 충전 (최대 10). 가득 차면 다음 공격이 레이저: 피해 2배 + 바라보는 방향 8칸 안의 적에게도 피해
                if (d.guestCounter >= 10) {
                    d.guestCounter = 0;
                    r[0] *= 2.0F;
                    fireLaser(level, player, target);
                } else {
                    d.guestCounter++;
                    player.displayClientMessage(Component.translatable("message.fixercity.laser_charge", d.guestCounter)
                            .withStyle(ChatFormatting.RED), true);
                }
            }
            default -> {
            }
        }
        return r;
    }

    private static void fireLaser(ServerLevel level, Player player, LivingEntity target) {
        Vec3 from = player.getEyePosition();
        Vec3 dir = player.getLookAngle();
        Vec3 to = from.add(dir.scale(8.0));
        float dmg = (float) player.getAttributeValue(net.minecraft.world.entity.ai.attributes.Attributes.ATTACK_DAMAGE);
        for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, new AABB(from, to).inflate(1.0),
                e -> e != player && e != target && e.isAlive() && e instanceof Enemy)) {
            if (e.getBoundingBox().inflate(0.6).clip(from, to).isPresent()) {
                e.hurt(player.damageSources().indirectMagic(player, player), Math.max(3.0F, dmg));
            }
        }
        for (int i = 0; i <= 16; i++) {
            Vec3 p = from.add(dir.scale(i * 0.5));
            level.sendParticles(net.minecraft.core.particles.DustParticleOptions.REDSTONE, p.x, p.y, p.z, 2, 0.05, 0.05, 0.05, 0);
        }
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.BEACON_DEACTIVATE, SoundSource.PLAYERS, 1.0F, 1.8F);
    }

    // ---------------------------------------------------------------- 방어

    /** 맞는 쪽 배율 (내성 전에 곱한다). 손님 자신(접대 중인 보스)에게도 적용된다. */
    public static float defendMultiplier(LivingEntity target, DamageSource source, DamageKind kind) {
        KeyPagePassive p = passive(target);
        if (p == null || !handles(p)) {
            return 1.0F;
        }
        switch (p) {
            case AMETHYST_SHELL -> {
                if (kind != null && target.getHealth() >= target.getMaxHealth() * 0.5F) {
                    return 0.85F;
                }
            }
            case CORAL_ARMOR -> {
                if (target.isInWaterOrRain()) {
                    return 0.9F;
                }
            }
            case LAVA_HEART, HELLFIRE -> {
                if (source.is(DamageTypeTags.IS_FIRE)) {
                    return 0.0F;
                }
            }
            default -> {
            }
        }
        return 1.0F;
    }

    // ---------------------------------------------------------------- 매 틱 (플레이어)

    public static void tick(Player player, KeyPagePassive p) {
        switch (p) {
            case CORAL_ARMOR -> {
                if (player.isInWaterOrRain() && !player.hasEffect(MobEffects.REGENERATION)) {
                    player.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 60, 0, true, false, true));
                }
            }
            case LAVA_HEART, HELLFIRE -> player.addEffect(new MobEffectInstance(MobEffects.FIRE_RESISTANCE, 50, 0, true, false, true));
            case ABYSSAL_HUNTER -> {
                player.addEffect(new MobEffectInstance(MobEffects.WATER_BREATHING, 50, 0, true, false, true));
                if (player.isInWater()) {
                    player.addEffect(new MobEffectInstance(MobEffects.DOLPHINS_GRACE, 50, 0, true, false, true));
                    player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 50, 1, true, false, true));
                }
            }
            default -> {
            }
        }
    }

    // ---------------------------------------------------------------- 죽음

    @SubscribeEvent
    public static void onDeath(LivingDeathEvent event) {
        LivingEntity dead = event.getEntity();
        if (!(dead.level() instanceof ServerLevel level)) {
            return;
        }
        // 압트강그르: 죽을 피해를 한 번 버틴다 (5분에 한 번)
        if (dead instanceof Player player && passive(player) == KeyPagePassive.UNDYING) {
            CombatData d = player.getData(ModAttachments.COMBAT);
            long now = level.getGameTime();
            if (now >= d.guestReadyAt) {
                d.guestReadyAt = now + 20 * 60 * 5;
                event.setCanceled(true);
                player.setHealth(Math.min(player.getMaxHealth(), 8.0F));
                player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 60, 2));
                level.sendParticles(ParticleTypes.SCULK_SOUL, player.getX(), player.getY() + 1.0, player.getZ(), 30, 0.4, 0.6, 0.4, 0.05);
                level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.TOTEM_USE, SoundSource.PLAYERS, 0.8F, 0.6F);
                player.displayClientMessage(Component.translatable("message.fixercity.undying").withStyle(ChatFormatting.DARK_AQUA, ChatFormatting.BOLD), true);
                return;
            }
        }
        // 코볼디에이터: 처치하면 5초 힘 I과 신속 I
        if (event.getSource().getEntity() instanceof Player killer && passive(killer) == KeyPagePassive.ARENA_ROAR) {
            killer.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 100, 0));
            killer.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SPEED, 100, 0));
            level.playSound(null, killer.getX(), killer.getY(), killer.getZ(), SoundEvents.RAVAGER_ROAR, SoundSource.PLAYERS, 0.6F, 1.4F);
        }
    }
}
