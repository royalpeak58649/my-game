package com.fixercity.item;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Tier;

/**
 * 해결사 철퇴. 기술: 내려찍기 - 주변 3.5칸의 적에게 피해, 넉백, 구속.
 * 떨어지는 중에 쓰면 낙하 거리만큼 피해가 늘어난다 (최대 2배).
 */
public class FixerMaceItem extends FixerWeaponItem implements HasDamageKind {
    @Override
    public com.fixercity.keypage.DamageKind damageKind() {
        return com.fixercity.keypage.DamageKind.BLUNT;
    }

    private static final double RADIUS = 3.5;

    public FixerMaceItem(Tier tier, Properties properties) {
        super(tier, properties, 160);
    }

    @Override
    protected boolean performAbility(ServerLevel level, Player player, ItemStack stack) {
        float fallBonus = 1.0F + Math.min(player.fallDistance, 10.0F) * 0.1F;
        float damage = (float) player.getAttributeValue(Attributes.ATTACK_DAMAGE) * 0.9F * fallBonus;
        if (player.fallDistance > 0) {
            player.resetFallDistance();
        }

        for (LivingEntity target : level.getEntitiesOfClass(LivingEntity.class,
                player.getBoundingBox().inflate(RADIUS, 1.5, RADIUS), t -> isValidTarget(player, t))) {
            if (target.distanceToSqr(player) > RADIUS * RADIUS) {
                continue;
            }
            target.hurt(player.damageSources().playerAttack(player), damage);
            pushAway(player, target, 1.0);
            target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 60, 1), player);
        }

        level.sendParticles(ParticleTypes.EXPLOSION, player.getX(), player.getY() + 0.2, player.getZ(), 6, RADIUS * 0.4, 0.1, RADIUS * 0.4, 0);
        level.sendParticles(ParticleTypes.CLOUD, player.getX(), player.getY() + 0.1, player.getZ(), 30, RADIUS * 0.5, 0.05, RADIUS * 0.5, 0.05);
        level.playSound(null, player.getX(), player.getY(), player.getZ(),
                SoundEvents.ANVIL_LAND, SoundSource.PLAYERS, 0.8F, 0.6F);
        return true;
    }
}
